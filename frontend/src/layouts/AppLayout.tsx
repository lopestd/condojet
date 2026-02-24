import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../types';

type NavItem = {
  path: string;
  label: string;
  shortLabel: string;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Painel CondoJET', shortLabel: 'Painel', roles: ['ADMIN_GLOBAL', 'ADMIN', 'PORTEIRO', 'MORADOR'] },
  { path: '/global', label: 'Gestao Global', shortLabel: 'Global', roles: ['ADMIN_GLOBAL'] },
  { path: '/condo/admin', label: 'Admin Condomínio', shortLabel: 'Admin', roles: ['ADMIN'] },
  { path: '/condo/operacao', label: 'Operacao', shortLabel: 'Operacao', roles: ['ADMIN', 'PORTEIRO'] },
  {
    path: '/condo/minhas-encomendas',
    label: 'Minhas Encomendas',
    shortLabel: 'Minhas',
    roles: ['MORADOR']
  },
  { path: '/condo/config', label: 'Configuracoes', shortLabel: 'Config', roles: ['ADMIN_GLOBAL', 'ADMIN'] }
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Painel CondoJET',
  '/global': 'Gestao Global',
  '/condo/admin': 'Administracao do Condominio',
  '/condo/operacao': 'Operacao de Encomendas',
  '/condo/minhas-encomendas': 'Minhas Encomendas',
  '/condo/config': 'Configuracoes'
};

export function AppLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visible = useMemo(() => NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false)), [user]);
  const bottomNavItems = visible.slice(0, 4);
  const pageTitle = TITLES[location.pathname] ?? 'CondoJET';

  return (
    <main className={mobileMenuOpen ? 'layout-root menu-open' : 'layout-root'}>
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Abrir menu"
      >
        <span />
        <span />
        <span />
      </button>

      <aside className={mobileMenuOpen ? 'app-sidebar open' : 'app-sidebar'}>
        <div className="brand-block">
          <p className="brand-eyebrow">Plataforma</p>
          <h1>CondoJET</h1>
          <small>Gestao operacional de condominios</small>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {visible.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <footer className="sidebar-footer">
          {user ? (
            <div className="user-card">
              <p>{user.role}</p>
              <small>{user.condominioId ? `Condominio ${user.condominioId}` : 'Global SaaS'}</small>
            </div>
          ) : null}
          <button className="button-soft" type="button" onClick={logout}>
            Sair
          </button>
        </footer>
      </aside>

      {mobileMenuOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} /> : null}

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <h2>{pageTitle}</h2>
            <p>CondoJET em operacao segura e orientada por perfil.</p>
          </div>
          <button className="button-soft topbar-logout" type="button" onClick={logout}>
            Sair
          </button>
        </header>

        <section className="page-content">
          <Outlet />
        </section>

        {bottomNavItems.length > 0 ? (
          <nav className="bottom-nav" aria-label="Atalhos">
            {bottomNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'bottom-link active' : 'bottom-link')}>
                {item.shortLabel}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
