# Appointment management backend contract

`tipo_cita_id` reuses the existing catalog: `Presencial` and `Virtual` (the latter is the telemedicine modality). Consultation reason reuses `notas`; cancellation accepts optional `motivo` and persists it in the audit event.

## Endpoints
- `GET /api/v1/citas` and `GET /api/v1/citas/{id}` remain patient-context scoped.
- `POST /api/v1/citas` defaults new patient/caregiver appointments to `Pendiente` and revalidates conflicts and configured availability.
- `PATCH /api/v1/citas/{id}/reprogramar` revalidates availability excluding the current appointment.
- `POST /api/v1/citas/{id}/cancelar` logically cancels and preserves history.
- `GET /api/v1/citas/profesionales-disponibles?q=&especialidad=` exposes safe discovery fields.
- `GET /api/v1/citas/disponibilidad?profesional_id=&fecha=` returns slots generated from recurring `HorarioProfesional` rows.
- `GET /api/v1/citas/ubicaciones-disponibles` returns active healthcare locations.

Slots use an explicit configurable 45-minute duration (the current domain has no prior duration rule); schedules are recurring Monday=0 through Sunday=6. Occupied non-cancelled appointments block slots, cancelled appointments do not. No ratings/reviews or telemedicine meeting-link domain exists, so those remain frontend/product gaps. Physical appointments require `ubicacion_id`; virtual appointments do not.
