"""A09: ReminderService genera Notificaciones reales y persistidas para
"dosis omitida" y "cita proxima" -- eventos que se vuelven ciertos con
el paso del tiempo, sin un disparador discreto (a diferencia de una
AlertaClinica, que se genera de una vez en
HealthIndicatorsService.registrar_medicion). No hay scheduler en el
proyecto, asi que ReminderService.obtener_notificaciones_paciente
reconcilia estos casos de forma perezosa en cada GET -- ver
services/reminders.py::_generar_notificaciones_pendientes.

Mismo criterio (ventana de 48h, tolerancia de +-1 dia por zona horaria,
exclusion de citas canceladas/lejanas) que HealthAlertsService, para que
Alertas de Salud y Notificaciones nunca se contradigan sobre que esta
pendiente."""

from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.models import (
    Cita,
    DetalleReceta,
    DosisAdministrada,
    EstadoCita,
    EstadoDosis,
    EstadoReceta,
    HorarioMedicamento,
    Medicamento,
    Paciente,
    Persona,
    ProfesionalSalud,
    Receta,
    TipoRecordatorio,
    Usuario,
)
from lumora_api.core.security import hash_password
from lumora_api.services.reminders import ReminderService


async def _paciente_con_usuario(session_factory) -> int:
    """A diferencia de test_health_alerts_service.py::_paciente, aca hace
    falta un Usuario real (no solo Persona+Paciente) porque
    ReminderService resuelve paciente_id -> usuario_id (ver
    PatientAccessRepository.user_id_for_patient) para saber a quien
    pertenece la Notificacion."""
    async with session_factory() as s:
        persona = Persona(nombres="Ana", apellidos="Notifica")
        usuario = Usuario(
            persona=persona,
            email="ana.notifica@example.com",
            username="ana.notifica",
            password_hash=hash_password("Safe123!"),
        )
        s.add(usuario)
        await s.flush()
        paciente = Paciente(persona_id=persona.id)
        s.add(paciente)
        await s.commit()
        return paciente.id


async def _profesional(session_factory, especialidad: str = "Cardiología") -> int:
    async with session_factory() as s:
        persona = Persona(nombres="Doctor", apellidos="Prueba")
        s.add(persona)
        await s.flush()
        profesional = ProfesionalSalud(
            persona_id=persona.id,
            especialidad=especialidad,
            numero_licencia=f"LIC-{persona.id}",
        )
        s.add(profesional)
        await s.commit()
        return profesional.id


@pytest.mark.asyncio
async def test_dosis_omitida_genera_notificacion_real_y_no_se_duplica(session_factory):
    paciente_id = await _paciente_con_usuario(session_factory)

    async with session_factory() as s:
        estado_activa = EstadoReceta(nombre="Activa")
        # ReminderService._resolver_tipo_recordatorio busca este catalogo
        # por nombre -- la base de tests no viene pre-sembrada con
        # seed.py, asi que hay que crearlo aca (mismo criterio que
        # tests/api/v1/test_reminders_notificaciones.py::_seed).
        tipo_recordatorio = TipoRecordatorio(nombre="Medicación")
        s.add_all([estado_activa, tipo_recordatorio])
        await s.flush()

        medicamento = Medicamento(nombre="Loratadina")
        s.add(medicamento)
        await s.flush()

        receta = Receta(paciente_id=paciente_id, profesional_id=1, estado_id=estado_activa.id)
        s.add(receta)
        await s.flush()

        detalle = DetalleReceta(
            receta_id=receta.id,
            medicamento_id=medicamento.id,
            unidad_medida_id=1,
            via_administracion_id=1,
            dosis="10mg",
            frecuencia="Diaria",
            duracion_dias=30,
            cantidad_total=30,
        )
        s.add(detalle)
        await s.flush()

        hora_vencida = (datetime.utcnow() - timedelta(hours=2)).time()
        horario = HorarioMedicamento(detalle_receta_id=detalle.id, hora=hora_vencida, activo=True)
        s.add(horario)
        await s.commit()

    async with session_factory() as db:
        notificaciones = await ReminderService(db).obtener_notificaciones_paciente(paciente_id)

    de_dosis = [n for n in notificaciones if n.tipo == "recordatorio"]
    assert len(de_dosis) == 1
    assert de_dosis[0].titulo == "Dosis Omitida"
    assert "Loratadina" in de_dosis[0].mensaje

    # Segunda llamada: no debe crear una segunda Notificacion para la
    # misma dosis vencida.
    async with session_factory() as db2:
        notificaciones_2 = await ReminderService(db2).obtener_notificaciones_paciente(paciente_id)

    assert len([n for n in notificaciones_2 if n.tipo == "recordatorio"]) == 1


@pytest.mark.asyncio
async def test_dosis_tomada_no_genera_notificacion_de_dosis_omitida(session_factory):
    paciente_id = await _paciente_con_usuario(session_factory)

    async with session_factory() as s:
        estado_activa = EstadoReceta(nombre="Activa")
        estado_tomada = EstadoDosis(nombre="Tomada")
        tipo_recordatorio = TipoRecordatorio(nombre="Medicación")
        s.add_all([estado_activa, estado_tomada, tipo_recordatorio])
        await s.flush()

        medicamento = Medicamento(nombre="Paracetamol")
        s.add(medicamento)
        await s.flush()

        receta = Receta(paciente_id=paciente_id, profesional_id=1, estado_id=estado_activa.id)
        s.add(receta)
        await s.flush()

        detalle = DetalleReceta(
            receta_id=receta.id,
            medicamento_id=medicamento.id,
            unidad_medida_id=1,
            via_administracion_id=1,
            dosis="500mg",
            frecuencia="Cada 8 horas",
            duracion_dias=10,
            cantidad_total=30,
        )
        s.add(detalle)
        await s.flush()

        hora_vencida = (datetime.utcnow() - timedelta(hours=1)).time()
        horario = HorarioMedicamento(detalle_receta_id=detalle.id, hora=hora_vencida, activo=True)
        s.add(horario)
        await s.flush()

        dosis = DosisAdministrada(
            horario_id=horario.id,
            estado_dosis_id=estado_tomada.id,
            fecha_programada=datetime.utcnow(),
            responsable_id=1,
            origen_registro_id=1,
        )
        s.add(dosis)
        await s.commit()

    async with session_factory() as db:
        notificaciones = await ReminderService(db).obtener_notificaciones_paciente(paciente_id)

    assert [n for n in notificaciones if n.tipo == "recordatorio"] == []


@pytest.mark.asyncio
async def test_cita_proxima_genera_notificacion_real_excluye_canceladas_lejanas_y_no_se_duplica(
    session_factory,
):
    paciente_id = await _paciente_con_usuario(session_factory)
    profesional_id = await _profesional(session_factory, especialidad="Cardiología")

    async with session_factory() as s:
        confirmada = EstadoCita(nombre="Confirmada")
        cancelada = EstadoCita(nombre="Cancelada")
        tipo_recordatorio = TipoRecordatorio(nombre="Cita")
        s.add_all([confirmada, cancelada, tipo_recordatorio])
        await s.flush()

        ahora = datetime.now(timezone.utc)
        proxima = Cita(
            paciente_id=paciente_id,
            profesional_id=profesional_id,
            estado_cita_id=confirmada.id,
            inicio=ahora + timedelta(hours=10),
            fin=ahora + timedelta(hours=11),
        )
        cita_cancelada = Cita(
            paciente_id=paciente_id,
            profesional_id=profesional_id,
            estado_cita_id=cancelada.id,
            inicio=ahora + timedelta(hours=5),
            fin=ahora + timedelta(hours=6),
        )
        lejana = Cita(
            paciente_id=paciente_id,
            profesional_id=profesional_id,
            estado_cita_id=confirmada.id,
            inicio=ahora + timedelta(days=10),
            fin=ahora + timedelta(days=10, hours=1),
        )
        s.add_all([proxima, cita_cancelada, lejana])
        await s.commit()

    async with session_factory() as db:
        notificaciones = await ReminderService(db).obtener_notificaciones_paciente(paciente_id)

    de_citas = [n for n in notificaciones if n.tipo == "cita"]
    assert len(de_citas) == 1
    assert de_citas[0].titulo == "Cita Próxima"
    assert "Cardiología" in de_citas[0].mensaje

    async with session_factory() as db2:
        notificaciones_2 = await ReminderService(db2).obtener_notificaciones_paciente(paciente_id)

    assert len([n for n in notificaciones_2 if n.tipo == "cita"]) == 1
