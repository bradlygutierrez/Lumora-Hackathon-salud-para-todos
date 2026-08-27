import { PropsWithChildren, ReactNode } from 'react';

import { useAuthSession } from '../hooks/use-auth-session';

type PermissionGateProps = PropsWithChildren<{
  allOf?: string[];
  anyOf?: string[];
  fallback?: ReactNode;
}>;

export function PermissionGate({
  allOf = [],
  anyOf = [],
  children,
  fallback = null,
}: PermissionGateProps) {
  const { permissions } = useAuthSession();
  const hasAll = allOf.every((permission) => permissions.has(permission));
  const hasAny = anyOf.length === 0 || anyOf.some((permission) => permissions.has(permission));

  return hasAll && hasAny ? <>{children}</> : <>{fallback}</>;
}
