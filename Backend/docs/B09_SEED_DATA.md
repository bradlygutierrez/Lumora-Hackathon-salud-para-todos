# B09 development seed

Creates deterministic, idempotent caregiver flow data only in development/test environments:

- caregiver.b09@lumora.test / caregiver_b09 / Test1234!
- patient.a.b09@lumora.test
- patient.b.b09@lumora.test

Run from ``Backend` with a non-production `ENVIRONMENT`:

```powershell
$env:ENVIRONMENT="development"
uv run python -m lumora_api.db.b09_seed seed
```

Remove it with:

```powershell
uv run python -m lumora_api.db.b09_seed remove
```

The command refuses to run when `ENVIRONMENT=production`. The caregiver has active read-only relationships (labels `Madre` and `Tutor Legal`) and they are returned by `GET /api/v1/caregivers/me/patients`.
