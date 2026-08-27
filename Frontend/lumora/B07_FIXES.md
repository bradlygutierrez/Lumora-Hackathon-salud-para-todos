# B07 fixes applied

## Root causes found

1. `app/` and `src/app/` existed at the same time. Expo Router uses `src/app`, but TypeScript was compiling the stale Expo template under root `app/` too.
2. The old root `components/`, `constants/`, and `hooks/` still imported aliases such as `@/components/...`; after the alias was changed to `./src/*`, those imports pointed to files that did not exist.
3. Several dependencies and `.env` had been installed/created in `Frontend/` instead of `Frontend/lumora/`.
4. `AuthBootstrap.tsx` accidentally contained a second RootLayout instead of the session bootstrap component.
5. `src/app/_layout.tsx` rendered `<AuthBootstrap />` separately instead of wrapping the navigation tree.
6. The private `(app)/(tabs)` routes did not exist inside `src/app`.
7. `GlobalLandingIndicator.tsx` had a filename typo while exporting `GlobalLoadingIndicator`.
8. `ApiError` did not understand the backend's real domain error shape: `{ "error": { "code", "message" } }`.
9. The backend is mounted under `/api/v1`, but the HTTP client only used the host URL.
10. Query lifecycle was creating a new manager instead of keeping one manager instance.

## Before running

Run commands from **Frontend/lumora**, not from `Frontend`:

```bash
cd Frontend/lumora
npm install
npx expo start --clear
```

The `.env` file belongs in `Frontend/lumora/.env`:

```env
EXPO_PUBLIC_API_URL=https://backend-3d83d7df.fastapicloud.dev
```

## Remove accidental parent package

If these files exist because `npm install` was run from `Frontend/`, delete them after confirming neither app uses them:

```text
Frontend/package.json
Frontend/package-lock.json
Frontend/node_modules/
Frontend/.env
```

Each app must manage its own dependencies:

```text
Frontend/lumora/package.json
Frontend/lumora-health-staff/package.json
```

## Tests still pending

B07's test checklist is not marked complete in this patch. Install the Expo-compatible testing packages from `Frontend/lumora` before adding/running the test suite:

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native -- --dev
npm install -D axios-mock-adapter
```
