from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session as get_db
from lumora_api.api.dependencies import CurrentUser
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.services.patient_access_service import PatientAccessService
from lumora_api.services.reminders import ReminderService
from lumora_api.schemas.reminders import (
    RecordatorioCreate,
    RecordatorioUpdate,
    RecordatorioResponse,
    NotificacionResponse,
    PreferenciaNotificacionUpdate,
    PreferenciaNotificacionResponse,
    RelacionPacienteCreate,
    RelacionPacienteResponse,
)

router = APIRouter()


def _patient_access(db: AsyncSession) -> PatientAccessService:
    return PatientAccessService(PatientAccessRepository(db))


# --- CRUD /recordatorios ---
@router.post("/recordatorios", response_model=RecordatorioResponse, status_code=status.HTTP_201_CREATED)
async def crear_recordatorio(data: RecordatorioCreate, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).crear_recordatorio(data)

@router.get("/recordatorios/paciente/{paciente_id}", response_model=List[RecordatorioResponse])
async def listar_recordatorios(paciente_id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_recordatorios_paciente(paciente_id)

@router.get("/recordatorios/{id}", response_model=RecordatorioResponse)
async def obtener_recordatorio(id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_recordatorio_por_id(id)

@router.patch("/recordatorios/{id}", response_model=RecordatorioResponse)
async def actualizar_recordatorio(id: int, data: RecordatorioUpdate, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).actualizar_recordatorio(id, data)

@router.delete("/recordatorios/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_recordatorio(id: int, db: AsyncSession = Depends(get_db)):
    await ReminderService(db).eliminar_recordatorio(id)

# --- GET/PATCH /notificaciones ---
@router.get("/notificaciones/usuario/{usuario_id}", response_model=List[NotificacionResponse])
async def listar_notificaciones(
    usuario_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    # A09: cada quien consulta unicamente sus propias notificaciones por
    # este endpoint. Un cuidador que quiere ver las del paciente activo
    # usa /notificaciones/paciente/{paciente_id} (con patientContext),
    # no este.
    if current_user.id != usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return await ReminderService(db).obtener_notificaciones_usuario(usuario_id)

@router.get("/notificaciones/paciente/{paciente_id}", response_model=List[NotificacionResponse])
async def listar_notificaciones_paciente(
    paciente_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    # A09: mismo criterio de acceso que health-indicators (paciente ve lo
    # propio, cuidador ve solo pacientes con relacion activa autorizada).
    await _patient_access(db).require_access(current_user, paciente_id, action="read")
    return await ReminderService(db).obtener_notificaciones_paciente(paciente_id)

@router.patch("/notificaciones/{id}/marcar-leida", response_model=NotificacionResponse)
async def marcar_notificacion_leida(
    id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    service = ReminderService(db)
    notificacion = await service.obtener_notificacion_por_id(id)

    # A09: solo el dueño de la notificacion, o un cuidador autorizado del
    # paciente dueño de esa cuenta, puede marcarla como leida.
    if current_user.id != notificacion.usuario_id:
        paciente = await PatientAccessRepository(db).patient_for_user(notificacion.usuario_id)
        if paciente is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
        await _patient_access(db).require_access(current_user, paciente.id, action="write")

    return await service.marcar_notificacion_leida(id)

# --- GET/PATCH /usuarios/{id}/preferencias-notificacion ---
@router.get("/usuarios/{usuario_id}/preferencias-notificacion", response_model=PreferenciaNotificacionResponse)
async def obtener_preferencias(usuario_id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_preferencias(usuario_id)

@router.patch("/usuarios/{usuario_id}/preferencias-notificacion", response_model=PreferenciaNotificacionResponse)
async def actualizar_preferencias(usuario_id: int, data: PreferenciaNotificacionUpdate, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).actualizar_preferencias(usuario_id, data)

# --- CRUD /pacientes/{id}/relaciones ---
@router.post("/pacientes/{paciente_id}/relaciones", response_model=RelacionPacienteResponse, status_code=status.HTTP_201_CREATED)
async def crear_relacion(paciente_id: int, data: RelacionPacienteCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    await PatientAccessService(PatientAccessRepository(db)).require_relationship_management(current_user, paciente_id)
    data.paciente_id = paciente_id
    return await ReminderService(db).crear_relacion_paciente(data)

@router.get("/pacientes/{paciente_id}/relaciones", response_model=List[RelacionPacienteResponse])
async def listar_relaciones(paciente_id: int, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    await PatientAccessService(PatientAccessRepository(db)).require_access(current_user, paciente_id)
    return await ReminderService(db).obtener_relaciones_paciente(paciente_id)
