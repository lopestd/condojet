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
  { path: '/condo/admin/usuarios', label: 'Admin Condomínio', shortLabel: 'Admin', roles: ['ADMIN'] },
  { path: '/condo/encomendas', label: 'Encomendas', shortLabel: 'Encomendas', roles: ['ADMIN', 'PORTEIRO'] },
  {
    path: '/condo/minhas-encomendas',
    label: 'Minhas Encomendas',
    shortLabel: 'Minhas',
    roles: ['MORADOR']
  }
];

const CONFIG_NAV_ITEM: NavItem = {
  path: '/condo/config',
  label: 'Configuracoes',
  shortLabel: 'Config',
  roles: ['ADMIN_GLOBAL', 'ADMIN']
};

const TITLES: Record<string, string> = {
  '/dashboard': 'Painel CondoJET',
  '/global': 'Gestao Global',
  '/condo/admin': 'Administracao do Condominio',
  '/condo/admin/usuarios': 'Administracao do Condominio',
  '/condo/admin/moradores': 'Administracao do Condominio',
  '/condo/encomendas': 'Encomendas',
  '/condo/operacao': 'Operacao de Encomendas',
  '/condo/minhas-encomendas': 'Minhas Encomendas',
  '/condo/config': 'Configuracoes'
};

function getRoleLabel(role?: UserRole): string {
  if (!role) return '';
  return role === 'PORTEIRO' ? 'ATENDENTE' : role;
}

function findNavItem(path: string): NavItem | undefined {
  if (path === CONFIG_NAV_ITEM.path) return CONFIG_NAV_ITEM;
  return NAV_ITEMS.find((item) => item.path === path);
}

function getBottomNavItems(role: UserRole | undefined, visible: NavItem[]): NavItem[] {
  if (!role) return [];

  const addItem = (items: NavItem[], path: string): void => {
    const item = findNavItem(path);
    if (!item) return;
    if (items.some((existing) => existing.path === item.path)) return;
    items.push(item);
  };

  const items: NavItem[] = [];

  if (role === 'ADMIN_GLOBAL') {
    addItem(items, '/dashboard');
    addItem(items, '/global');
    addItem(items, '/condo/config');
    const extraShortcut = visible.find((item) => item.path !== '/dashboard' && item.path !== '/global');
    if (extraShortcut) addItem(items, extraShortcut.path);
    return items;
  }

  if (role === 'ADMIN') {
    addItem(items, '/dashboard');
    addItem(items, '/condo/admin/usuarios');
    addItem(items, '/condo/encomendas');
    addItem(items, '/condo/config');
    return items;
  }

  if (role === 'PORTEIRO') {
    addItem(items, '/dashboard');
    addItem(items, '/condo/encomendas');
    return items;
  }

  addItem(items, '/dashboard');
  addItem(items, '/condo/minhas-encomendas');
  return items;
}

export function AppLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visible = useMemo(() => NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false)), [user]);
  const showAdminMenu = user?.role === 'ADMIN';
  const showConfigItem = user ? CONFIG_NAV_ITEM.roles.includes(user.role) : false;
  const isAdminSection = location.pathname.startsWith('/condo/admin');
  const bottomNavItems = useMemo(() => getBottomNavItems(user?.role, visible), [user?.role, visible]);
  const pageTitle = TITLES[location.pathname] ?? 'CondoJET';
  const profileLabel = getRoleLabel(user?.role);
  const usuarioLabel = user ? `${user.nomeUsuario} (${profileLabel})` : 'Usuario';
  const condominioLabel = user?.nomeCondominio ?? 'CondoJET Global';

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
          <small>Gestao de encomendas em condominios</small>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {visible.map((item) => {
            if (item.path === '/condo/admin/usuarios' && showAdminMenu) {
              return null;
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
          })}

          {showAdminMenu ? (
            <div className="sidebar-group">
              <NavLink
                to="/condo/admin/usuarios"
                className={isAdminSection ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Condomínio
              </NavLink>
              <div className="sidebar-subnav">
                <NavLink
                  to="/condo/admin/usuarios"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Usuários
                </NavLink>
                <NavLink
                  to="/condo/admin/moradores"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Moradores
                </NavLink>
              </div>
            </div>
          ) : null}

          {showConfigItem ? (
            <NavLink
              to={CONFIG_NAV_ITEM.path}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={() => setMobileMenuOpen(false)}
            >
              {CONFIG_NAV_ITEM.label}
            </NavLink>
          ) : null}
        </nav>

        <footer className="sidebar-footer">
          {user ? (
            <div className="user-card">
              <p>{usuarioLabel}</p>
              <small>{condominioLabel}</small>
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
        </header>

        <section className="page-content">
          <Outlet />
        </section>

        {bottomNavItems.length > 0 ? (
          <nav className="bottom-nav" aria-label="Atalhos">
            {bottomNavItems.map((item) => {
              const isAdminShortcut = item.path === '/condo/admin/usuarios';
              const className = isAdminShortcut && isAdminSection ? 'bottom-link active' : undefined;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => className ?? (isActive ? 'bottom-link active' : 'bottom-link')}
                >
                  {item.shortLabel}
                </NavLink>
              );
            })}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
