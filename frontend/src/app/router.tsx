import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute, defaultPathByRole } from '../auth/ProtectedRoute';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { AdminCondoPage } from '../features/condo/AdminCondoPage';
import { OperationPage } from '../features/condo/OperationPage';
import { ResidentPage } from '../features/condo/ResidentPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GlobalManagementPage } from '../features/global/GlobalManagementPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppLayout } from '../layouts/AppLayout';

function HomeRedirect(): JSX.Element {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={defaultPathByRole(user.role)} replace />;
}

function LoginRedirect(): JSX.Element {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={defaultPathByRole(user.role)} replace />;
  }
  return <LoginPage />;
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <HomeRedirect />
  },
  {
    path: '/login',
    element: <LoginRedirect />
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute allowedRoles={['ADMIN_GLOBAL', 'ADMIN', 'PORTEIRO', 'MORADOR']} />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN_GLOBAL']} />,
        children: [{ path: '/global', element: <GlobalManagementPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [{ path: '/condo/admin', element: <AdminCondoPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN', 'PORTEIRO']} />,
        children: [{ path: '/condo/operacao', element: <OperationPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['MORADOR']} />,
        children: [{ path: '/condo/minhas-encomendas', element: <ResidentPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN_GLOBAL', 'ADMIN']} />,
        children: [{ path: '/condo/config', element: <SettingsPage /> }]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
