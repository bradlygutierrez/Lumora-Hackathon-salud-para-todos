from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models.appointments import Cita
from lumora_api.models.catalogs import EstadoCita, EstadoDosis, EstadoReceta
from lumora_api.models.health_indicators import (
    AlertaClinica,
    IndicadorMedico,
    MedicionIndicador,
)
from lumora_api.models.identity import ProfesionalSalud
from lumora_api.models.prescriptions import DetalleReceta, Medicamento, Receta
from lumora_api.models.schedules import DosisAdministrada, HorarioMedicamento
from lumora_api.schemas.health_alerts import HealthAlertResponse

# A09: ventana de tiempo para "dosis vencidas sin registrar" hacia atras y
# "citas proximas" hacia adelante. Nada de esto se guarda -- se recalcula
# cada vez que se pide la lista (mismo criterio que el campo "tipo" de
# notificaciones: derivado, nunca persistido aparte).
_VENTANA_HORAS = 48


class HealthAlertsService:
    @staticmethod
    async def get_health_alerts(
        db: AsyncSession, paciente_id: int
    ) -> List[HealthAlertResponse]:
        alertas_clinicas = await HealthAlertsService._alertas_clinicas(db, paciente_id)
        dosis_omitidas = await HealthAlertsService._dosis_omitidas(db, paciente_id)
        citas_proximas = await HealthAlertsService._citas_proximas(db, paciente_id)

        # Orden fijo por prioridad (igual que el Figma): alta severidad,
        # luego preventivas, luego recordatorios de citas.
        return [*alertas_clinicas, *dosis_omitidas, *citas_proximas]

    # --- ALERTAS CLINICAS REALES ---
    @staticmethod
    async def _alertas_clinicas(
        db: AsyncSession, paciente_id: int
    ) -> List[HealthAlertResponse]:
        query = (
            select(AlertaClinica, IndicadorMedico)
            .join(MedicionIndicador, AlertaClinica.medicion_id == MedicionIndicador.id)
            .join(IndicadorMedico, MedicionIndicador.indicador_id == IndicadorMedico.id)
            .where(
                AlertaClinica.paciente_id == paciente_id,
                AlertaClinica.atendida.is_(False),
            )
            .order_by(AlertaClinica.fecha_alerta.desc())
        )
        rows = (await db.execute(query)).all()
        return [
            HealthAlertResponse(
                id=f"alerta:{alerta.id}",
                tipo="alerta_clinica",
                categoria="alta_severidad",
                titulo=f"{indicador.nombre} Fuera de Rango",
                mensaje=alerta.mensaje,
                fecha=alerta.fecha_alerta,
                atendida=alerta.atendida,
                alerta_id=alerta.id,
                medicion_id=alerta.medicion_id,
                indicador_id=indicador.id,
            )
            for alerta, indicador in rows
        ]

    # --- DOSIS VENCIDAS SIN REGISTRAR ---
    @staticmethod
    async def _dosis_omitidas(
        db: AsyncSession, paciente_id: int
    ) -> List[HealthAlertResponse]:
        now = datetime.utcnow()
        ventana_inicio = now - timedelta(hours=_VENTANA_HORAS)

        # Solo horarios de recetas activas -- una receta suspendida o
        # vencida no debe seguir generando avisos de dosis omitida.
        horarios_query = (
            select(HorarioMedicamento, DetalleReceta, Medicamento)
            .join(DetalleReceta, HorarioMedicamento.detalle_receta_id == DetalleReceta.id)
            .join(Receta, DetalleReceta.receta_id == Receta.id)
            .join(Medicamento, DetalleReceta.medicamento_id == Medicamento.id)
            .join(EstadoReceta, Receta.estado_id == EstadoReceta.id)
            .where(
                Receta.paciente_id == paciente_id,
                HorarioMedicamento.activo.is_(True),
                EstadoReceta.nombre == "Activa",
            )
        )
        horarios = (await db.execute(horarios_query)).all()
        if not horarios:
            return []

        horario_ids = [horario.id for horario, _, _ in horarios]
        # Solo una dosis marcada "Tomada" cuenta como "ya registrada" y
        # apaga la alerta de esa ocurrencia. Un registro en estado
        # "Pendiente" (ej. el usuario presiono "Registrar dosis" y luego
        # "Cancelar") sigue siendo una dosis sin tomar -- si contara igual,
        # la alerta desaparecia para siempre aunque el paciente nunca
        # haya tomado el medicamento.
        dosis_query = (
            select(DosisAdministrada)
            .join(EstadoDosis, DosisAdministrada.estado_dosis_id == EstadoDosis.id)
            .where(
                DosisAdministrada.horario_id.in_(horario_ids),
                DosisAdministrada.fecha_programada >= ventana_inicio - timedelta(days=1),
                DosisAdministrada.fecha_programada <= now + timedelta(days=2),
                EstadoDosis.nombre == "Tomada",
            )
        )
        registradas = (await db.execute(dosis_query)).scalars().all()

        registradas_por_dia = {
            (dosis.horario_id, dosis.fecha_programada.date()) for dosis in registradas
        }
        # La fecha puede desplazarse al cruzar medianoche por la zona horaria
        # del dispositivo; la hora del horario sigue siendo la identidad de
        # la ocurrencia dentro de esta ventana acotada.
        registradas_por_hora = {
            (dosis.horario_id, dosis.fecha_programada.time().replace(microsecond=0))
            for dosis in registradas
        }

        # horario.hora es solo una hora de reloj (sin fecha propia), asi
        # que la ocurrencia mas reciente es la de hoy si esa hora ya paso
        # hoy; si todavia no llega, la ocurrencia mas reciente es la de
        # ayer. Solo miramos esa unica ocurrencia mas reciente por
        # horario -- no acumulamos una tarjeta por cada dia sin registrar.
        hoy = now.date()
        ayer = hoy - timedelta(days=1)
        alertas: List[HealthAlertResponse] = []
        for horario, detalle, medicamento in horarios:
            ocurrencia_hoy = datetime.combine(hoy, horario.hora)
            if ocurrencia_hoy <= now:
                dia, ocurrencia = hoy, ocurrencia_hoy
            else:
                dia, ocurrencia = ayer, datetime.combine(ayer, horario.hora)

            if ocurrencia < ventana_inicio:
                continue

            # `horario.hora` no lleva zona horaria y el registro de dosis
            # (POST .../horarios/{id}/dosis) arma `fecha_programada` con la
            # hora LOCAL del dispositivo convertida a UTC -- eso puede
            # correr la fecha un dia para adelante o atras respecto al
            # "hoy"/"ayer" en UTC que se calculo arriba (ej. 9pm en
            # Nicaragua, UTC-6, ya es la madrugada del dia siguiente en
            # UTC). Por eso el match contra `registradas_por_dia` se hace
            # contra el dia calculado Y sus vecinos, no solo el exacto.
            dias_vecinos = (dia - timedelta(days=1), dia, dia + timedelta(days=1))
            hora_normalizada = horario.hora.replace(microsecond=0)
            if any((horario.id, d) in registradas_por_dia for d in dias_vecinos) or (
                horario.id, hora_normalizada
            ) in registradas_por_hora:
                continue

            alertas.append(
                HealthAlertResponse(
                    id=f"dosis:{horario.id}:{dia.isoformat()}",
                    tipo="dosis_omitida",
                    categoria="preventiva",
                    titulo="Dosis Omitida",
                    mensaje=(
                        f'No has registrado la toma de "{medicamento.nombre} '
                        f'{detalle.dosis}" programada para las '
                        f"{horario.hora.strftime('%H:%M')}."
                    ),
                    fecha=ocurrencia,
                    atendida=False,
                    horario_id=horario.id,
                )
            )
        alertas.sort(key=lambda a: a.fecha, reverse=True)
        return alertas

    # --- CITAS PROXIMAS ---
    @staticmethod
    async def _citas_proximas(
        db: AsyncSession, paciente_id: int
    ) -> List[HealthAlertResponse]:
        now = datetime.now(timezone.utc)
        ventana_fin = now + timedelta(hours=_VENTANA_HORAS)

        query = (
            select(Cita)
            .options(
                selectinload(Cita.professional).selectinload(ProfesionalSalud.persona)
            )
            .join(EstadoCita, Cita.estado_cita_id == EstadoCita.id, isouter=True)
            .where(
                Cita.paciente_id == paciente_id,
                Cita.inicio >= now,
                Cita.inicio <= ventana_fin,
                or_(
                    EstadoCita.nombre.is_(None),
                    EstadoCita.nombre.notin_(["Cancelada", "Completada"]),
                ),
            )
            .order_by(Cita.inicio)
        )
        citas = (await db.execute(query)).scalars().all()

        alertas: List[HealthAlertResponse] = []
        for cita in citas:
            profesional = cita.professional
            quien = (
                profesional.specialty
                if profesional is not None and profesional.specialty
                else (profesional.full_name if profesional is not None else None)
            )
            alertas.append(
                HealthAlertResponse(
                    id=f"cita:{cita.id}",
                    tipo="cita_proxima",
                    categoria="recordatorio",
                    titulo="Cita Próxima",
                    mensaje=(
                        f"Recuerda tu cita con {quien or 'tu profesional de salud'} "
                        f"el {cita.inicio.strftime('%d/%m %H:%M')}."
                    ),
                    fecha=cita.inicio,
                    atendida=False,
                    cita_id=cita.id,
                )
            )
        return alertas
