from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Request, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_active_clinician
from lumora_api.models import EventoAuditoria
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
from lumora_api.services.prescription_pdf import render_prescription_pdf
from lumora_api.services.prescriptions import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["Recetas y medicamentos"])

# Solo personal clínico (mismo permiso que ya protege /expedientes) puede
# crear o editar medicamentos, recetas y sus detalles. Los pacientes solo
# leen -- y solo las suyas, gracias a PrescriptionService.
RequireClinicalStaff = Depends(require_active_clinician)


def service(db: SessionDep) -> PrescriptionService:
    return PrescriptionService(PrescriptionRepository(db))


# --- ENDPOINTS MEDICAMENTOS ---
@router.post(
    "/medications",
    response_model=MedicamentoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireClinicalStaff],
)
async def create_medicamento(schema: MedicamentoCreate, db: SessionDep):
    return await service(db).create_medicamento(schema)


@router.get("/medications", response_model=List[MedicamentoResponse])
async def list_medicamentos(
    db: SessionDep, current_user: CurrentUser, limit: int = 100, offset: int = 0
):
    return await service(db).list_medicamentos(limit=limit, offset=offset)


@router.get("/medications/{medicamento_id}", response_model=MedicamentoResponse)
async def get_medicamento(medicamento_id: str, db: SessionDep, current_user: CurrentUser):
    return await service(db).get_medicamento(medicamento_id)


@router.patch(
    "/medications/{medicamento_id}",
    response_model=MedicamentoResponse,
    dependencies=[RequireClinicalStaff],
)
async def update_medicamento(medicamento_id: str, schema: MedicamentoUpdate, db: SessionDep):
    return await service(db).update_medicamento(medicamento_id, schema)


@router.delete(
    "/medications/{medicamento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[RequireClinicalStaff],
)
async def delete_medicamento(medicamento_id: str, db: SessionDep):
    await service(db).delete_medicamento(medicamento_id)


# --- ENDPOINTS RECETAS ---
@router.post(
    "",
    response_model=RecetaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireClinicalStaff],
)
async def create_receta(
    schema: RecetaCreate, db: SessionDep, current_user: CurrentUser
):
    return await service(db).create_receta(current_user, schema)


@router.get("/{receta_id}", response_model=RecetaResponse)
async def get_receta(receta_id: str, db: SessionDep, current_user: CurrentUser):
    return await service(db).get_receta(db, current_user, receta_id)


def _receta_pdf_filename(receta_id: str, generated_at: datetime) -> str:
    stamp = generated_at.strftime("%Y%m%d-%H%M%S")
    return f"receta-{receta_id}-{stamp}.pdf"


@router.get("/{receta_id}/pdf")
async def get_receta_pdf(
    receta_id: str, db: SessionDep, current_user: CurrentUser, request: Request
) -> Response:
    receta = await service(db).get_receta(db, current_user, receta_id)
    pdf_bytes = render_prescription_pdf(receta)

    generated_at = datetime.utcnow()
    db.add(
        EventoAuditoria(
            usuario_id=current_user.id,
            accion="EXPORT",
            entidad="receta_pdf",
            # entidad_id es Integer -- receta.id es un UUID string, así que
            # se audita por paciente_id (el dato sensible expuesto) y el id
            # de la receta se conserva en datos_nuevos para trazabilidad.
            entidad_id=receta.paciente_id,
            datos_nuevos={"receta_id": receta.id, "generado_en": generated_at.isoformat()},
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()

    filename = _receta_pdf_filename(receta.id, generated_at)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.patch(
    "/{receta_id}",
    response_model=RecetaResponse,
    dependencies=[RequireClinicalStaff],
)
async def update_receta(
    receta_id: str,
    schema: RecetaUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return await service(db).update_receta(current_user, receta_id, schema)


@router.get("/patient/{paciente_id}", response_model=List[RecetaResponse])
async def get_recetas_by_patient(paciente_id: int, db: SessionDep, current_user: CurrentUser):
    return await service(db).get_recetas_by_patient(db, current_user, paciente_id)


# --- ENDPOINTS DETALLES DE RECETA ---
@router.post(
    "/{receta_id}/detalles",
    response_model=DetalleRecetaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireClinicalStaff],
)
async def create_detalle_receta(
    receta_id: str,
    schema: DetalleRecetaCreate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return await service(db).create_detalle(current_user, receta_id, schema)


@router.get("/{receta_id}/detalles", response_model=List[DetalleRecetaResponse])
async def get_detalles_receta(receta_id: str, db: SessionDep, current_user: CurrentUser):
    return await service(db).get_detalles(db, current_user, receta_id)


@router.patch(
    "/{receta_id}/detalles/{detalle_id}",
    response_model=DetalleRecetaResponse,
    dependencies=[RequireClinicalStaff],
)
async def update_detalle_receta(
    receta_id: str,
    detalle_id: str,
    schema: DetalleRecetaUpdate,
    db: SessionDep,
    current_user: CurrentUser,
):
    return await service(db).update_detalle(
        current_user, receta_id, detalle_id, schema
    )


@router.delete(
    "/{receta_id}/detalles/{detalle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[RequireClinicalStaff],
)
async def delete_detalle_receta(
    receta_id: str,
    detalle_id: str,
    db: SessionDep,
    current_user: CurrentUser,
):
    await service(db).delete_detalle(current_user, receta_id, detalle_id)