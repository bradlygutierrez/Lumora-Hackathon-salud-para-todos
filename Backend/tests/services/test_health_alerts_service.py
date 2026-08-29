from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.models import (
    AlertaClinica,
    Cita,
    DetalleReceta,
    DosisAdministrada,
    EstadoCita,
    EstadoDosis,
    EstadoReceta,
    HorarioMedicamento,
    IndicadorMedico,
    Medicamento,
    MedicionIndicador,
    NivelSeveridad,
    Paciente,
    Persona,
    ProfesionalSalud,
    Receta,
    UnidadMedida,
)
from lumora_api.services.health_alerts_service import HealthAlertsService


async def _paciente(session_factory) -> int:
    async with session_factory() as s:
        persona = Persona(nombres="Ana", apellidos="Salud")
        s.add(persona)
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
async def test_alerta_clinica_pendiente_aparece_como_alta_severidad(session_factory):
    paciente_id = await _paciente(session_factory)
    async with session_factory() as s:
        unidad = UnidadMedida(nombre="mmHg")
        nivel = NivelSeveridad(nombre="Alta")
        s.add_all([unidad, nivel])
        await s.flush()

        indicador = IndicadorMedico(
            codigo="PA_HA", nombre="Presión Arterial", unidad_medida_id=unidad.id
        )
        s.add(indicador)
        await s.flush()

        medicion = MedicionIndicador(
            paciente_id=paciente_id,
            indicador_id=indicador.id,
            valor=150,
            unidad_medida_id=unidad.id,
            origen_registro_id=1,
            registrado_por_id=1,
        )
        s.add(medicion)
        await s.flush()

        alerta = AlertaClinica(
            paciente_id=paciente_id,
            medicion_id=medicion.id,
            nivel_severidad_id=nivel.id,
            tipo_alerta_id=1,
            origen_registro_id=1,
            mensaje="Tu última medición de Presión Arterial (150 mmHg) está fuera del rango normal.",
        )
        s.add(alerta)
        await s.commit()

    async with session_factory() as db:
        alertas = await HealthAlertsService.get_health_alerts(db, paciente_id)

    assert len(alertas) == 1
    item = alertas[0]
    assert item.tipo == "alerta_clinica"
    assert item.categoria == "alta_severidad"
    assert "Presión Arterial" in item.titulo
    assert item.atendida is False
    # A09 (Ver Medición Completa): el frontend necesita el id del
    # indicador (no solo el de la medición) para poder llevar al usuario
    # directo al historial de "Presión Arterial" en Indicadores de Salud.
    assert item.indicador_id == indicador.id


@pytest.mark.asyncio
async def test_dosis_vencida_sin_registrar_aparece_y_desaparece_al_registrarla(
    session_factory,
):
    paciente_id = await _paciente(session_factory)
    async with session_factory() as s:
        estado_activa = EstadoReceta(nombre="Activa")
        estado_tomada = EstadoDosis(nombre="Tomada")
        estado_pendiente = EstadoDosis(nombre="Pendiente")
        s.add_all([estado_activa, estado_tomada, estado_pendiente])
        await s.flush()

        medicamento = Medicamento(nombre="Losartán")
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
            dosis="50mg",
            frecuencia="Diaria",
            duracion_dias=30,
            cantidad_total=30,
        )
        s.add(detalle)
        await s.flush()

        # Programada hace 2 horas -- ya vencida, dentro de la ventana de
        # 48h, y sin ninguna DosisAdministrada todavia.
        hora_vencida = (datetime.utcnow() - timedelta(hours=2)).time()
        horario = HorarioMedicamento(
            detalle_receta_id=detalle.id, hora=hora_vencida, activo=True
        )
        s.add(horario)
        await s.commit()
        horario_id = horario.id
        tomada_id = estado_tomada.id
        pendiente_id = estado_pendiente.id

    async with session_factory() as db:
        alertas = await HealthAlertsService.get_health_alerts(db, paciente_id)

    dosis_alertas = [a for a in alertas if a.tipo == "dosis_omitida"]
    assert len(dosis_alertas) == 1
    assert dosis_alertas[0].categoria == "preventiva"
    assert "Losartán 50mg" in dosis_alertas[0].mensaje
    assert dosis_alertas[0].horario_id == horario_id

    # Al registrar la dosis como "Tomada", la alerta calculada deja de
    # aparecer -- ya no esta "sin registrar".
    async with session_factory() as s:
        dosis = DosisAdministrada(
            horario_id=horario_id,
            estado_dosis_id=tomada_id,
            fecha_programada=datetime.utcnow() - timedelta(hours=2),
            responsable_id=1,
            origen_registro_id=1,
        )
        s.add(dosis)
        await s.commit()
        dosis_id = dosis.id

    async with session_factory() as db:
        alertas_despues = await HealthAlertsService.get_health_alerts(db, paciente_id)
    assert [a for a in alertas_despues if a.tipo == "dosis_omitida"] == []

    # Si el usuario "cancela" el registro (vuelve el estado a
    # "Pendiente" -- ver PATCH /dosis/{id} y useCancelDose en el
    # frontend), la dosis sigue sin tomarse de verdad, asi que la alerta
    # tiene que reaparecer. Antes de este fix, cualquier fila en
    # DosisAdministrada (sin importar su estado) apagaba la alerta para
    # siempre.
    async with session_factory() as s:
        dosis_en_sesion = await s.get(DosisAdministrada, dosis_id)
        dosis_en_sesion.estado_dosis_id = pendiente_id
        await s.commit()

    async with session_factory() as db:
        alertas_tras_cancelar = await HealthAlertsService.get_health_alerts(
            db, paciente_id
        )
    dosis_alertas_tras_cancelar = [
        a for a in alertas_tras_cancelar if a.tipo == "dosis_omitida"
    ]
    assert len(dosis_alertas_tras_cancelar) == 1
    assert dosis_alertas_tras_cancelar[0].horario_id == horario_id


@pytest.mark.asyncio
async def test_dosis_tomada_con_fecha_un_dia_desfasada_por_zona_horaria_tambien_apaga_la_alerta(
    session_factory,
):
    """`horario.hora` no lleva zona horaria, y el frontend arma
    `fecha_programada` con la hora LOCAL del dispositivo convertida a UTC
    (ver Frontend/.../utils/time-of-day.ts::todayAtHora). Para un usuario
    en una zona horaria detras de UTC (ej. Nicaragua, UTC-6), una dosis
    nocturna registrada "hoy" en su calendario local puede llegar al
    backend con `fecha_programada` fechada "mañana" en UTC. La alerta
    calculada tiene que reconocer que esa dosis SI fue registrada, sin
    importar el corrimiento de un dia.
    """
    paciente_id = await _paciente(session_factory)
    async with session_factory() as s:
        estado_activa = EstadoReceta(nombre="Activa")
        estado_tomada = EstadoDosis(nombre="Tomada")
        s.add_all([estado_activa, estado_tomada])
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

        hora_vencida = (datetime.utcnow() - timedelta(hours=1)).time()
        horario = HorarioMedicamento(
            detalle_receta_id=detalle.id, hora=hora_vencida, activo=True
        )
        s.add(horario)
        await s.flush()

        # El "dia" que calcula el servicio para esta ocurrencia es
        # utcnow().date(). Simulamos el desfase de zona horaria fechando
        # el registro un dia despues de ese "dia" -- exactamente lo que
        # pasaria con un dispositivo detras de UTC.
        dia_calculado = datetime.utcnow().date()
        dosis = DosisAdministrada(
            horario_id=horario.id,
            estado_dosis_id=estado_tomada.id,
            fecha_programada=datetime.combine(
                dia_calculado + timedelta(days=1), hora_vencida
            ),
            responsable_id=1,
            origen_registro_id=1,
        )
        s.add(dosis)
        await s.commit()

    async with session_factory() as db:
        alertas = await HealthAlertsService.get_health_alerts(db, paciente_id)

    assert [a for a in alertas if a.tipo == "dosis_omitida"] == []


@pytest.mark.asyncio
async def test_cita_proxima_aparece_y_excluye_canceladas_y_lejanas(session_factory):
    paciente_id = await _paciente(session_factory)
    profesional_id = await _profesional(session_factory, especialidad="Cardiología")

    async with session_factory() as s:
        confirmada = EstadoCita(nombre="Confirmada")
        cancelada = EstadoCita(nombre="Cancelada")
        s.add_all([confirmada, cancelada])
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
        proxima_id = proxima.id

    async with session_factory() as db:
        alertas = await HealthAlertsService.get_health_alerts(db, paciente_id)

    citas_alertas = [a for a in alertas if a.tipo == "cita_proxima"]
    assert [a.cita_id for a in citas_alertas] == [proxima_id]
    assert citas_alertas[0].categoria == "recordatorio"
    assert "Cardiología" in citas_alertas[0].mensaje


@pytest.mark.asyncio
async def test_get_health_alerts_ordena_alta_severidad_antes_que_preventiva_y_recordatorio(
    session_factory,
):
    paciente_id = await _paciente(session_factory)
    profesional_id = await _profesional(session_factory)

    async with session_factory() as s:
        unidad = UnidadMedida(nombre="mmHg")
        nivel = NivelSeveridad(nombre="Alta")
        estado_activa = EstadoReceta(nombre="Activa")
        confirmada = EstadoCita(nombre="Confirmada")
        s.add_all([unidad, nivel, estado_activa, confirmada])
        await s.flush()

        indicador = IndicadorMedico(
            codigo="PA_ORD", nombre="Presión Arterial", unidad_medida_id=unidad.id
        )
        s.add(indicador)
        await s.flush()
        medicion = MedicionIndicador(
            paciente_id=paciente_id,
            indicador_id=indicador.id,
            valor=150,
            unidad_medida_id=unidad.id,
            origen_registro_id=1,
            registrado_por_id=1,
        )
        s.add(medicion)
        await s.flush()
        s.add(
            AlertaClinica(
                paciente_id=paciente_id,
                medicion_id=medicion.id,
                nivel_severidad_id=nivel.id,
                tipo_alerta_id=1,
                origen_registro_id=1,
                mensaje="Fuera de rango.",
            )
        )

        medicamento = Medicamento(nombre="Losartán")
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
            dosis="50mg",
            frecuencia="Diaria",
            duracion_dias=30,
            cantidad_total=30,
        )
        s.add(detalle)
        await s.flush()
        hora_vencida = (datetime.utcnow() - timedelta(hours=1)).time()
        s.add(
            HorarioMedicamento(
                detalle_receta_id=detalle.id, hora=hora_vencida, activo=True
            )
        )

        ahora = datetime.now(timezone.utc)
        s.add(
            Cita(
                paciente_id=paciente_id,
                profesional_id=profesional_id,
                estado_cita_id=confirmada.id,
                inicio=ahora + timedelta(hours=10),
                fin=ahora + timedelta(hours=11),
            )
        )
        await s.commit()

    async with session_factory() as db:
        alertas = await HealthAlertsService.get_health_alerts(db, paciente_id)

    assert [a.categoria for a in alertas] == ["alta_severidad", "preventiva", "recordatorio"]
