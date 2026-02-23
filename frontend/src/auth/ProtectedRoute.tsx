import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from './AuthContext';
import type { UserRole } from '../types';

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={defaultPathByRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function defaultPathByRole(role: UserRole): string {
  if (role === 'ADMIN_GLOBAL') return '/global';
  if (role === 'MORADOR') return '/condo/minhas-encomendas';
  if (role === 'PORTEIRO') return '/condo/operacao';
  return '/condo/admin';
}
