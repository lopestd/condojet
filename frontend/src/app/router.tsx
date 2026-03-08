import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute, defaultPathByRole } from '../auth/ProtectedRoute';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { AdminResidentsPage } from '../features/condo/AdminResidentsPage';
import { AdminUsersPage } from '../features/condo/AdminUsersPage';
import { OperationPage } from '../features/condo/OperationPage';
import { ResidentPage } from '../features/condo/ResidentPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GlobalManagementPage } from '../features/global/GlobalManagementPage';
import { GlobalSettingsPage } from '../features/global/GlobalSettingsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WhatsAppSettingsPage } from '../features/settings/WhatsAppSettingsPage';
import { AppLayout } from '../layouts/AppLayout';

const LazyReportsPage = lazy(async () => {
  const module = await import('../features/reports/ReportsPage');
  return { default: module.ReportsPage };
});

function ReportsPageRoute(): JSX.Element {
  return (
    <Suspense
      fallback={
        <section className="page-grid reports-mgr-page" aria-live="polite">
          <p className="info-box">Carregando relatórios...</p>
        </section>
      }
    >
      <LazyReportsPage />
    </Suspense>
  );
}

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
        children: [
          { path: '/global', element: <GlobalManagementPage /> },
          { path: '/global/config', element: <Navigate to="/global/config/gerais" replace /> },
          { path: '/global/config/gerais', element: <GlobalSettingsPage /> },
          { path: '/global/config/whatsapp', element: <WhatsAppSettingsPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [
          { path: '/condo/admin', element: <Navigate to="/condo/admin/usuarios" replace /> },
          { path: '/condo/admin/usuarios', element: <AdminUsersPage /> },
          { path: '/condo/admin/moradores', element: <AdminResidentsPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN', 'PORTEIRO']} />,
        children: [
          { path: '/condo/operacao', element: <Navigate to="/condo/encomendas" replace /> },
          { path: '/condo/encomendas', element: <OperationPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={['MORADOR']} />,
        children: [{ path: '/condo/minhas-encomendas', element: <ResidentPage /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [{ path: '/condo/relatorios', element: <ReportsPageRoute /> }]
      },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN', 'PORTEIRO']} />,
        children: [
          { path: '/condo/config', element: <Navigate to="/condo/config/gerais" replace /> },
          { path: '/condo/config/gerais', element: <SettingsPage /> }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
