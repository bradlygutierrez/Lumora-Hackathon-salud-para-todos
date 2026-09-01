# B17 — Afiliaciones médicas

Las afiliaciones son administradas exclusivamente por el portal interno con
`afiliaciones:manage`. No existe registro público de profesionales.

## Modelo y estados

`AfiliacionMedica` tiene tipo `independiente` o `institucion`, contacto,
cupos contratados, estado (`pending`, `active`, `suspended`, `cancelled`) y
pago manual (`pending` o `paid`). Una independiente siempre tiene un cupo;
una institución tiene uno o más. `AfiliacionProfesional` conserva el historial
de pertenencia y su bandera `activo` consume un cupo.

## Aprovisionamiento y activación

`POST /api/v1/medical-affiliations/{id}/professionals` crea en una transacción
Persona, Usuario, ProfesionalSalud, rol `Profesional de Salud`, membership y
token. El username se genera desde el correo resolviendo colisiones. Nunca se
devuelve una contraseña ni se envía una contraseña permanente: el token
one-use existente de recuperación permite configurar la contraseña.

## Licencia y autorización

Se reutiliza `ProfesionalSalud.numero_licencia`; la verificación manual guarda
`licencia_verificada`, fecha y usuario verificador. Para escribir clínicamente
el usuario debe tener `clinica:manage`, perfil profesional no eliminado,
licencia verificada, membership activo, afiliación activa y pagada, y vigencia
válida. Las fallas responden 403 y no eliminan historia clínica.

## Endpoints internos

- `POST/GET /medical-affiliations`
- `GET/PATCH /medical-affiliations/{affiliation_id}`
- `POST /medical-affiliations/{affiliation_id}/professionals`
- `PATCH /medical-affiliations/{affiliation_id}/professionals/{professional_id}`
- `PATCH /medical-affiliations/professionals/{professional_id}/license`

Los errores de validación son 422, duplicados o cupos agotados son 409, y
usuarios sin el permiso son 403. Los profesionales no habilitados tampoco
aparecen en profesionales disponibles para reservar.

Las lecturas historicas se autorizan con el permiso clinico; la afiliacion vigente se exige para nuevas escrituras. Suspender una afiliacion no borra membresias, autores ni datos clinicos.
