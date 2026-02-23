import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../types';

type NavItem = {
  path: string;
  label: string;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { path: '/global', label: 'Gestão Global', roles: ['ADMIN_GLOBAL'] },
  { path: '/condo/admin', label: 'Admin Condomínio', roles: ['ADMIN'] },
  { path: '/condo/operacao', label: 'Operação', roles: ['ADMIN', 'PORTEIRO'] },
  { path: '/condo/minhas-encomendas', label: 'Minhas Encomendas', roles: ['MORADOR'] }
];

export function AppLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const visible = NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <strong>CondoJET</strong>
          {user ? (
            <p>
              Perfil: <b>{user.role}</b> {user.condominioId ? `| Condomínio: ${user.condominioId}` : '| Global SaaS'}
            </p>
          ) : null}
        </div>
        <button className="button-soft" type="button" onClick={logout}>
          Sair
        </button>
      </header>

      <nav className="nav-grid">
        {visible.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <section className="content-shell">
        <Outlet />
      </section>
    </main>
  );
}
