from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session as get_db
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
async def listar_notificaciones(usuario_id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_notificaciones_usuario(usuario_id)

@router.patch("/notificaciones/{id}/marcar-leida", response_model=NotificacionResponse)
async def marcar_notificacion_leida(id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).marcar_notificacion_leida(id)

# --- GET/PATCH /usuarios/{id}/preferencias-notificacion ---
@router.get("/usuarios/{usuario_id}/preferencias-notificacion", response_model=PreferenciaNotificacionResponse)
async def obtener_preferencias(usuario_id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_preferencias(usuario_id)

@router.patch("/usuarios/{usuario_id}/preferencias-notificacion", response_model=PreferenciaNotificacionResponse)
async def actualizar_preferencias(usuario_id: int, data: PreferenciaNotificacionUpdate, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).actualizar_preferencias(usuario_id, data)

# --- CRUD /pacientes/{id}/relaciones ---
@router.post("/pacientes/{paciente_id}/relaciones", response_model=RelacionPacienteResponse, status_code=status.HTTP_201_CREATED)
async def crear_relacion(paciente_id: int, data: RelacionPacienteCreate, db: AsyncSession = Depends(get_db)):
    data.paciente_id = paciente_id
    return await ReminderService(db).crear_relacion_paciente(data)

@router.get("/pacientes/{paciente_id}/relaciones", response_model=List[RelacionPacienteResponse])
async def listar_relaciones(paciente_id: int, db: AsyncSession = Depends(get_db)):
    return await ReminderService(db).obtener_relaciones_paciente(paciente_id)