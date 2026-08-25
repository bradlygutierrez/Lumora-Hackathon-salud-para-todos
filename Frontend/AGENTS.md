# AGENTS.md

## Project Context

This repository contains the **React Native frontend for Lumora HN2026**, a healthcare platform.

The frontend consumes the existing **FastAPI backend** backed by **PostgreSQL / Neon**.

The backend, database schema, API contracts, enums, permissions, and business rules are the source of truth.

The application has three main user experiences:

1. **Patient / User**
2. **Medical Staff**
3. **Administration**

If the backend defines different role names, permissions, or enums, always use the backend definitions.

---

# Core Rule

## Never invent backend behavior

Before implementing any screen, form, hook, API call, or feature:

1. Inspect the corresponding FastAPI endpoint.
2. Inspect its request schema.
3. Inspect its response schema.
4. Inspect required fields.
5. Inspect enums and allowed values.
6. Inspect authentication and permissions.
7. Inspect nullable and optional fields.
8. Inspect error responses.

The frontend must match the backend contract exactly.

Never invent:

* endpoints
* database fields
* enum values
* IDs
* relationships
* permissions
* request properties
* response properties
* validation rules

If something required by the UI does not exist in the backend, document the mismatch instead of fabricating it.

---

# Technology

Primary stack:

* React Native
* TypeScript
* REST API
* FastAPI backend
* PostgreSQL / Neon
* Git
* GitHub

Use the libraries already installed in the project.

Do not introduce a new dependency when the existing stack can solve the problem adequately.

Before adding a dependency, verify:

* maintenance status
* React Native compatibility
* TypeScript support
* bundle impact
* license
* whether an existing dependency already solves the problem

---

# TypeScript

TypeScript is mandatory.

Do not use `any` unless there is a documented technical reason.

Prefer:

```ts
unknown
```

over:

```ts
any
```

All important entities must have explicit types.

API response types must reflect the actual FastAPI schemas.

Do not manually duplicate types in multiple features when they represent the same API entity.

---

# Architecture

Organize the frontend primarily **by feature**, not by file type.

Preferred structure:

```text
src/
├── app/
│   ├── navigation/
│   ├── providers/
│   └── config/
│
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── screens/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── tests/
│   │
│   ├── patients/
│   ├── appointments/
│   ├── medical-records/
│   ├── prescriptions/
│   ├── notifications/
│   └── ...
│
├── shared/
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   └── tests/
│
└── assets/
```

A feature should contain the code that changes together.

Example:

```text
features/appointments/
├── api/
│   └── appointments.api.ts
├── components/
│   ├── AppointmentCard.tsx
│   └── AppointmentStatus.tsx
├── hooks/
│   └── useAppointments.ts
├── screens/
│   ├── AppointmentsScreen.tsx
│   └── AppointmentDetailScreen.tsx
├── schemas/
│   └── appointment.schema.ts
├── types/
│   └── appointment.types.ts
└── tests/
```

Do not create giant global folders containing every screen, hook, service, and type in the application.

---

# Dependency Direction

Feature UI may depend on:

```text
screen
  ↓
components
  ↓
hooks
  ↓
api
```

Shared infrastructure may be used by features.

Avoid circular dependencies.

A shared module must never depend on a specific feature.

Bad:

```text
shared/components/
    ↓
features/appointments/
```

Good:

```text
features/appointments/
    ↓
shared/components/
```

---

# API Layer

Do not place raw HTTP requests directly inside screens.

Bad:

```tsx
function Screen() {
  useEffect(() => {
    fetch(...)
  }, [])
}
```

Preferred:

```text
Screen
 ↓
Hook
 ↓
Feature API service
 ↓
Shared API client
 ↓
FastAPI
```

Example:

```text
features/appointments/api/appointments.api.ts
```

uses:

```text
shared/api/client.ts
```

---

# API Configuration

The API base URL must come from environment configuration.

Never hard-code:

```ts
http://localhost:8000
```

throughout the application.

Centralize API configuration.

Example:

```text
shared/api/client.ts
```

Environment-specific values must not be scattered across components.

---

# Authentication

Authentication logic must be centralized.

Screens must not manually implement token handling.

The authentication layer should manage:

* login
* logout
* session restoration
* access token
* refresh token if supported
* expired sessions
* unauthorized responses
* current user
* current role
* permissions

Sensitive authentication information must use secure storage supported by the project's React Native environment.

Do not store sensitive tokens in plain AsyncStorage unless the architecture explicitly requires it and the risk has been accepted.

---

# Authorization

UI visibility is not security.

Hiding a button does not replace backend authorization.

The frontend should respect permissions for UX purposes, but FastAPI remains responsible for enforcing access.

Example:

```text
Patient
Medical Staff
Administrator
```

Each role should have its own navigation and permitted actions.

Do not expose screens merely because their routes exist.

---

# Navigation

Separate navigation according to authentication state and role.

Conceptually:

```text
Root
├── Public
│   ├── Login
│   ├── Register
│   └── Password Recovery
│
└── Authenticated
    ├── Patient
    ├── Medical Staff
    └── Administration
```

Do not create one giant navigator containing every screen for every role.

Reuse screens only when the workflow and permissions genuinely match.

---

# Screens

Every screen must have a clear responsibility.

Avoid screens containing:

* networking
* validation
* business logic
* navigation logic
* large UI trees
* data transformations

all inside one component.

Extract these responsibilities when they become meaningful.

---

# UI States

Any screen that retrieves remote information must consider:

```text
loading
success
empty
error
unauthorized
offline / network failure
```

Do not implement only the successful state.

Forms must also support:

```text
idle
submitting
success
validation error
server error
```

---

# Forms

Frontend forms must use the same rules as the FastAPI schemas whenever possible.

Validate:

* required fields
* formats
* minimum values
* maximum values
* dates
* enums
* relationships
* nullable values

Client-side validation improves UX.

Backend validation remains authoritative.

Never silently transform invalid information into something accepted by the API.

---

# Dates

Dates and times require special care because Lumora handles medical information and appointments.

Always distinguish:

```text
date
time
datetime
timezone
```

Do not assume they are interchangeable.

Avoid manually parsing dates with fragile string operations.

API serialization must match the backend format.

---

# Medical Data

Treat medical information as sensitive data.

Never:

* log patient medical data unnecessarily
* print tokens
* expose private records in debug output
* store sensitive records permanently without a requirement
* include real patient data in test fixtures
* expose one patient's information to another user

Use fake data for tests.

---

# State Management

Separate:

```text
Server State
```

from:

```text
Local UI State
```

Server state includes:

* patients
* appointments
* medical records
* prescriptions
* notifications
* backend entities

Local state includes:

* modal visibility
* selected tab
* temporary filters
* form interaction state

Do not create global state for values that belong to one component.

---

# Components

Create reusable components when reuse is real.

Do not prematurely create generic abstractions.

Preferred reusable UI examples:

```text
Button
Input
Select
DatePicker
LoadingState
EmptyState
ErrorState
ScreenContainer
Modal
Card
Avatar
Badge
```

Feature-specific components should remain inside their feature.

---

# Design System

Avoid arbitrary styling on every screen.

Centralize:

* colors
* typography
* spacing
* radii
* shadows
* sizing
* common component variants

Lumora should maintain consistent visual language across all three user experiences.

The interface should feel approachable for normal users while remaining efficient for medical staff.

---

# UX

Prioritize:

1. clarity
2. accessibility
3. speed
4. predictable interactions
5. readable information hierarchy

Medical interfaces must not rely exclusively on color to communicate status.

Important actions should have clear labels.

Avoid unnecessarily technical database terminology in patient-facing interfaces.

---

# Accessibility

Interactive components should support accessibility whenever applicable.

Consider:

* touch target size
* screen reader labels
* contrast
* font scaling
* form labels
* validation messages
* disabled states
* focus behavior

---

# Loading

Do not block the entire application unnecessarily.

Prefer loading only the area whose information is being retrieved.

Avoid fake delays.

---

# Errors

Never expose raw backend exceptions directly to users.

Translate known errors into useful UI messages.

Keep technical information available for development when appropriate without exposing sensitive data.

---

# Logging

Development logging is allowed when useful.

Never log:

* passwords
* access tokens
* refresh tokens
* private medical information
* complete authentication responses
* secrets

Remove unnecessary debug logs before completing a task.

---

# Environment Variables

Never commit:

```text
API keys
tokens
passwords
database credentials
private URLs
secrets
```

Use environment configuration.

Provide `.env.example` when environment variables are required.

Example:

```env
API_BASE_URL=
```

Do not place real credentials inside `.env.example`.

---

# Testing

## Every task requires tests

Every feature, fix, endpoint integration, or meaningful behavior must include corresponding tests.

A task is not complete if implementation changes behavior but no relevant test is added or updated.

Tests should live close to the feature when practical.

Example:

```text
features/auth/tests/
features/appointments/tests/
```

Test important behavior rather than implementation details.

Prioritize:

* validation
* API integration behavior
* hooks
* permission logic
* navigation guards
* forms
* critical components
* error states

Do not write tests solely to increase coverage.

---

# Test Data

Tests must never depend on production data.

Use:

* fixtures
* factories
* mocked API responses
* controlled test users

Test data should match actual backend schemas.

---

# Before Implementing a Task

Every agent must first determine:

1. What feature is being modified?
2. Which backend endpoint is involved?
3. What request schema does it use?
4. What response schema does it return?
5. Which role can access it?
6. Which screen owns the interaction?
7. Does an existing component already solve part of the task?
8. What tests must be added or updated?

Only then start implementation.

---

# Agent Rules

Agents must inspect existing code before editing.

Do not assume a file or component does not exist.

Search first.

Prefer modifying the smallest necessary surface.

Do not refactor unrelated code while implementing a feature.

Do not silently change architectural decisions.

Do not remove working functionality unless the task explicitly requires it.

Do not modify the backend from this repository.

If a frontend requirement exposes a backend problem, document it.

---

# No Fake Implementations

Do not mark unfinished functionality as complete using:

```ts
// TODO
```

fake buttons, dummy network calls, static responses, or hard-coded success states.

Mocks are acceptable only in tests or explicitly defined development environments.

---

# Backend Mismatches

When frontend requirements and FastAPI disagree, report the mismatch clearly.

Example:

```text
Frontend requires:
GET /appointments/:id

Backend currently exposes:
GET /appointments

Required action:
Backend endpoint or frontend flow needs adjustment.
```

Do not invent the missing endpoint.

---

# Git

Use small, focused branches.

Examples:

```text
feat/auth-login
feat/patient-profile
feat/appointments-list
fix/session-expiration
test/appointments
```

Commits should represent meaningful units of work.

Avoid commits such as:

```text
changes
stuff
update
fix things
```

Preferred:

```text
feat(auth): add login flow
fix(appointments): handle cancelled appointments
test(profile): add patient form validation tests
```

---

# Git Worktrees

When multiple agents work simultaneously, use Git Worktrees.

Each agent must work on:

* its own branch
* its own worktree
* its own working directory

Never allow two agents to modify the same working directory concurrently.

Before integration verify:

```bash
git branch --show-current
git status
git log
git worktree list
```

Merge only clean and tested work.

---

# Package Manager

Use the package manager already established by the repository.

If the repository contains:

```text
package-lock.json
```

use npm.

If it contains:

```text
pnpm-lock.yaml
```

use pnpm.

If it contains:

```text
yarn.lock
```

use Yarn.

Do not switch package managers unnecessarily.

---

# Commands

Before finishing a task, run the relevant existing project scripts.

Typically:

```bash
npm run lint
npm run typecheck
npm test
```

Use the actual scripts defined in `package.json`.

Do not invent scripts that the project does not provide.

---

# Definition of Done

A task is complete only when:

* [ ] The implementation matches the FastAPI contract.
* [ ] TypeScript types are correct.
* [ ] The correct role can access the functionality.
* [ ] Unauthorized roles cannot access it through normal navigation.
* [ ] Loading state exists.
* [ ] Empty state exists when applicable.
* [ ] Error state exists.
* [ ] Validation matches backend requirements.
* [ ] No secrets are hard-coded.
* [ ] No sensitive medical data is unnecessarily logged.
* [ ] Relevant tests were added or updated.
* [ ] Tests pass.
* [ ] Type checking passes.
* [ ] Linting passes.
* [ ] No unnecessary debug code remains.
* [ ] Existing functionality was not broken.
* [ ] Backend/frontend mismatches are documented.
* [ ] The implementation works on the intended mobile platforms.

---

# Final Agent Report

After completing a task, report only:

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

Lumora is a healthcare application.

Correctness, privacy, predictable behavior, accessibility, and consistency with the backend are more important than clever abstractions or visual complexity.

When uncertain:

```text
inspect the backend
→ inspect existing frontend conventions
→ implement the smallest correct solution
→ test it
```
