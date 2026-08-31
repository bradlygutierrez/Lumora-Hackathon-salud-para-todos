from fastapi import APIRouter

from lumora_api.api.v1 import (
    account,
    appointments,
    auth,
    cargos_salud,
    clinical_integration,
    caregivers,
    conditions,
    consultations,
    diagnoses,
    emergency_contacts,
    especialidades,
    estados_cita,
    estados_condicion,
    estados_dosis,
    estados_expediente,
    estados_receta,
    health_alerts,
    health_indicators,
    health_summary,
    medical_records,
    medical_record_document,
    mfa,
    motivos_consulta,
    niveles_severidad,
    origenes_registro,
    patient_clinical,
    patients,
    permisos,
    prescriptions,
    professionals,
    reminders,
    role_permissions,
    roles,
    schedules,
    sexos,
    tipos_alerta,
    tipos_antecedente,
    tipos_cita,
    tipos_diagnostico,
    tipos_recordatorio,
    tipos_relacion,
    tipos_sangre,
    unidades_medida,
    user_roles,
    users,
    vias_administracion,
)

api_router = APIRouter()
api_router.include_router(account.router)
api_router.include_router(roles.router)
api_router.include_router(permisos.router)
api_router.include_router(estados_cita.router)
api_router.include_router(tipos_cita.router)
api_router.include_router(sexos.router)
api_router.include_router(tipos_sangre.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(patients.context_router)
api_router.include_router(professionals.router)
api_router.include_router(emergency_contacts.router)
api_router.include_router(auth.router)
api_router.include_router(caregivers.router)
api_router.include_router(user_roles.router)
api_router.include_router(role_permissions.router)
api_router.include_router(mfa.router)
api_router.include_router(appointments.router)
api_router.include_router(medical_records.router)
api_router.include_router(medical_record_document.router)
api_router.include_router(patient_clinical.router)
api_router.include_router(consultations.router)
api_router.include_router(prescriptions.router)
api_router.include_router(schedules.router)
api_router.include_router(health_indicators.router)
api_router.include_router(health_summary.router)
api_router.include_router(health_alerts.router)
api_router.include_router(diagnoses.router)
api_router.include_router(conditions.router)
api_router.include_router(clinical_integration.router)

# Catálogos clínicos
api_router.include_router(cargos_salud.router)
api_router.include_router(especialidades.router)
api_router.include_router(estados_expediente.router)
api_router.include_router(estados_condicion.router)
api_router.include_router(tipos_antecedente.router)
api_router.include_router(tipos_diagnostico.router)
api_router.include_router(motivos_consulta.router)

# Catálogos 
api_router.include_router(estados_dosis.router)
api_router.include_router(estados_receta.router)
api_router.include_router(vias_administracion.router)
api_router.include_router(unidades_medida.router)
api_router.include_router(origenes_registro.router)
api_router.include_router(niveles_severidad.router)
api_router.include_router(tipos_alerta.router)
api_router.include_router(tipos_recordatorio.router)
api_router.include_router(tipos_relacion.router)

# Recordatorios y Notificaciones
api_router.include_router(
    reminders.router,
    prefix="/reminders",
    tags=["Recordatorios y notificaciones"],
)
