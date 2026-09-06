# AGENTS.md

## Project

This repository is the **Lumora Health Staff React Native application**.

It is intended for:

- doctors
- nurses
- authorized healthcare personnel
- authorized clinical staff

It consumes the existing Lumora **FastAPI backend**.

Backend endpoints, schemas, roles, permissions, enums, and validation rules are the source of truth.

Do not implement patient-only consumer workflows unless required for staff interaction.

---

# Main Users

Primary users may include:

```text
Doctor
Nurse
Healthcare Staff
Authorized Clinical Personnel
```

Use the exact roles and permissions defined by the backend.

Never invent role names.

---

# Product Goal

HealthStaff must optimize for:

- speed
- clinical clarity
- information density
- predictable navigation
- minimal unnecessary taps
- fast patient access
- safe clinical actions
- strict authorization

This application can be more information-dense than the patient app.

It must still remain readable and accessible.

---

# App Scope

HealthStaff may contain features such as:

- authentication
- staff profile
- assigned patients
- patient search
- patient details
- appointments
- clinical schedules
- consultations
- medical records
- diagnoses
- prescriptions
- laboratory information
- medical observations
- clinical history
- notifications
- alerts
- staff workflows
- authorized clinical actions

Only implement functionality supported by the backend and permissions.

---

# Forbidden Scope

Do not expose functionality to a staff role unless that role has backend permission.

Never assume:

```text
doctor == administrator
```

or:

```text
health staff == unrestricted access
```

Do not implement administrative capabilities merely because the user works in healthcare.

Administrative modules should only appear if the backend explicitly authorizes the authenticated role.

---

# Backend Is Source of Truth

Before implementing anything:

1. Inspect the FastAPI route.
2. Inspect request schema.
3. Inspect response schema.
4. Inspect authentication.
5. Inspect role requirements.
6. Inspect permissions.
7. Inspect enums.
8. Inspect nullable fields.
9. Inspect validation.
10. Inspect error responses.

Never invent:

- endpoints
- fields
- clinical relationships
- permissions
- roles
- enums
- IDs
- validation rules

Report backend/frontend mismatches instead.

---

# Technology

Use the project's existing stack.

Expected:

- React Native
- Expo
- Expo Router
- TypeScript
- REST
- FastAPI
- Git
- GitHub

Avoid unnecessary dependencies.

---

# Architecture

Organize primarily by feature.

Preferred structure:

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
└── (staff)/

src/
├── app/
│   ├── config/
│   └── providers/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── patients/
│   ├── appointments/
│   ├── consultations/
│   ├── medical-records/
│   ├── diagnoses/
│   ├── prescriptions/
│   ├── laboratory/
│   ├── notifications/
│   └── profile/
│
└── shared/
    ├── api/
    ├── components/
    ├── constants/
    ├── hooks/
    ├── types/
    └── utils/
```

Do not create large global type-based folders containing unrelated modules.

---

# Feature Structure

Example:

```text
features/patients/
├── api/
├── components/
├── hooks/
├── schemas/
├── screens/
├── types/
└── tests/
```

Keep feature code together.

---

# Dependency Direction

Preferred:

```text
Screen
  ↓
Component
  ↓
Hook
  ↓
Feature API
  ↓
Shared API Client
  ↓
FastAPI
```

Never place raw networking logic throughout screens.

---

# API

Centralize the API client.

Example:

```text
src/shared/api/client.ts
```

Feature-specific endpoints belong inside:

```text
features/<feature>/api/
```

Use environment configuration:

```env
EXPO_PUBLIC_API_URL=
```

Never scatter backend URLs across files.

---

# Authentication

Centralize:

- login
- logout
- access token
- refresh token if supported
- session restoration
- current staff member
- role
- permissions
- unauthorized responses
- expired session behavior

Do not manually handle authentication inside screens.

---

# Authorization

Authorization is critical.

Before displaying or enabling an action, determine whether the authenticated role has permission.

Examples:

```text
view patient
edit patient
create diagnosis
create prescription
view medical record
modify consultation
manage appointment
```

The frontend should use permissions for UX.

The backend remains responsible for enforcing security.

Never assume hiding a button provides security.

---

# Patient Access

Staff must only see patients they are authorized to access.

Never bypass backend scoping.

Do not request unrestricted patient datasets unless the corresponding endpoint and role allow it.

Patient identifiers must never become an authorization mechanism by themselves.

---

# Navigation

Navigation should reflect authenticated role and permissions.

Conceptually:

```text
Root
├── Public
│   └── Login
│
└── Staff
    ├── Dashboard
    ├── Patients
    ├── Appointments
    ├── Clinical
    ├── Notifications
    └── Profile
```

Do not expose routes that the current role cannot use.

---

# Dashboard

The HealthStaff dashboard should prioritize operational information.

When supported:

- today's appointments
- next patients
- pending consultations
- relevant clinical alerts
- recent activity
- unread notifications

Avoid decorative metrics without operational value.

---

# Patient Screens

Patient information should be organized for fast scanning.

Prioritize:

- patient identity
- age / birth information when supported
- relevant alerts
- appointments
- diagnoses
- medications
- history
- laboratory information
- recent consultations

Do not overload the initial patient screen with every database field.

Use progressive disclosure.

---

# Clinical Actions

Actions that change medical information require special care.

Examples:

- diagnosis creation
- prescription creation
- consultation completion
- medical note creation
- status changes

These actions must:

1. Match the backend schema.
2. Validate required information.
3. Clearly show submission state.
4. Prevent accidental duplicate submissions.
5. Handle backend errors.
6. Confirm potentially destructive operations when appropriate.

Do not fabricate clinical defaults.

---

# Forms

Clinical forms must match backend schemas exactly.

Never guess:

- dosage
- diagnosis
- medical status
- frequency
- duration
- clinical values

Do not auto-fill clinical decisions unless explicitly supported by product requirements.

---

# Dates and Scheduling

Distinguish:

```text
date
time
datetime
timezone
```

Appointment and consultation scheduling must use backend formats exactly.

Avoid fragile manual date parsing.

---

# Sensitive Medical Data

Treat all patient information as sensitive.

Never log:

- medical records
- diagnoses
- prescriptions
- laboratory results
- private patient details
- tokens
- credentials

Do not use real patient information in tests.

---

# UI States

All remote-data screens should handle:

- loading
- success
- empty
- error
- unauthorized
- network failure

Clinical forms should handle:

- idle
- validation error
- submitting
- success
- server error

Prevent duplicate submissions while a clinical mutation is pending.

---

# Information Density

HealthStaff may use denser layouts than Lumora Patient.

Prefer:

- compact cards
- grouped information
- meaningful status badges
- concise labels
- clear hierarchy

Avoid excessive whitespace that slows clinical workflows.

Do not sacrifice readability.

---

# Accessibility

Support:

- readable typography
- adequate contrast
- screen readers when applicable
- accessible touch targets
- meaningful labels
- validation messages
- non-color status indicators

---

# Design System

Centralize:

- colors
- typography
- spacing
- radii
- status styles
- component variants

HealthStaff should feel:

- clinical
- modern
- professional
- trustworthy
- efficient

It should visually belong to the same Lumora ecosystem without copying the patient UI directly.

---

# State Management

Separate server state from UI state.

Server state:

- patients
- appointments
- consultations
- prescriptions
- diagnoses
- medical records
- laboratory data

UI state:

- selected tab
- filters
- modal visibility
- temporary selections
- form interaction state

Do not globalize state unnecessarily.

---

# TypeScript

TypeScript is mandatory.

Avoid:

```ts
any
```

Use explicit types or:

```ts
unknown
```

API types must reflect FastAPI schemas.

---

# Testing

Every meaningful task requires tests.

Prioritize:

- permission checks
- authentication
- API behavior
- clinical forms
- validation
- navigation guards
- role-specific behavior
- patient scoping
- error handling
- mutation behavior

Use synthetic patient and clinical data.

---

# Permission Tests

Whenever functionality differs by role, tests should verify both:

```text
allowed role → action available
unauthorized role → action unavailable
```

Do not test only the successful permission path.

---

# Empty Directories

Use:

```text
.gitkeep
```

when establishing empty architecture directories that Git must preserve.

Example:

```text
features/consultations/api/.gitkeep
```

---

# Git

Use focused branches.

Examples:

```text
feat/staff-login
feat/patient-search
feat/consultation-flow
feat/prescriptions
fix/staff-permissions
```

Preferred commits:

```text
feat(patients): add staff patient search
feat(consultations): add consultation form
fix(auth): enforce staff role navigation
test(prescriptions): add permission coverage
```

---

# Git Worktrees

Multiple agents must work in isolated worktrees and branches.

Never allow agents to share the same working directory concurrently.

Before integration check:

```bash
git branch --show-current
git status
git log
git worktree list
```

---

# Before Implementing a Task

Determine:

1. Which staff workflow is being implemented?
2. Which backend endpoint supports it?
3. Which roles can access it?
4. Which permissions are required?
5. What request schema is used?
6. What response schema is returned?
7. Which patient scope applies?
8. Which screen owns the interaction?
9. Which existing components can be reused?
10. Which tests are required?

Only then implement.

---

# No Fake Implementations

Do not ship:

- fake patients
- fake medical histories
- hard-coded successful mutations
- placeholder diagnoses
- fake prescriptions
- static API responses

Mocks belong only in tests or explicitly defined development environments.

---

# Backend Mismatches

When requirements and backend disagree, report:

```text
Frontend requirement:
...

Backend currently supports:
...

Missing:
...

Required decision:
...
```

Never fabricate backend behavior.

---

# Definition of Done

A task is complete only when:

- [ ] It belongs in HealthStaff.
- [ ] FastAPI contract is respected.
- [ ] Role access is correct.
- [ ] Permission rules are correct.
- [ ] Patient scoping is respected.
- [ ] TypeScript types are correct.
- [ ] Loading states exist.
- [ ] Empty states exist where applicable.
- [ ] Error states exist.
- [ ] Clinical forms match backend schemas.
- [ ] Duplicate submissions are prevented.
- [ ] Sensitive data is not unnecessarily logged.
- [ ] Relevant tests were added.
- [ ] Permission tests exist where applicable.
- [ ] Tests pass.
- [ ] Type checking passes.
- [ ] Linting passes.
- [ ] Existing functionality remains intact.
- [ ] Backend/frontend mismatches are documented.
- [ ] Intended mobile platforms were tested.

---

# Final Agent Report

After completing a task:

```text
What I changed:
- ...

Files changed:
- ...

Tests:
- ...

Permissions affected:
- ...

Backend dependencies or mismatches:
- ...

Remaining work:
- ...
```

Keep it concise.

---

# Primary Principle

This is the healthcare staff application.

Optimize for:

```text
clinical correctness
→ authorization
→ privacy
→ speed
→ clarity
```

When uncertain:

```text
inspect backend
→ inspect role permissions
→ inspect clinical workflow
→ implement smallest correct solution
→ test authorized and unauthorized paths
```