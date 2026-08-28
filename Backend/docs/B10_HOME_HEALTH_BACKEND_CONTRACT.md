# B10 — Inicio y Mi Salud (backend)

`GET /api/v1/patients/{patient_id}/health-summary` requiere Bearer. Devuelve solo `patient_id`, alergias activas y condiciones activas:

```json
{"patient_id":7,"allergies":[{"id":1,"name":"Penicilina","description":null,"severity":"Alta","active":true}],"active_conditions":[{"id":2,"name":"Hipertensión","description":null,"diagnosed_at":"2026-01-01","status":"Activa"}]}
```

El paciente solo puede consultar su propio contexto. Un cuidador requiere una relación `active`, no expirada y autorizada. Otros usuarios reciben `403`. Sin expediente activo o sin alergias, las listas son `[]`. Los CRUD clínicos de `/expedientes`, `/condiciones` y `/pacientes/{id}/alergias` conservan `clinica:manage`.

Los endpoints existentes de citas, mediciones, alertas y recetas validan el `paciente_id` mediante el guard central B09; no se acepta un ID arbitrario. B10 continúa usando esos endpoints para dosis, citas, mediciones y alertas.
