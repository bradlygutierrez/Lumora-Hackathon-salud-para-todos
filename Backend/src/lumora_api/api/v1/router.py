from fastapi import APIRouter

from lumora_api.api.v1 import (
    appointments,
    auth,
    cargos_salud,
    emergency_contacts,
    estados_cita,
    estados_condicion,
    estados_dosis,
    estados_expediente,
    estados_receta,
    especialidades,
    medical_records,
    mfa,
    niveles_severidad,
    origenes_registro,
    patient_clinical,
    patients,
    permisos,
    professionals,
    role_permissions,
    roles,
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
api_router.include_router(roles.router)
api_router.include_router(permisos.router)
api_router.include_router(estados_cita.router)
api_router.include_router(tipos_cita.router)
api_router.include_router(sexos.router)
api_router.include_router(tipos_sangre.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(professionals.router)
api_router.include_router(emergency_contacts.router)
api_router.include_router(auth.router)
api_router.include_router(user_roles.router)
api_router.include_router(role_permissions.router)
api_router.include_router(mfa.router)
api_router.include_router(appointments.router)
api_router.include_router(medical_records.router)
api_router.include_router(patient_clinical.router)

# Catálogos clínicos
api_router.include_router(cargos_salud.router)
api_router.include_router(especialidades.router)
api_router.include_router(estados_expediente.router)
api_router.include_router(estados_condicion.router)
api_router.include_router(tipos_antecedente.router)
api_router.include_router(tipos_diagnostico.router)

# Catálogos A01
api_router.include_router(estados_dosis.router)
api_router.include_router(estados_receta.router)
api_router.include_router(vias_administracion.router)
api_router.include_router(unidades_medida.router)
api_router.include_router(origenes_registro.router)
api_router.include_router(niveles_severidad.router)
api_router.include_router(tipos_alerta.router)
api_router.include_router(tipos_recordatorio.router)
api_router.include_router(tipos_relacion.router)
