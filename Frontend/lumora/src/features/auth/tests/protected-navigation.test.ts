import {
  resolveProtectedRoute,
} from '@/features/auth/navigation/auth-route-guard';

describe(
  'resolveProtectedRoute',
  () => {
    it(
      'waits while the session is bootstrapping',
      () => {
        const decision =
          resolveProtectedRoute(
            'bootstrapping',
          );

        expect(decision).toEqual({
          type: 'wait',
        });
      },
    );

    it(
      'redirects unauthenticated users to login',
      () => {
        const decision =
          resolveProtectedRoute(
            'unauthenticated',
          );

        expect(decision).toEqual({
          type: 'redirect',
          href: '/(auth)/login',
        });
      },
    );

    it(
      'allows authenticated users to enter private routes',
      () => {
        const decision =
          resolveProtectedRoute(
            'authenticated',
          );

        expect(decision).toEqual({
          type: 'allow',
        });
      },
    );
  },
);