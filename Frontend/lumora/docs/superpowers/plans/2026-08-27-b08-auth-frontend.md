# B08 Auth Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo B08 de autenticación de Lumora (Paciente/Cuidador) contra el contrato FastAPI B08, manteniendo intacta la base B07.

**Architecture:** Expo Router conserva las rutas en `src/app`; toda la lógica de autenticación vive en `src/features/auth`. `AuthApiService` encapsula HTTP, Zustand guarda sesión/challenge/wizard, TanStack Query maneja operaciones remotas, React Hook Form + Zod manejan formularios y SecureStore persiste únicamente los tokens finales.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Expo Router, NativeWind, Zustand, TanStack Query, React Hook Form, Zod, Axios, Expo SecureStore, Jest.

**Spec:** `docs/superpowers/specs/2026-08-27-b08-auth-frontend-design.md` (grounded in backend commit `2159dd8`).

## Global Constraints

- Base API lógica: `/api/v1`; `env.apiV1Url` evita duplicarla.
- Backend source of truth: commit `2159dd8d8a69e7720eb64deb8d91bfec4bf8e063`.
- MFA: solo `totp` / Authenticator App. SMS no se renderiza.
- Registro público B08 crea Paciente; no inventar registro de Cuidador.
- Password: 8–128, mayúscula, minúscula, número y símbolo.
- No persistir challenge MFA, código de email ni datos del wizard en SecureStore.
- Persistir solamente `accessToken` y `refreshToken` finales.
- Mantener errores de dominio `{error:{code,message}}`; mapear 429 a `RATE_LIMITED`.
- No modificar Backend ni `lumora-health-staff`.
- Cada cambio funcional debe tener test.

---

### Task 1: Tipos y schemas B08

**Files:**
- Create: `src/features/auth/types/auth.types.ts`
- Create: `src/features/auth/schemas/auth.schemas.ts`
- Test: `src/features/auth/tests/auth-schemas.test.ts`

**Interfaces:**
- Produces: `LoginResponse`, `PatientRegistrationRequest`, `SessionRead`, `MfaMethod`, `MfaSetupResponse`.
- Produces: `loginSchema`, `registerAccountSchema`, `registerPersonalSchema`, `registerEmergencySchema`, `verifyEmailSchema`, `resetPasswordSchema`, `mfaSchema`, `changePasswordSchema`.

- [ ] **Step 1: Verify the password policy test fails without B08 validation**

```ts
expect(
  registerAccountSchema.safeParse({
    username: 'bradly',
    email: 'b@example.com',
    phone: '88888888',
    password: 'weakpass',
    confirmPassword: 'weakpass',
  }).success,
).toBe(false);
```

- [ ] **Step 2: Implement the exact policy and six-digit code schema**

```ts
const strongPassword = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/\d/)
  .regex(/[^A-Za-z0-9]/);

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
```

- [ ] **Step 3: Run schema tests**

Run:

```bash
npx jest auth-schemas.test.ts --runInBand
```

Expected: all B08 schema tests PASS.

---

### Task 2: Registro multipaso y DTO transaccional

**Files:**
- Create: `src/features/auth/store/registration-store.ts`
- Create: `src/app/(auth)/register/account.tsx`
- Create: `src/app/(auth)/register/personal.tsx`
- Create: `src/app/(auth)/register/emergency.tsx`
- Create: `src/app/(auth)/register/review.tsx`
- Create: `src/features/auth/components/RegistrationProgress.tsx`
- Create: `src/features/auth/components/OptionSelectField.tsx`
- Test: `src/features/auth/tests/registration-store.test.ts`

**Interfaces:**
- Consumes: `RegisterAccountForm`, `RegisterPersonalForm`, `RegisterEmergencyForm`.
- Produces: `useRegistrationStore().buildRequest(true, true): PatientRegistrationRequest`.

- [ ] **Step 1: Build state locally, without backend calls in steps 1–3**

```ts
setAccount(values);
router.push('/(auth)/register/personal');
```

- [ ] **Step 2: Map camelCase form fields to backend snake_case once**

```ts
return {
  first_names: personal.firstNames,
  last_names: personal.lastNames,
  birth_date: personal.birthDate,
  sex_id: personal.sexId,
  blood_type_id: personal.bloodTypeId,
  accept_terms: true,
  accept_privacy: true,
};
```

- [ ] **Step 3: Only step 4 sends the transaction**

```ts
mutationFn: () => authApi.register(buildRequest(true, true));
```

- [ ] **Step 4: Run registration store test**

```bash
npx jest registration-store.test.ts --runInBand
```

Expected: DTO contains normalized username/email and exact backend field names.

---

### Task 3: AuthApiService, login, refresh and MFA challenge

**Files:**
- Modify: `src/features/auth/api/auth-api.ts`
- Modify: `src/features/auth/store/auth-store.ts`
- Create: `src/features/auth/hooks/useAuth.ts`
- Replace: `src/app/(auth)/login.tsx`
- Create: `src/app/(auth)/mfa.tsx`
- Test: `src/features/auth/tests/auth-api.test.ts`

**Interfaces:**
- `AuthApiService.login(login, password): Promise<LoginResponse>`
- `AuthApiService.verifyMfa(challengeToken, code): Promise<StoredSession>`
- `AuthApiService.refreshSession(refreshToken): Promise<StoredSession>`
- `useAuthStore.pendingMfa: {challengeToken, expiresIn} | null`

- [ ] **Step 1: Implement discriminated login**

```ts
if (response.mfa_required) {
  setPendingMfa({
    challengeToken: response.challenge_token,
    expiresIn: response.expires_in,
  });
  router.push('/(auth)/mfa');
  return;
}
```

- [ ] **Step 2: Store final tokens only when MFA is not required**

```ts
await setSession({
  accessToken: response.access_token,
  refreshToken: response.refresh_token,
});
```

- [ ] **Step 3: Verify TOTP creates the final session**

```ts
const session = await authApi.verifyMfa(challengeToken, code);
await setSession(session);
```

- [ ] **Step 4: Preserve refresh isolation**

```ts
return this.publicPost('/auth/refresh', {
  refresh_token: refreshToken,
});
```

- [ ] **Step 5: Run service tests**

```bash
npx jest auth-api.test.ts --runInBand
```

Expected: normal login, MFA login and refresh mapping PASS.

---

### Task 4: Email verification and password recovery

**Files:**
- Create: `src/features/auth/components/VerificationCodeInput.tsx`
- Create: `src/features/auth/components/PasswordField.tsx`
- Create: `src/features/auth/components/PasswordRequirements.tsx`
- Create: `src/app/(auth)/verify-email.tsx`
- Create: `src/app/(auth)/forgot-password.tsx`
- Create: `src/app/(auth)/reset-password.tsx`
- Modify: `src/shared/api/api-error.ts`
- Test: `src/shared/api/tests/api-error-b08.test.ts`

**Interfaces:**
- `verifyEmail(email, code)`
- `resendVerification(email)`
- `forgotPassword(email)`
- `resetPassword(token, newPassword)`

- [ ] **Step 1: Verify only six digits are accepted**

```ts
onChange(text.replace(/\D/g, '').slice(0, 6));
```

- [ ] **Step 2: Preserve backend resend cooldown**

```ts
case 429:
  return 'RATE_LIMITED';
```

- [ ] **Step 3: Read reset token from Expo Router params**

```ts
const params = useLocalSearchParams<{ token?: string }>();
```

- [ ] **Step 4: Run 429 mapping test**

```bash
npx jest api-error-b08.test.ts --runInBand
```

Expected: 429 becomes `RATE_LIMITED` and retains backend message.

---

### Task 5: Authenticated Security Center

**Files:**
- Create: `src/app/(app)/security/index.tsx`
- Create: `src/app/(app)/security/change-password.tsx`
- Create: `src/app/(app)/security/mfa.tsx`
- Create: `src/app/(app)/security/sessions.tsx`
- Modify: `src/app/(app)/(tabs)/profile.tsx`
- Test: `src/features/auth/tests/auth-security-api.test.ts`

**Interfaces:**
- `changePassword(current, next)` -> `/auth/change-password`
- `sessions()` -> `/auth/sessions`
- `revokeSession(id)` -> `/auth/sessions/{id}`
- `logoutOthers()` -> `/auth/logout-others`
- `mfaMethods()` -> `/auth/mfa/methods`
- `setupMfa(methodId)` -> `/auth/mfa/setup`
- `disableMfa(configuredId)` -> `/auth/mfa/{configuredId}`

- [ ] **Step 1: Display only backend-safe session metadata**

```tsx
<Text>{session.device_name}</Text>
<Text>{session.platform}</Text>
<Text>{session.ip_address}</Text>
```

- [ ] **Step 2: Do not invent SMS or geolocation**

```ts
const totp = methods.data?.find((method) => method.nombre === 'totp');
```

- [ ] **Step 3: Clear local state after current/all logout**

```ts
await clearSession();
queryClient.clear();
router.replace('/(auth)/login');
```

- [ ] **Step 4: Run security endpoint tests**

```bash
npx jest auth-security-api.test.ts --runInBand
```

Expected: dedicated change-password, session revoke and logout-others paths PASS.

---

### Task 6: Full verification and mobile smoke test

**Files:**
- Review: all B08 files listed in `FILE_TREE.txt`.

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all B07 + B08 suites PASS.

- [ ] **Step 3: Start Expo from a clean Metro cache**

```bash
npx expo start --clear
```

- [ ] **Step 4: Smoke test on iPhone**

Verify manually:
1. Wrong login shows backend error.
2. Valid non-MFA login reaches app tabs.
3. MFA login reaches TOTP screen before any tokens are persisted.
4. Registration completes all four steps and opens email verification.
5. Six-digit verification returns to Login.
6. Forgot/reset password flow accepts backend token.
7. Security Center lists sessions and can revoke one remote session.
8. Logout clears SecureStore and TanStack cache.

- [ ] **Step 5: Commit only after verification**

```bash
git add Frontend/lumora
git commit -m "feat(auth): implement B08 mobile authentication flows"
```
