from typing import List
from fastapi import APIRouter, HTTPException, status

from lumora_api.api.dependencies import SessionDep
from lumora_api.repositories.prescriptions import PrescriptionRepository
from lumora_api.schemas.prescriptions import (
    MedicamentoCreate,
    MedicamentoResponse,
    MedicamentoUpdate,
    RecetaCreate,
    RecetaResponse,
    RecetaUpdate,
    DetalleRecetaCreate,
    DetalleRecetaResponse,
    DetalleRecetaUpdate,
)

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


# --- ENDPOINTS MEDICAMENTOS ---
@router.post("/medications", response_model=MedicamentoResponse, status_code=status.HTTP_201_CREATED)
async def create_medicamento(schema: MedicamentoCreate, db: SessionDep):
    repo = PrescriptionRepository(db)
    return await repo.create_medicamento(schema)


@router.get("/medications", response_model=List[MedicamentoResponse])
async def list_medicamentos(db: SessionDep, limit: int = 100, offset: int = 0):
    repo = PrescriptionRepository(db)
    return await repo.get_medicamentos(limit=limit, offset=offset)


@router.get("/medications/{medicamento_id}", response_model=MedicamentoResponse)
async def get_medicamento(medicamento_id: str, db: SessionDep):
    repo = PrescriptionRepository(db)
    med = await repo.get_medicamento_by_id(medicamento_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    return med


@router.patch("/medications/{medicamento_id}", response_model=MedicamentoResponse)
async def update_medicamento(
    medicamento_id: str,
    schema: MedicamentoUpdate,
    db: SessionDep,
):
    repo = PrescriptionRepository(db)
    med = await repo.get_medicamento_by_id(medicamento_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    return await repo.update_medicamento(med, schema)


@router.delete("/medications/{medicamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicamento(medicamento_id: str, db: SessionDep):
    repo = PrescriptionRepository(db)
    med = await repo.get_medicamento_by_id(medicamento_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    await repo.delete_medicamento(med)


# --- ENDPOINTS RECETAS ---
@router.post("", response_model=RecetaResponse, status_code=status.HTTP_201_CREATED)
async def create_receta(schema: RecetaCreate, db: SessionDep):
    repo = PrescriptionRepository(db)
    return await repo.create_receta(schema)


@router.get("/{receta_id}", response_model=RecetaResponse)
async def get_receta(receta_id: str, db: SessionDep):
    repo = PrescriptionRepository(db)
    receta = await repo.get_receta_by_id(receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return receta


@router.patch("/{receta_id}", response_model=RecetaResponse)
async def update_receta(receta_id: str, schema: RecetaUpdate, db: SessionDep):
    repo = PrescriptionRepository(db)
    receta = await repo.get_receta_by_id(receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return await repo.update_receta(receta, schema)


@router.get("/patient/{paciente_id}", response_model=List[RecetaResponse])
async def get_recetas_by_patient(paciente_id: int, db: SessionDep):
    repo = PrescriptionRepository(db)
    return await repo.get_recetas_by_paciente(paciente_id)


# --- ENDPOINTS DETALLES DE RECETA ---
@router.post("/{receta_id}/detalles", response_model=DetalleRecetaResponse, status_code=status.HTTP_201_CREATED)
async def create_detalle_receta(receta_id: str, schema: DetalleRecetaCreate, db: SessionDep):
    repo = PrescriptionRepository(db)
    receta = await repo.get_receta_by_id(receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return await repo.create_detalle(receta_id, schema)


@router.get("/{receta_id}/detalles", response_model=List[DetalleRecetaResponse])
async def get_detalles_receta(receta_id: str, db: SessionDep):
    repo = PrescriptionRepository(db)
    receta = await repo.get_receta_by_id(receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return await repo.get_detalles_by_receta(receta_id)


@router.patch("/{receta_id}/detalles/{detalle_id}", response_model=DetalleRecetaResponse)
async def update_detalle_receta(
    receta_id: str,
    detalle_id: str,
    schema: DetalleRecetaUpdate,
    db: SessionDep,
):
    repo = PrescriptionRepository(db)
    detalle = await repo.get_detalle_by_id(detalle_id)
    if not detalle or detalle.receta_id != receta_id:
        raise HTTPException(status_code=404, detail="Detalle no encontrado en la receta especificada")
    return await repo.update_detalle(detalle, schema)


@router.delete("/{receta_id}/detalles/{detalle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detalle_receta(receta_id: str, detalle_id: str, db: SessionDep):
    repo = PrescriptionRepository(db)
    detalle = await repo.get_detalle_by_id(detalle_id)
    if not detalle or detalle.receta_id != receta_id:
        raise HTTPException(status_code=404, detail="Detalle no encontrado en la receta especificada")
    await repo.delete_detalle(detalle)