from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, time, timezone
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import (
    Alergia,
    AlertaClinica,
    AntecedenteMedico,
    CondicionMedica,
    ConsultaMedica,
    Diagnostico,
    Discapacidad,
    EventoAuditoria,
    Expediente,
    HistorialCondicion,
    IndicadorMedico,
    MedicionIndicador,
    NivelSeveridad,
    NotaClinica,
    Paciente,
    Receta,
    SignoVital,
    TipoAlerta,
    UnidadMedida,
)


def _as_datetime(value: datetime | date | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _contains(value: str | None, query: str | None) -> bool:
    if query is None:
        return True
    return query.casefold() in (value or "").casefold()


class ClinicalIntegrationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_patient(self, patient_id: int) -> Paciente | None:
        return await self.session.scalar(
            select(Paciente).where(
                Paciente.id == patient_id,
                Paciente.deleted_at.is_(None),
            )
        )

    async def get_record(self, record_id: int) -> Expediente | None:
        return await self.session.scalar(
            select(Expediente).where(
                Expediente.id == record_id,
                Expediente.deleted_at.is_(None),
            )
        )

    async def active_record_for_patient(self, patient_id: int) -> Expediente | None:
        return await self.session.scalar(
            select(Expediente).where(
                Expediente.paciente_id == patient_id,
                Expediente.activo.is_(True),
                Expediente.deleted_at.is_(None),
            )
        )

    async def summary_payload(self, record: Expediente) -> dict[str, Any]:
        consultations = await self._consultations(record.id)
        consultation_ids = [item.id for item in consultations]
        return {
            "record": record,
            "histories": await self._histories(record.id),
            "allergies": await self._allergies(record.paciente_id),
            "disabilities": await self._disabilities(record.paciente_id),
            "conditions": await self._conditions(record.id),
            "consultations": consultations,
            "vital_signs": await self._vital_signs(consultation_ids),
            "notes": await self._notes(consultation_ids),
            "diagnoses": await self._diagnoses(consultation_ids),
            "prescriptions": await self._prescriptions(record.paciente_id, consultation_ids),
            "measurements": await self._measurements(record.paciente_id, limit=5),
            "alerts": await self._active_alerts(record.paciente_id),
        }

    async def timeline_items(
        self,
        record: Expediente,
        *,
        tipo: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        items = await self._timeline_candidates(record)
        if tipo is not None:
            items = [item for item in items if item["tipo"] == tipo]
        items.sort(
            key=lambda item: (
                item["occurred_at"],
                item["entidad"],
                item["entidad_id"],
            )
        )
        total = len(items)
        return items[offset : offset + limit], total

    async def search(
        self,
        *,
        patient_id: int | None,
        record_id: int | None,
        tipo: str | None,
        q: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        records = await self._search_records(patient_id, record_id)
        candidates: list[dict[str, Any]] = []
        for record in records:
            candidates.extend(await self._search_candidates(record))
        if tipo is not None:
            candidates = [item for item in candidates if item["tipo"] == tipo]
        normalized_q = q.casefold() if q else None
        if normalized_q is not None:
            candidates = [
                item
                for item in candidates
                if _contains(item["titulo"], normalized_q)
                or _contains(item.get("detalle"), normalized_q)
            ]
        candidates.sort(
            key=lambda item: (
                item["occurred_at"] or datetime.min.replace(tzinfo=timezone.utc),
                item["entidad"],
                item["entidad_id"],
            ),
            reverse=True,
        )
        total = len(candidates)
        return candidates[offset : offset + limit], total

    async def _search_records(
        self, patient_id: int | None, record_id: int | None
    ) -> list[Expediente]:
        query = select(Expediente).where(Expediente.deleted_at.is_(None))
        if patient_id is not None:
            query = query.where(Expediente.paciente_id == patient_id)
        if record_id is not None:
            query = query.where(Expediente.id == record_id)
        return list(await self.session.scalars(query.order_by(Expediente.id)))

    async def _consultations(self, record_id: int) -> list[ConsultaMedica]:
        return list(
            await self.session.scalars(
                select(ConsultaMedica)
                .where(
                    ConsultaMedica.expediente_id == record_id,
                    ConsultaMedica.activo.is_(True),
                    ConsultaMedica.deleted_at.is_(None),
                )
                .order_by(ConsultaMedica.fecha_consulta, ConsultaMedica.id)
            )
        )

    async def _histories(self, record_id: int) -> list[AntecedenteMedico]:
        return list(
            await self.session.scalars(
                select(AntecedenteMedico)
                .where(
                    AntecedenteMedico.expediente_id == record_id,
                    AntecedenteMedico.activo.is_(True),
                    AntecedenteMedico.deleted_at.is_(None),
                )
                .order_by(AntecedenteMedico.id)
            )
        )

    async def _allergies(self, patient_id: int) -> list[Alergia]:
        return list(
            await self.session.scalars(
                select(Alergia)
                .where(
                    Alergia.paciente_id == patient_id,
                    Alergia.activo.is_(True),
                    Alergia.deleted_at.is_(None),
                )
                .order_by(Alergia.nombre, Alergia.id)
            )
        )

    async def _disabilities(self, patient_id: int) -> list[Discapacidad]:
        return list(
            await self.session.scalars(
                select(Discapacidad)
                .where(
                    Discapacidad.paciente_id == patient_id,
                    Discapacidad.activo.is_(True),
                    Discapacidad.deleted_at.is_(None),
                )
                .order_by(Discapacidad.nombre, Discapacidad.id)
            )
        )

    async def _conditions(self, record_id: int) -> list[CondicionMedica]:
        return list(
            await self.session.scalars(
                select(CondicionMedica)
                .where(
                    CondicionMedica.expediente_id == record_id,
                    CondicionMedica.activo.is_(True),
                    CondicionMedica.deleted_at.is_(None),
                )
                .order_by(CondicionMedica.nombre, CondicionMedica.id)
            )
        )

    async def _diagnoses(self, consultation_ids: Iterable[int]) -> list[Diagnostico]:
        ids = list(consultation_ids)
        if not ids:
            return []
        return list(
            await self.session.scalars(
                select(Diagnostico)
                .where(
                    Diagnostico.consulta_id.in_(ids),
                    Diagnostico.activo.is_(True),
                    Diagnostico.deleted_at.is_(None),
                )
                .order_by(Diagnostico.fecha_diagnostico, Diagnostico.id)
            )
        )

    async def _notes(self, consultation_ids: Iterable[int]) -> list[NotaClinica]:
        ids = list(consultation_ids)
        if not ids:
            return []
        return list(
            await self.session.scalars(
                select(NotaClinica)
                .where(
                    NotaClinica.consulta_id.in_(ids),
                    NotaClinica.activo.is_(True),
                    NotaClinica.deleted_at.is_(None),
                )
                .order_by(NotaClinica.created_at, NotaClinica.id)
            )
        )

    async def _vital_signs(self, consultation_ids: Iterable[int]) -> list[SignoVital]:
        ids = list(consultation_ids)
        if not ids:
            return []
        return list(
            await self.session.scalars(
                select(SignoVital)
                .where(SignoVital.consulta_id.in_(ids))
                .order_by(SignoVital.registrado_at, SignoVital.id)
            )
        )

    async def _prescriptions(
        self, patient_id: int, consultation_ids: Iterable[int]
    ) -> list[Receta]:
        ids = list(consultation_ids)
        query = select(Receta).where(Receta.paciente_id == patient_id)
        if ids:
            query = query.where(
                or_(Receta.consulta_id.in_(ids), Receta.consulta_id.is_(None))
            )
        return list(
            await self.session.scalars(query.order_by(Receta.fecha_emision, Receta.id))
        )

    async def _alerts(self, patient_id: int) -> list[AlertaClinica]:
        return list(
            await self.session.scalars(
                select(AlertaClinica)
                .where(AlertaClinica.paciente_id == patient_id)
                .order_by(AlertaClinica.fecha_alerta, AlertaClinica.id)
            )
        )

    async def _measurements(
        self, patient_id: int, *, limit: int | None = None
    ) -> list[dict[str, Any]]:
        query = (
            select(
                MedicionIndicador,
                IndicadorMedico.nombre.label("indicador_nombre"),
                UnidadMedida.nombre.label("unidad_medida"),
            )
            .join(IndicadorMedico, IndicadorMedico.id == MedicionIndicador.indicador_id)
            .join(UnidadMedida, UnidadMedida.id == MedicionIndicador.unidad_medida_id)
            .where(MedicionIndicador.paciente_id == patient_id)
            .order_by(MedicionIndicador.fecha_medicion.desc(), MedicionIndicador.id.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        rows = (await self.session.execute(query)).all()
        return [
            {
                "id": measurement.id,
                "indicador_id": measurement.indicador_id,
                "indicador_nombre": indicator_name,
                "valor": measurement.valor,
                "unidad_medida_id": measurement.unidad_medida_id,
                "unidad_medida": unit_name,
                "origen_registro_id": measurement.origen_registro_id,
                "fecha_medicion": measurement.fecha_medicion,
                "observaciones": measurement.observaciones,
            }
            for measurement, indicator_name, unit_name in rows
        ]

    async def _active_alerts(self, patient_id: int) -> list[dict[str, Any]]:
        rows = (
            await self.session.execute(
                select(
                    AlertaClinica,
                    NivelSeveridad.nombre.label("nivel_severidad"),
                    TipoAlerta.nombre.label("tipo_alerta"),
                )
                .join(NivelSeveridad, NivelSeveridad.id == AlertaClinica.nivel_severidad_id)
                .join(TipoAlerta, TipoAlerta.id == AlertaClinica.tipo_alerta_id)
                .where(
                    AlertaClinica.paciente_id == patient_id,
                    AlertaClinica.atendida.is_(False),
                )
                .order_by(AlertaClinica.fecha_alerta.desc(), AlertaClinica.id.desc())
            )
        ).all()
        return [
            {
                "id": alert.id,
                "medicion_id": alert.medicion_id,
                "nivel_severidad_id": alert.nivel_severidad_id,
                "nivel_severidad": severity_name,
                "tipo_alerta_id": alert.tipo_alerta_id,
                "tipo_alerta": alert_type_name,
                "mensaje": alert.mensaje,
                "atendida": alert.atendida,
                "fecha_alerta": alert.fecha_alerta,
                "fecha_atencion": alert.fecha_atencion,
            }
            for alert, severity_name, alert_type_name in rows
        ]

    async def _audits(
        self,
        record_id: int,
        consultation_ids: Iterable[int],
        diagnosis_ids: Iterable[int],
        condition_ids: Iterable[int],
    ) -> list[EventoAuditoria]:
        clauses = [
            and_(
                EventoAuditoria.entidad == "expedientes",
                EventoAuditoria.entidad_id == record_id,
            )
        ]
        audit_filters = [
            ("consultas_medicas", list(consultation_ids)),
            ("diagnosticos", list(diagnosis_ids)),
            ("condiciones_medicas", list(condition_ids)),
        ]
        for entity, ids in audit_filters:
            if ids:
                clauses.append(
                    (EventoAuditoria.entidad == entity) & EventoAuditoria.entidad_id.in_(ids)
                )
        return list(
            await self.session.scalars(
                select(EventoAuditoria)
                .where(or_(*clauses))
                .order_by(EventoAuditoria.created_at, EventoAuditoria.id)
            )
        )

    async def _condition_history(
        self, condition_ids: Iterable[int]
    ) -> list[HistorialCondicion]:
        ids = list(condition_ids)
        if not ids:
            return []
        return list(
            await self.session.scalars(
                select(HistorialCondicion)
                .where(HistorialCondicion.condicion_id.in_(ids))
                .order_by(HistorialCondicion.created_at, HistorialCondicion.id)
            )
        )

    async def _timeline_candidates(self, record: Expediente) -> list[dict[str, Any]]:
        consultations = await self._consultations(record.id)
        consultation_ids = [item.id for item in consultations]
        diagnoses = await self._diagnoses(consultation_ids)
        conditions = await self._conditions(record.id)
        condition_ids = [item.id for item in conditions]

        items = [
            self._item(
                record.created_at,
                "expediente",
                "Expediente creado",
                record.numero_expediente,
                "expedientes",
                record.id,
            )
        ]
        items.extend(
            self._item(
                item.fecha,
                "antecedente",
                "Antecedente médico",
                item.descripcion,
                "antecedentes_medicos",
                item.id,
            )
            for item in await self._histories(record.id)
        )
        items.extend(
            self._item(
                item.fecha_consulta,
                "consulta",
                item.motivo or "Consulta médica",
                item.evaluacion,
                "consultas_medicas",
                item.id,
            )
            for item in consultations
        )
        items.extend(
            self._item(
                item.registrado_at,
                "signos_vitales",
                "Signos vitales registrados",
                None,
                "signos_vitales",
                item.id,
            )
            for item in await self._vital_signs(consultation_ids)
        )
        items.extend(
            self._item(
                item.created_at,
                "nota",
                "Nota clínica",
                item.contenido,
                "notas_clinicas",
                item.id,
            )
            for item in await self._notes(consultation_ids)
        )
        items.extend(
            self._item(
                item.fecha_diagnostico,
                "diagnostico",
                "Diagnóstico",
                item.descripcion,
                "diagnosticos",
                item.id,
            )
            for item in diagnoses
        )
        items.extend(
            self._item(
                item.fecha_inicio or item.created_at,
                "condicion",
                item.nombre,
                item.descripcion,
                "condiciones_medicas",
                item.id,
            )
            for item in conditions
        )
        items.extend(
            self._item(
                item.created_at,
                "historial_condicion",
                item.accion,
                item.motivo,
                "historial_condiciones",
                item.id,
            )
            for item in await self._condition_history(condition_ids)
        )
        items.extend(
            self._item(
                item.fecha_emision,
                "receta",
                "Receta emitida",
                item.observaciones,
                "recetas",
                item.id,
            )
            for item in await self._prescriptions(record.paciente_id, consultation_ids)
        )
        items.extend(
            self._item(
                item.fecha_alerta,
                "alerta",
                "Alerta clínica",
                item.mensaje,
                "alertas_clinicas",
                item.id,
            )
            for item in await self._alerts(record.paciente_id)
        )
        items.extend(
            self._item(item.created_at, "auditoria", item.accion, item.entidad, "eventos_auditoria", item.id)
            for item in await self._audits(
                record.id, consultation_ids, [item.id for item in diagnoses], condition_ids
            )
        )
        return [item for item in items if item["occurred_at"] is not None]

    async def _search_candidates(self, record: Expediente) -> list[dict[str, Any]]:
        timeline = await self._timeline_candidates(record)
        return [
            {
                "tipo": item["tipo"],
                "entidad": item["entidad"],
                "entidad_id": item["entidad_id"],
                "paciente_id": record.paciente_id,
                "expediente_id": record.id,
                "titulo": item["titulo"],
                "detalle": item["detalle"],
                "occurred_at": item["occurred_at"],
            }
            for item in timeline
        ]

    def _item(
        self,
        occurred_at: datetime | date | None,
        tipo: str,
        titulo: str,
        detalle: str | None,
        entidad: str,
        entidad_id: int | str,
    ) -> dict[str, Any]:
        return {
            "occurred_at": _as_datetime(occurred_at),
            "tipo": tipo,
            "titulo": titulo,
            "detalle": detalle,
            "entidad": entidad,
            "entidad_id": str(entidad_id),
        }
