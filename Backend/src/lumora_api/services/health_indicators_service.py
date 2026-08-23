from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from lumora_api.models.health_indicators import (
    AlertaClinica,
    IndicadorMedico,
    MedicionIndicador,
    RangoIndicador,
)
from lumora_api.schemas.health_indicators import (
    AlertaClinicaUpdate,
    IndicadorMedicoCreate,
    IndicadorMedicoUpdate,
    MedicionIndicadorCreate,
    RangoIndicadorCreate,
    RangoIndicadorUpdate,
)


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

        for rango in rangos:
            fuera_de_rango = False
            if rango.valor_minimo is not None and data.valor < rango.valor_minimo:
                fuera_de_rango = True
            if rango.valor_maximo is not None and data.valor > rango.valor_maximo:
                fuera_de_rango = True

            if fuera_de_rango:
                alerta = AlertaClinica(
                    paciente_id=paciente_id,
                    medicion_id=medicion.id,
                    nivel_severidad_id=rango.nivel_severidad_id,
                    tipo_alerta_id=1,
                    origen_registro_id=data.origen_registro_id,
                    mensaje=f"Medición fuera de rango ({rango.etiqueta}): {data.valor}",
                )
                db.add(alerta)

        await db.commit()
        await db.refresh(medicion)
        return medicion

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