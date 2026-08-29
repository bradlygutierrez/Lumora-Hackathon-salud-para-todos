from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.repositories.reminders import ReminderRepository
from lumora_api.models.appointments import Cita
from lumora_api.models.catalogs import EstadoCita, EstadoDosis, EstadoReceta, TipoRecordatorio
from lumora_api.models.identity import ProfesionalSalud
from lumora_api.models.prescriptions import DetalleReceta, Medicamento, Receta
from lumora_api.models.reminders import Recordatorio, Notificacion, PreferenciaNotificacion, RelacionPaciente
from lumora_api.models.schedules import DosisAdministrada, HorarioMedicamento
from lumora_api.schemas.reminders import (
    RecordatorioCreate,
    RecordatorioUpdate,
    NotificacionResponse,
    PreferenciaNotificacionUpdate,
    RelacionPacienteCreate,
)

# A09: misma ventana de 48h que HealthAlertsService usa para "dosis
# vencidas sin registrar" y "citas proximas" -- ver
# Backend/.../services/health_alerts_service.py. Aqui se usa para decidir
# CUANDO crear una Notificacion real y persistida a partir de esos mismos
# eventos (Alertas de Salud solo los calcula al vuelo, nunca los guarda).
_VENTANA_HORAS = 48
_TIPO_RECORDATORIO_MEDICACION = "Medicación"
_TIPO_RECORDATORIO_CITA = "Cita"


def _tipo_notificacion(notificacion: Notificacion) -> str:
    """A09: deriva el tipo (alerta/recordatorio/cita/sistema) mirando cuál
    de los 3 campos de origen tiene el Recordatorio asociado. Nunca se
    calcula en el frontend -- ver checklist "No inventar diagnóstico/
    recomendaciones en frontend"."""
    recordatorio = notificacion.recordatorio
    if recordatorio is None:
        return "sistema"
    if recordatorio.alerta_id is not None:
        return "alerta"
    if recordatorio.cita_id is not None:
        return "cita"
    if recordatorio.horario_medicamento_id is not None:
        return "recordatorio"
    return "sistema"


def _to_notificacion_response(notificacion: Notificacion) -> NotificacionResponse:
    return NotificacionResponse(
        id=notificacion.id,
        usuario_id=notificacion.usuario_id,
        recordatorio_id=notificacion.recordatorio_id,
        titulo=notificacion.titulo,
        mensaje=notificacion.mensaje,
        canal=notificacion.canal,
        tipo=_tipo_notificacion(notificacion),
        enviado=notificacion.enviado,
        fecha_envio=notificacion.fecha_envio,
        leido=notificacion.leido,
        fecha_lectura=notificacion.fecha_lectura,
        creado_en=notificacion.creado_en,
    )


class ReminderService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ReminderRepository(session)

    # Recordatorios
    async def crear_recordatorio(self, data: RecordatorioCreate) -> Recordatorio:
        obj = Recordatorio(**data.model_dump())
        return await self.repo.create_recordatorio(obj)

    async def obtener_recordatorios_paciente(self, paciente_id: int) -> Sequence[Recordatorio]:
        return await self.repo.get_recordatorios_by_paciente(paciente_id)

    async def obtener_recordatorio_por_id(self, id: int) -> Recordatorio:
        rec = await self.repo.get_recordatorio_by_id(id)
        if not rec:
            raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
        return rec

    async def actualizar_recordatorio(self, id: int, data: RecordatorioUpdate) -> Recordatorio:
        rec = await self.obtener_recordatorio_por_id(id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(rec, key, value)
        return await self.repo.update_recordatorio(rec)

    async def eliminar_recordatorio(self, id: int) -> None:
        rec = await self.obtener_recordatorio_por_id(id)
        await self.repo.delete_recordatorio(rec)

    # Notificaciones
    async def obtener_notificaciones_usuario(self, usuario_id: int) -> List[NotificacionResponse]:
        notificaciones = await self.repo.get_notificaciones_by_usuario(usuario_id)
        return [_to_notificacion_response(n) for n in notificaciones]

    async def obtener_notificaciones_paciente(self, paciente_id: int) -> List[NotificacionResponse]:
        # A09: resuelve paciente -> persona -> usuario (comparten
        # persona_id, igual que en PatientAccessService) para que un
        # cuidador pueda consultar por el paciente activo, no por su
        # propio usuario_id.
        usuario_id = await PatientAccessRepository(self.session).user_id_for_patient(paciente_id)
        if usuario_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El paciente no tiene una cuenta de usuario asociada",
            )
        # A09: antes de listar, se ponen al dia las notificaciones que se
        # generan de eventos que "se vuelven ciertos" con el paso del
        # tiempo (una dosis que ya se vencio sin registrar, una cita que
        # ya esta cerca) -- a diferencia de una AlertaClinica, que crea su
        # Notificacion de una vez en HealthIndicatorsService.registrar_medicion
        # porque ahi si hay un evento discreto (se registro la medicion).
        # No hay un scheduler en el proyecto, asi que esto se resuelve de
        # forma perezosa: cada GET reconcilia lo que haga falta antes de
        # responder.
        await self._generar_notificaciones_pendientes(paciente_id, usuario_id)
        return await self.obtener_notificaciones_usuario(usuario_id)

    async def _generar_notificaciones_pendientes(self, paciente_id: int, usuario_id: int) -> None:
        creo_algo = False
        creo_algo |= await self._generar_notificaciones_dosis_omitida(paciente_id, usuario_id)
        creo_algo |= await self._generar_notificaciones_cita_proxima(paciente_id, usuario_id)
        if creo_algo:
            await self.session.commit()

    async def _generar_notificaciones_dosis_omitida(self, paciente_id: int, usuario_id: int) -> bool:
        """Crea una Notificacion (con su Recordatorio de origen) por cada
        dosis vencida sin registrar -- mismo criterio de "ocurrencia mas
        reciente por horario" y misma tolerancia de +-1 dia por zona
        horaria que HealthAlertsService._dosis_omitidas, para que
        Alertas de Salud y Notificaciones nunca se contradigan sobre
        cuales dosis estan pendientes."""
        now = datetime.utcnow()
        ventana_inicio = now - timedelta(hours=_VENTANA_HORAS)

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
        horarios = (await self.session.execute(horarios_query)).all()
        if not horarios:
            return False

        horario_ids = [horario.id for horario, _, _ in horarios]

        dosis_query = (
            select(DosisAdministrada)
            .join(EstadoDosis, DosisAdministrada.estado_dosis_id == EstadoDosis.id)
            .where(
                DosisAdministrada.horario_id.in_(horario_ids),
                DosisAdministrada.fecha_programada >= ventana_inicio,
                EstadoDosis.nombre == "Tomada",
            )
        )
        registradas = (await self.session.execute(dosis_query)).scalars().all()
        registradas_por_dia = {
            (dosis.horario_id, dosis.fecha_programada.date()) for dosis in registradas
        }

        # Recordatorios de dosis-omitida que ya se crearon en una llamada
        # anterior, para no duplicar la Notificacion en cada GET.
        existentes_query = select(Recordatorio).where(
            Recordatorio.horario_medicamento_id.in_(horario_ids),
            Recordatorio.fecha_programada >= ventana_inicio,
        )
        existentes = (await self.session.execute(existentes_query)).scalars().all()
        existentes_por_dia = {
            (r.horario_medicamento_id, r.fecha_programada.date()) for r in existentes
        }

        tipo_recordatorio_id = await self._resolver_tipo_recordatorio(_TIPO_RECORDATORIO_MEDICACION)
        if tipo_recordatorio_id is None:
            return False

        hoy = now.date()
        ayer = hoy - timedelta(days=1)
        creo_algo = False
        for horario, detalle, medicamento in horarios:
            ocurrencia_hoy = datetime.combine(hoy, horario.hora)
            if ocurrencia_hoy <= now:
                dia, ocurrencia = hoy, ocurrencia_hoy
            else:
                dia, ocurrencia = ayer, datetime.combine(ayer, horario.hora)

            if ocurrencia < ventana_inicio:
                continue

            dias_vecinos = (dia - timedelta(days=1), dia, dia + timedelta(days=1))
            if any((horario.id, d) in registradas_por_dia for d in dias_vecinos):
                continue
            if any((horario.id, d) in existentes_por_dia for d in dias_vecinos):
                continue

            titulo = "Dosis Omitida"
            mensaje = (
                f'No has registrado la toma de "{medicamento.nombre} {detalle.dosis}" '
                f"programada para las {horario.hora.strftime('%H:%M')}."
            )
            recordatorio = Recordatorio(
                paciente_id=paciente_id,
                tipo_recordatorio_id=tipo_recordatorio_id,
                horario_medicamento_id=horario.id,
                titulo=titulo,
                mensaje=mensaje,
                fecha_programada=ocurrencia,
                activo=True,
            )
            self.session.add(recordatorio)
            await self.session.flush()

            self.session.add(
                Notificacion(
                    usuario_id=usuario_id,
                    recordatorio_id=recordatorio.id,
                    titulo=titulo,
                    mensaje=mensaje,
                    canal="APP",
                )
            )
            # Para que dos horarios distintos en la misma corrida no se
            # dupliquen entre si si comparten (horario.id, dia) -- no
            # deberia pasar, pero cuesta poco ser explicito.
            existentes_por_dia.add((horario.id, dia))
            creo_algo = True

        return creo_algo

    async def _generar_notificaciones_cita_proxima(self, paciente_id: int, usuario_id: int) -> bool:
        """Crea una Notificacion (con su Recordatorio de origen) por cada
        cita proxima dentro de la ventana -- mismo criterio que
        HealthAlertsService._citas_proximas, deduplicado por cita_id."""
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
        )
        citas = (await self.session.execute(query)).scalars().all()
        if not citas:
            return False

        cita_ids = [cita.id for cita in citas]
        existentes_query = select(Recordatorio).where(Recordatorio.cita_id.in_(cita_ids))
        existentes = (await self.session.execute(existentes_query)).scalars().all()
        cita_ids_con_recordatorio = {r.cita_id for r in existentes}

        tipo_recordatorio_id = await self._resolver_tipo_recordatorio(_TIPO_RECORDATORIO_CITA)
        if tipo_recordatorio_id is None:
            return False

        creo_algo = False
        for cita in citas:
            if cita.id in cita_ids_con_recordatorio:
                continue

            profesional = cita.professional
            quien = (
                profesional.specialty
                if profesional is not None and profesional.specialty
                else (profesional.full_name if profesional is not None else None)
            )
            titulo = "Cita Próxima"
            mensaje = (
                f"Recuerda tu cita con {quien or 'tu profesional de salud'} "
                f"el {cita.inicio.strftime('%d/%m %H:%M')}."
            )

            recordatorio = Recordatorio(
                paciente_id=paciente_id,
                tipo_recordatorio_id=tipo_recordatorio_id,
                cita_id=cita.id,
                titulo=titulo,
                mensaje=mensaje,
                # Recordatorio.fecha_programada es DateTime naive (sin
                # zona horaria), pero Cita.inicio es tz-aware -- se
                # normaliza a UTC naive para que Postgres/asyncpg no
                # rechace el insert por mezclar aware/naive.
                fecha_programada=cita.inicio.astimezone(timezone.utc).replace(tzinfo=None),
                activo=True,
            )
            self.session.add(recordatorio)
            await self.session.flush()

            self.session.add(
                Notificacion(
                    usuario_id=usuario_id,
                    recordatorio_id=recordatorio.id,
                    titulo=titulo,
                    mensaje=mensaje,
                    canal="APP",
                )
            )
            creo_algo = True

        return creo_algo

    async def _resolver_tipo_recordatorio(self, nombre: str) -> Optional[int]:
        return await self.session.scalar(
            select(TipoRecordatorio.id).where(TipoRecordatorio.nombre == nombre)
        )

    async def obtener_notificacion_por_id(self, id: int) -> Notificacion:
        notif = await self.repo.get_notificacion_by_id(id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        return notif

    async def marcar_notificacion_leida(self, id: int) -> NotificacionResponse:
        notif = await self.obtener_notificacion_por_id(id)
        notif.leido = True
        notif.fecha_lectura = datetime.now()
        actualizada = await self.repo.update_notificacion(notif)
        return _to_notificacion_response(actualizada)

    # Preferencias
    async def obtener_preferencias(self, usuario_id: int) -> PreferenciaNotificacion:
        pref = await self.repo.get_preferencias(usuario_id)
        if not pref:
            raise HTTPException(status_code=404, detail="Preferencias no encontradas")
        return pref

    async def actualizar_preferencias(self, usuario_id: int, data: PreferenciaNotificacionUpdate) -> PreferenciaNotificacion:
        pref = await self.repo.get_preferencias(usuario_id)
        if not pref:
            pref = PreferenciaNotificacion(usuario_id=usuario_id, **data.model_dump())
        else:
            for key, value in data.model_dump().items():
                setattr(pref, key, value)
        return await self.repo.upsert_preferencias(pref)

    # Relaciones
    async def crear_relacion_paciente(self, data: RelacionPacienteCreate) -> RelacionPaciente:
        obj = RelacionPaciente(**data.model_dump())
        return await self.repo.create_relacion(obj)

    async def obtener_relaciones_paciente(self, paciente_id: int) -> Sequence[RelacionPaciente]:
        return await self.repo.get_relaciones_by_paciente(paciente_id)
