from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from lumora_api.models.catalogs import TipoAlerta, TipoRecordatorio, UnidadMedida
from lumora_api.models.health_indicators import (
    AlertaClinica,
    IndicadorMedico,
    MedicionIndicador,
    RangoIndicador,
)
from lumora_api.models.reminders import Notificacion, Recordatorio
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.schemas.health_indicators import (
    AlertaClinicaUpdate,
    IndicadorMedicoCreate,
    IndicadorMedicoUpdate,
    MedicionIndicadorCreate,
    RangoIndicadorCreate,
    RangoIndicadorUpdate,
)

# A09: nombres sembrados en seed.py::CATALOGS -- se resuelven por nombre
# (no por id fijo) porque el id=1 legado de TipoAlerta ("Interacción") es
# de alertas de medicación, no aplica a mediciones fuera de rango.
_TIPO_ALERTA_MEDICION = "Medición Fuera de Rango"
_TIPO_RECORDATORIO_MEDICION = "Medición"


class HealthIndicatorsService:

    # --- INDICADORES MÉDICOS ---
    @staticmethod
    async def create_indicador(db: AsyncSession, data: IndicadorMedicoCreate) -> IndicadorMedico:
        indicador = IndicadorMedico(**data.model_dump())
        db.add(indicador)
        await db.commit()
        await db.refresh(indicador)
        return indicador

    @staticmethod
    async def get_indicadores(db: AsyncSession, active_only: bool = True) -> List[IndicadorMedico]:
        query = select(IndicadorMedico)
        if active_only:
            query = query.where(IndicadorMedico.activo.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    # --- RANGOS ---
    @staticmethod
    async def create_rango(
        db: AsyncSession, indicador_id: UUID, data: RangoIndicadorCreate
    ) -> RangoIndicador:
        # Validar consistencia del rango
        if data.valor_minimo is not None and data.valor_maximo is not None:
            if data.valor_minimo >= data.valor_maximo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El valor mínimo debe ser menor al valor máximo."
                )

        # Validar que los rangos no se solapen
        query = select(RangoIndicador).where(
            RangoIndicador.indicador_id == indicador_id,
            RangoIndicador.activo.is_(True)
        )
        result = await db.execute(query)
        rangos_existentes = result.scalars().all()

        for r in rangos_existentes:
            if (
                data.valor_minimo is not None and data.valor_maximo is not None and
                r.valor_minimo is not None and r.valor_maximo is not None
            ):
                if max(data.valor_minimo, r.valor_minimo) < min(data.valor_maximo, r.valor_maximo):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El rango ingresado se traslapa con un rango existente."
                    )

        rango = RangoIndicador(indicador_id=indicador_id, **data.model_dump())
        db.add(rango)
        await db.commit()
        await db.refresh(rango)
        return rango

    @staticmethod
    async def get_rangos_indicador(
        db: AsyncSession, indicador_id: UUID, active_only: bool = True
    ) -> List[RangoIndicador]:
        query = select(RangoIndicador).where(RangoIndicador.indicador_id == indicador_id)
        if active_only:
            query = query.where(RangoIndicador.activo.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    # --- MEDICIONES Y EVALUACIÓN DE ALERTAS ---
    @staticmethod
    async def registrar_medicion(
        db: AsyncSession, paciente_id: int, data: MedicionIndicadorCreate
    ) -> MedicionIndicador:
        medicion = MedicionIndicador(paciente_id=paciente_id, **data.model_dump())
        db.add(medicion)
        await db.flush()

        query = select(RangoIndicador).where(
            RangoIndicador.indicador_id == data.indicador_id,
            RangoIndicador.activo.is_(True),
        )
        result = await db.execute(query)
        rangos = result.scalars().all()

        rangos_fuera = []
        for rango in rangos:
            fuera_de_rango = False
            if rango.valor_minimo is not None and data.valor < rango.valor_minimo:
                fuera_de_rango = True
            if rango.valor_maximo is not None and data.valor > rango.valor_maximo:
                fuera_de_rango = True
            if fuera_de_rango:
                rangos_fuera.append(rango)

        if rangos_fuera:
            # A09: se resuelven una sola vez por medición (no por rango)
            # el indicador/unidad (para el mensaje) y el usuario dueño del
            # paciente (para poder crear su Notificacion).
            indicador = await db.get(IndicadorMedico, data.indicador_id)
            unidad = await db.get(UnidadMedida, data.unidad_medida_id)
            tipo_alerta_id = await HealthIndicatorsService._resolver_tipo_alerta_medicion(db)
            usuario_id = await HealthIndicatorsService._usuario_id_para_paciente(db, paciente_id)
            tipo_recordatorio_id = (
                await HealthIndicatorsService._resolver_tipo_recordatorio_medicion(db)
                if usuario_id is not None
                else None
            )

            for rango in rangos_fuera:
                mensaje = HealthIndicatorsService._mensaje_alerta(indicador, unidad, data.valor, rango)

                alerta = AlertaClinica(
                    paciente_id=paciente_id,
                    medicion_id=medicion.id,
                    nivel_severidad_id=rango.nivel_severidad_id,
                    tipo_alerta_id=tipo_alerta_id,
                    origen_registro_id=data.origen_registro_id,
                    mensaje=mensaje,
                )
                db.add(alerta)
                await db.flush()

                # A09: conecta la alerta clínica con la bandeja general de
                # Notificaciones -- antes quedaba aislada en
                # alertas_clinicas y el usuario nunca se enteraba.
                if usuario_id is not None and tipo_recordatorio_id is not None:
                    titulo = (
                        f"Alerta: {indicador.nombre} fuera de rango"
                        if indicador is not None
                        else "Alerta clínica"
                    )
                    recordatorio = Recordatorio(
                        paciente_id=paciente_id,
                        tipo_recordatorio_id=tipo_recordatorio_id,
                        alerta_id=alerta.id,
                        titulo=titulo,
                        mensaje=mensaje,
                        fecha_programada=alerta.fecha_alerta or datetime.utcnow(),
                        activo=True,
                    )
                    db.add(recordatorio)
                    await db.flush()

                    notificacion = Notificacion(
                        usuario_id=usuario_id,
                        recordatorio_id=recordatorio.id,
                        titulo=titulo,
                        mensaje=mensaje,
                        canal="APP",
                    )
                    db.add(notificacion)

        await db.commit()
        await db.refresh(medicion)
        return medicion

    @staticmethod
    def _mensaje_alerta(
        indicador: Optional[IndicadorMedico],
        unidad: Optional[UnidadMedida],
        valor: float,
        rango: RangoIndicador,
    ) -> str:
        """Arma el mensaje que se guarda en AlertaClinica.mensaje (y se
        reutiliza tal cual en la Notificacion) usando solo datos reales
        que el backend ya tiene -- nunca un consejo médico inventado."""
        if indicador is None or unidad is None:
            # No debería pasar en operación normal -- red de seguridad si
            # el indicador/unidad no se pudo resolver.
            return f"Medición fuera de rango ({rango.etiqueta}): {valor}"

        if rango.valor_minimo is not None and rango.valor_maximo is not None:
            rango_texto = f" ({rango.valor_minimo}-{rango.valor_maximo} {unidad.nombre})"
        elif rango.valor_minimo is not None:
            rango_texto = f" (mínimo {rango.valor_minimo} {unidad.nombre})"
        elif rango.valor_maximo is not None:
            rango_texto = f" (máximo {rango.valor_maximo} {unidad.nombre})"
        else:
            rango_texto = ""

        return (
            f"Tu última medición de {indicador.nombre} ({valor} {unidad.nombre}) "
            f"está fuera del rango normal{rango_texto}."
        )

    @staticmethod
    async def _resolver_tipo_alerta_medicion(db: AsyncSession) -> int:
        tipo = await db.scalar(select(TipoAlerta).where(TipoAlerta.nombre == _TIPO_ALERTA_MEDICION))
        if tipo is None:
            # Red de seguridad si el ambiente todavía no corrió el seed
            # actualizado -- lo crea la primera vez que hace falta.
            tipo = TipoAlerta(nombre=_TIPO_ALERTA_MEDICION)
            db.add(tipo)
            await db.flush()
        return tipo.id

    @staticmethod
    async def _resolver_tipo_recordatorio_medicion(db: AsyncSession) -> Optional[int]:
        tipo = await db.scalar(
            select(TipoRecordatorio).where(TipoRecordatorio.nombre == _TIPO_RECORDATORIO_MEDICION)
        )
        return tipo.id if tipo is not None else None

    @staticmethod
    async def _usuario_id_para_paciente(db: AsyncSession, paciente_id: int) -> Optional[int]:
        # Reutiliza la misma resolucion paciente->usuario (con los mismos
        # filtros de activo/deleted_at) que ya usa el endpoint de
        # notificaciones por paciente_id, en vez de duplicar la consulta.
        return await PatientAccessRepository(db).user_id_for_patient(paciente_id)

    @staticmethod
    async def get_mediciones_paciente(
        db: AsyncSession, paciente_id: int
    ) -> List[MedicionIndicador]:
        query = select(MedicionIndicador).where(MedicionIndicador.paciente_id == paciente_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    # --- ALERTAS CLÍNICAS ---
    @staticmethod
    async def get_todas_alertas(
        db: AsyncSession, solo_pendientes: bool = True
    ) -> List[AlertaClinica]:
        query = select(AlertaClinica)
        if solo_pendientes:
            query = query.where(AlertaClinica.atendida.is_(False))
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_alertas_paciente(
        db: AsyncSession, paciente_id: int, solo_pendientes: bool = True
    ) -> List[AlertaClinica]:
        query = select(AlertaClinica).where(AlertaClinica.paciente_id == paciente_id)
        if solo_pendientes:
            query = query.where(AlertaClinica.atendida.is_(False))
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def atender_alerta(
        db: AsyncSession, alerta_id: UUID, data: AlertaClinicaUpdate
    ) -> AlertaClinica:
        query = select(AlertaClinica).where(AlertaClinica.id == alerta_id)
        result = await db.execute(query)
        alerta = result.scalar_one_or_none()

        if not alerta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada"
            )

        alerta.atendida = data.atendida
        alerta.atendida_por_id = data.atendida_por_id
        alerta.fecha_atencion = datetime.utcnow()

        await db.commit()
        await db.refresh(alerta)
        return alerta
