import pytest

from lumora_api.repositories.prescriptions import PrescriptionRepository
from lumora_api.schemas.prescriptions import (
    DetalleRecetaCreate,
    MedicamentoCreate,
    RecetaCreate,
)


def _detalle(medicamento_id: str) -> DetalleRecetaCreate:
    return DetalleRecetaCreate(
        medicamento_id=medicamento_id,
        unidad_medida_id=1,
        via_administracion_id=1,
        dosis="50mg",
        frecuencia="Cada 12 horas",
        duracion_dias=30,
        cantidad_total=60,
    )


@pytest.mark.asyncio
async def test_create_and_fetch_receta_with_detalles(session_factory):
    async with session_factory() as session:
        repository = PrescriptionRepository(session)
        medicamento = await repository.create_medicamento(
            MedicamentoCreate(nombre="Losartán", presentacion="Tableta")
        )

        receta = await repository.create_receta(
            RecetaCreate(
                paciente_id=1,
                profesional_id=2,
                titulo="Tratamiento Hipertensión",
                detalles=[_detalle(medicamento.id)],
            )
        )

        assert receta.titulo == "Tratamiento Hipertensión"
        assert len(receta.detalles) == 1

        fetched = await repository.get_receta_by_id(receta.id)
        assert fetched is not None
        assert fetched.detalles[0].dosis == "50mg"

        by_patient = await repository.get_recetas_by_paciente(1)
        assert [item.id for item in by_patient] == [receta.id]


@pytest.mark.asyncio
async def test_get_paciente_id_for_receta_and_detalle(session_factory):
    async with session_factory() as session:
        repository = PrescriptionRepository(session)
        medicamento = await repository.create_medicamento(MedicamentoCreate(nombre="Aspirina"))
        receta = await repository.create_receta(
            RecetaCreate(paciente_id=7, profesional_id=2, detalles=[_detalle(medicamento.id)])
        )
        detalle_id = receta.detalles[0].id

        assert await repository.get_paciente_id_for_receta(receta.id) == 7
        assert await repository.get_paciente_id_for_detalle(detalle_id) == 7
        assert await repository.get_paciente_id_for_detalle("no-existe") is None
