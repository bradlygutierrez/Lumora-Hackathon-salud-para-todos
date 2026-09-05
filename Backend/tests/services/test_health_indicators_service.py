import pytest
from sqlalchemy import select

from helpers.medical import create_active_medical_professional
from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.core.security import hash_password
from lumora_api.models import (
    AlertaClinica,
    IndicadorMedico,
    NivelSeveridad,
    Notificacion,
    OrigenRegistro,
    Paciente,
    Persona,
    RangoIndicador,
    Recordatorio,
    TipoAlerta,
    TipoRecordatorio,
    UnidadMedida,
    Usuario,
)
from lumora_api.schemas.health_indicators import AlertaClinicaUpdate, MedicionIndicadorCreate
from lumora_api.services.health_indicators_service import HealthIndicatorsService


async def _seed_base(session_factory, registrador_email="registrador@example.com"):
    """Crea catalogos + indicador + rango 'fuera de rango si > 120' y un
    usuario cualquiera para usar como registrado_por_id."""
    async with session_factory() as s:
        registrador = Usuario(
            persona=Persona(nombres="Reg", apellidos="Istrador"),
            email=registrador_email,
            username=registrador_email.split("@")[0],
            password_hash=hash_password("Safe123!"),
        )
        s.add(registrador)

        unidad = UnidadMedida(nombre="mmHg")
        origen = OrigenRegistro(nombre="Manual")
        nivel = NivelSeveridad(nombre="Alta")
        # A09: sin esto, _resolver_tipo_recordatorio_medicion devuelve None
        # y registrar_medicion se salta la creacion del Recordatorio/
        # Notificacion aunque la alerta si se haya generado.
        tipo_recordatorio = TipoRecordatorio(nombre="Medición")
        s.add_all([unidad, origen, nivel, tipo_recordatorio])
        await s.flush()

        indicador = IndicadorMedico(
            codigo="PA_TEST", nombre="Presión Arterial", unidad_medida_id=unidad.id
        )
        s.add(indicador)
        await s.flush()

        rango = RangoIndicador(
            indicador_id=indicador.id,
            nivel_severidad_id=nivel.id,
            valor_maximo=120,
            etiqueta="Fuera de rango",
        )
        s.add(rango)
        await s.commit()

        return {
            "registrador_id": registrador.id,
            "indicador_id": indicador.id,
            "unidad_medida_id": unidad.id,
            "origen_registro_id": origen.id,
        }


async def _seed_paciente_con_usuario(session_factory):
    async with session_factory() as s:
        persona = Persona(nombres="Pat", apellidos="Ciente")
        pu = Usuario(
            persona=persona,
            email="paciente.a09@example.com",
            username="pacientea09",
            password_hash=hash_password("Safe123!"),
        )
        s.add(pu)
        await s.flush()
        paciente = Paciente(persona_id=pu.persona_id)
        s.add(paciente)
        await s.commit()
        return paciente.id, pu.id


async def _seed_clinical_professional(session_factory, username: str) -> int:
    """Devuelve el user_id -- el llamador debe re-fetchear el Usuario en su
    propia sesión activa antes de usarlo (roles es lazy="selectin" y no
    sobrevive fuera de la sesión en la que se cargó)."""
    async with session_factory() as s:
        user = Usuario(
            persona=Persona(nombres="Dra", apellidos="Sin Relación"),
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("Safe123!"),
        )
        s.add(user)
        await s.flush()
        await create_active_medical_professional(s, user=user, username=username)
        await s.commit()
        return user.id


async def _seed_paciente_sin_usuario(session_factory):
    async with session_factory() as s:
        persona = Persona(nombres="Sin", apellidos="Cuenta")
        s.add(persona)
        await s.flush()
        paciente = Paciente(persona_id=persona.id)
        s.add(paciente)
        await s.commit()
        return paciente.id


@pytest.mark.asyncio
async def test_medicion_fuera_de_rango_crea_alerta_recordatorio_y_notificacion(
    session_factory,
):
    base = await _seed_base(session_factory)
    paciente_id, usuario_id = await _seed_paciente_con_usuario(session_factory)

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=150,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        registrador = await db.get(Usuario, base["registrador_id"])
        medicion = await HealthIndicatorsService.registrar_medicion(
            db, paciente_id, data, registrador
        )

        alerta = (
            await db.execute(
                select(AlertaClinica).where(AlertaClinica.medicion_id == medicion.id)
            )
        ).scalar_one()
        assert "Presión Arterial" in alerta.mensaje
        assert "150" in alerta.mensaje
        assert "mmHg" in alerta.mensaje

        tipo_alerta = await db.get(TipoAlerta, alerta.tipo_alerta_id)
        assert tipo_alerta.nombre == "Medición Fuera de Rango"

        recordatorio = (
            await db.execute(
                select(Recordatorio).where(Recordatorio.alerta_id == alerta.id)
            )
        ).scalar_one()
        assert recordatorio.paciente_id == paciente_id
        assert recordatorio.mensaje == alerta.mensaje

        notificacion = (
            await db.execute(
                select(Notificacion).where(
                    Notificacion.recordatorio_id == recordatorio.id
                )
            )
        ).scalar_one()
        assert notificacion.usuario_id == usuario_id
        assert notificacion.mensaje == alerta.mensaje


@pytest.mark.asyncio
async def test_medicion_dentro_de_rango_no_genera_alertas(session_factory):
    base = await _seed_base(session_factory)
    paciente_id, _usuario_id = await _seed_paciente_con_usuario(session_factory)

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=100,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        registrador = await db.get(Usuario, base["registrador_id"])
        medicion = await HealthIndicatorsService.registrar_medicion(
            db, paciente_id, data, registrador
        )

        alertas = (
            await db.execute(
                select(AlertaClinica).where(AlertaClinica.medicion_id == medicion.id)
            )
        ).scalars().all()
        assert alertas == []


@pytest.mark.asyncio
async def test_medicion_fuera_de_rango_sin_cuenta_de_usuario_no_crea_notificacion(
    session_factory,
):
    base = await _seed_base(session_factory)
    paciente_id = await _seed_paciente_sin_usuario(session_factory)

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=150,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        registrador = await db.get(Usuario, base["registrador_id"])
        medicion = await HealthIndicatorsService.registrar_medicion(
            db, paciente_id, data, registrador
        )

        # La alerta clinica se genera igual (paciente sin cuenta propia no
        # es motivo para dejar de registrar la alerta), pero no hay a
        # quien notificarle en la bandeja de Notificaciones.
        alerta = (
            await db.execute(
                select(AlertaClinica).where(AlertaClinica.medicion_id == medicion.id)
            )
        ).scalar_one()

        recordatorios = (
            await db.execute(
                select(Recordatorio).where(Recordatorio.alerta_id == alerta.id)
            )
        ).scalars().all()
        assert recordatorios == []

        notificaciones = (await db.execute(select(Notificacion))).scalars().all()
        assert notificaciones == []


@pytest.mark.asyncio
async def test_resolver_tipo_alerta_medicion_es_self_healing_e_idempotente(
    session_factory,
):
    """Si el ambiente todavia no corrio el seed actualizado (sin
    'Medición Fuera de Rango' en tipos_alerta), el propio servicio lo crea
    la primera vez que hace falta, y lo reutiliza (no lo duplica) en la
    siguiente alerta."""
    base = await _seed_base(session_factory)
    paciente_id, _usuario_id = await _seed_paciente_con_usuario(session_factory)

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=150,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        registrador = await db.get(Usuario, base["registrador_id"])
        await HealthIndicatorsService.registrar_medicion(db, paciente_id, data, registrador)
        await HealthIndicatorsService.registrar_medicion(db, paciente_id, data, registrador)

        tipos = (
            (
                await db.execute(
                    select(TipoAlerta).where(
                        TipoAlerta.nombre == "Medición Fuera de Rango"
                    )
                )
            )
            .scalars()
            .all()
        )
        assert len(tipos) == 1


@pytest.mark.asyncio
async def test_registrar_medicion_rechaza_profesional_sin_relacion_con_el_paciente(
    session_factory,
):
    base = await _seed_base(session_factory)
    paciente_id, _usuario_id = await _seed_paciente_con_usuario(session_factory)
    professional_user_id = await _seed_clinical_professional(
        session_factory, "doc-medicion-sin-relacion"
    )

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=150,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        professional_user = await db.get(Usuario, professional_user_id)
        with pytest.raises(PermissionDeniedError):
            await HealthIndicatorsService.registrar_medicion(
                db, paciente_id, data, professional_user
            )


@pytest.mark.asyncio
async def test_atender_alerta_rechaza_profesional_sin_relacion_con_el_paciente(
    session_factory,
):
    base = await _seed_base(session_factory)
    paciente_id, _usuario_id = await _seed_paciente_con_usuario(session_factory)
    professional_user_id = await _seed_clinical_professional(
        session_factory, "doc-alerta-sin-relacion"
    )

    data = MedicionIndicadorCreate(
        indicador_id=base["indicador_id"],
        valor=150,
        unidad_medida_id=base["unidad_medida_id"],
        origen_registro_id=base["origen_registro_id"],
        registrado_por_id=base["registrador_id"],
    )

    async with session_factory() as db:
        registrador = await db.get(Usuario, base["registrador_id"])
        medicion = await HealthIndicatorsService.registrar_medicion(
            db, paciente_id, data, registrador
        )
        alerta = (
            await db.execute(
                select(AlertaClinica).where(AlertaClinica.medicion_id == medicion.id)
            )
        ).scalar_one()

    async with session_factory() as db:
        professional_user = await db.get(Usuario, professional_user_id)
        with pytest.raises(PermissionDeniedError):
            await HealthIndicatorsService.atender_alerta(
                db,
                alerta.id,
                AlertaClinicaUpdate(atendida=True, atendida_por_id=professional_user_id),
                professional_user,
            )
