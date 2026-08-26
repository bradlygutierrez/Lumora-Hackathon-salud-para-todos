# AGENTS.md

## Project

This repository is the **Lumora patient-facing React Native application**.

This app is intended for patients and general users.

It consumes the existing Lumora **FastAPI backend** using the backend schemas, endpoints, enums, permissions, and validation rules as the source of truth.

Do not implement medical-staff workflows in this application.

---

# Main User

The primary user is:

```text
Patient / General User
```

The interface must prioritize:

* simplicity
* accessibility
* clear language
* low cognitive load
* understandable medical information
* easy navigation
* mobile-first UX

Avoid exposing internal medical terminology when a patient-friendly label can be used.

---

# App Scope

Lumora may contain patient-facing features such as:

* authentication
* registration
* profile
* personal information
* appointments
* appointment requests
* appointment history
* medical history visible to the patient
* prescriptions
* medications
* laboratory results
* diagnoses visible to the patient
* notifications
* reminders
* healthcare center information
* doctor information
* emergency information if supported
* settings
* security
* logout

Only implement features supported by the backend.

Never invent screens solely because they seem useful.

---

# Forbidden Scope

This application must not contain staff-only workflows such as:

* managing multiple patients
* editing another patient's clinical record
* medical consultations
* issuing diagnoses
* creating prescriptions
* approving medical procedures
* managing clinical queues
* administrative dashboards
* doctor schedules intended for staff management
* internal medical notes
* institutional administration
* medical staff permissions

Those belong to:

```text
Frontend/Lumora-HealthStaff
```

---

# Backend Is Source of Truth

Before implementing any screen or feature:

1. Inspect the FastAPI endpoint.
2. Inspect request schemas.
3. Inspect response schemas.
4. Inspect enums.
5. Inspect required fields.
6. Inspect nullable fields.
7. Inspect validation.
8. Inspect authentication requirements.
9. Inspect authorization requirements.
10. Inspect known error responses.

Never invent:

* endpoints
* fields
* IDs
* relationships
* enums
* permissions
* validation rules
* API responses

If the frontend requirement does not match the backend, report the mismatch.

---

# Technology

Use the existing project stack.

Expected core stack:

* React Native
* Expo
* Expo Router
* TypeScript
* REST
* FastAPI
* Git
* GitHub

Do not introduce unnecessary dependencies.

---

# Architecture

Organize application logic primarily by feature.

Preferred structure:

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
└── (patient)/

src/
├── app/
│   ├── config/
│   └── providers/
│
├── features/
│   ├── auth/
│   ├── profile/
│   ├── appointments/
│   ├── medical-records/
│   ├── prescriptions/
│   ├── laboratory/
│   ├── notifications/
│   └── settings/
│
└── shared/
    ├── api/
    ├── components/
    ├── constants/
    ├── hooks/
    ├── types/
    └── utils/
```

Do not create one giant global `screens/`, `services/`, or `hooks/` directory containing unrelated features.

---

# Feature Structure

A feature should preferably follow:

```text
features/appointments/
├── api/
├── components/
├── hooks/
├── schemas/
├── screens/
├── types/
└── tests/
```

Files that change together should live together.

---

# Dependency Direction

Preferred direction:

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

Do not place raw `fetch()` calls directly inside screens.

---

# API

Centralize HTTP communication.

Example:

```text
src/shared/api/client.ts
```

Feature-specific requests belong inside:

```text
src/features/<feature>/api/
```

Never hard-code API URLs throughout the application.

Use environment configuration such as:

```env
EXPO_PUBLIC_API_URL=
```

---

# Authentication

Authentication must be centralized.

The auth system should manage:

* login
* logout
* session restoration
* current user
* access token
* refresh token if supported
* expired sessions
* unauthorized responses

Screens must not manually manage tokens.

Sensitive credentials must use secure storage appropriate for Expo / React Native.

---

# Patient Authorization

The patient must only access resources belonging to the authenticated patient unless the backend explicitly allows otherwise.

Never trust a patient ID supplied manually by the UI as authorization.

Backend authorization remains authoritative.

Do not expose another patient's:

* appointments
* records
* prescriptions
* laboratory results
* profile
* private medical information

---

# Navigation

Patient navigation should remain simple.

Conceptually:

```text
Root
├── Public
│   ├── Login
│   ├── Register
│   └── Password Recovery
│
└── Patient
    ├── Home
    ├── Appointments
    ├── Health
    ├── Notifications
    └── Profile
```

Use the actual product requirements and backend capabilities when defining routes.

---

# Patient Home

The patient home should prioritize information the user can immediately understand and act upon.

Examples when supported:

* upcoming appointment
* reminders
* recent results
* active medications
* unread notifications

Do not turn the patient home into an administrative dashboard.

---

# Forms

Forms must match backend schemas exactly.

Validate:

* required fields
* formats
* dates
* enums
* minimum/maximum values
* nullable values

Use understandable validation messages.

Bad:

```text
422 validation_error.body.2
```

Good:

```text
Enter a valid date of birth.
```

The backend remains authoritative.

---

# Medical Information UX

Medical information must be presented carefully.

Prefer:

```text
Medication
Next appointment
Laboratory result
Doctor
Diagnosis
```

instead of exposing database or implementation terminology.

Do not simplify information to the point of changing its clinical meaning.

---

# Sensitive Data

Medical and personal information is sensitive.

Never log:

* passwords
* access tokens
* refresh tokens
* medical histories
* diagnoses
* laboratory results
* patient identifiers unnecessarily

Never use real patient data in tests.

---

# UI States

Remote-data screens must handle:

* loading
* success
* empty
* error
* unauthorized
* network failure

Forms must handle:

* idle
* validation error
* submitting
* success
* server error

---

# Accessibility

Patient-facing interfaces must consider:

* readable font sizes
* font scaling
* strong contrast
* screen-reader labels
* accessible touch targets
* understandable labels
* clear errors

Never use color as the only indication of medical status.

---

# Design System

Centralize:

* colors
* spacing
* typography
* radii
* shadows
* component variants

The Lumora patient application should feel:

* calm
* approachable
* modern
* trustworthy
* easy to understand

Avoid interfaces that resemble complex hospital administration software.

---

# State Management

Separate server state from UI state.

Server state:

* appointments
* prescriptions
* medical records
* laboratory results
* notifications

UI state:

* modal visibility
* active filters
* selected tab
* temporary form state

Do not put local component state into global stores unnecessarily.

---

# TypeScript

TypeScript is mandatory.

Avoid:

```ts
any
```

Prefer explicit types or:

```ts
unknown
```

API types must match actual FastAPI schemas.

---

# Testing

Every meaningful task requires tests.

Test:

* API integrations
* forms
* validation
* authentication
* authorization
* hooks
* navigation guards
* critical UI states

Use fake medical data.

Do not write tests only to increase coverage numbers.

---

# Empty Directories

Git does not track empty directories.

When establishing architecture before files exist, use:

```text
.gitkeep
```

Example:

```text
features/appointments/api/.gitkeep
```

Remove `.gitkeep` once real files exist in the directory if desired.

---

# Git

Use focused branches.

Examples:

```text
feat/patient-login
feat/patient-appointments
feat/patient-profile
fix/patient-session
```

Preferred commit format:

```text
feat(auth): add patient login flow
fix(appointments): handle empty appointment list
test(profile): add patient profile validation tests
```

---

# Multi-Agent Work

When multiple agents work simultaneously, use Git Worktrees.

Each agent must have:

* its own worktree
* its own branch
* its own working directory

Never allow multiple agents to modify the same working directory simultaneously.

---

# Before Implementing a Task

Determine:

1. Which patient feature is being modified?
2. Which FastAPI endpoint supports it?
3. Which request schema is required?
4. Which response schema is returned?
5. Is the authenticated patient allowed to access it?
6. Which route owns the interaction?
7. Does an existing component already solve part of the problem?
8. Which tests must be added?

Then implement.

---

# No Fake Implementations

Do not mark functionality complete using:

* hard-coded success
* fake API responses
* disabled buttons pretending to work
* static placeholder patient records
* TODO-only implementations

Mocks are allowed only in tests or explicitly defined development environments.

---

# Definition of Done

A task is complete only when:

* [ ] It belongs in the patient application.
* [ ] It matches the FastAPI contract.
* [ ] Patient permissions are respected.
* [ ] TypeScript types are correct.
* [ ] Loading state is handled.
* [ ] Empty state is handled when applicable.
* [ ] Error state is handled.
* [ ] Forms match backend validation.
* [ ] Sensitive data is not unnecessarily logged.
* [ ] Tests were added or updated.
* [ ] Tests pass.
* [ ] Type checking passes.
* [ ] Linting passes.
* [ ] Existing functionality was not broken.
* [ ] Backend/frontend mismatches are documented.
* [ ] The feature works on the intended mobile platforms.

---

# Final Agent Report

After completing a task report:

```text
What I changed:
- ...

Files changed:
- ...

Tests:
- ...

Backend dependencies or mismatches:
- ...

Remaining work:
- ...
```

Keep the report concise.

---

# Primary Principle

This is the patient application.

Optimize for:

```text
clarity
→ privacy
→ accessibility
→ correctness
→ simplicity
```

When uncertain:

```text
inspect backend
→ inspect patient requirements
→ inspect existing frontend conventions
→ implement smallest correct solution
→ test
```
