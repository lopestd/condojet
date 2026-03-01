import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../types';

type NavItem = {
  path: string;
  label: string;
  shortLabel: string;
  icon: 'dashboard' | 'global' | 'admin' | 'packages' | 'my-packages' | 'reports' | 'settings';
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Painel CondoJET', shortLabel: 'Painel', icon: 'dashboard', roles: ['ADMIN_GLOBAL', 'ADMIN', 'PORTEIRO', 'MORADOR'] },
  { path: '/global', label: 'Gestao Global', shortLabel: 'Global', icon: 'global', roles: ['ADMIN_GLOBAL'] },
  { path: '/condo/admin/usuarios', label: 'Admin Condomínio', shortLabel: 'Admin', icon: 'admin', roles: ['ADMIN'] },
  { path: '/condo/encomendas', label: 'Encomendas', shortLabel: 'Encomendas', icon: 'packages', roles: ['ADMIN', 'PORTEIRO'] },
  {
    path: '/condo/minhas-encomendas',
    label: 'Minhas Encomendas',
    shortLabel: 'Minhas',
    icon: 'my-packages',
    roles: ['MORADOR']
  }
];

const CONFIG_NAV_ITEM: NavItem = {
  path: '/condo/config',
  label: 'Configuracoes',
  shortLabel: 'Config',
  icon: 'settings',
  roles: ['ADMIN_GLOBAL', 'ADMIN']
};

const REPORTS_NAV_ITEM: NavItem = {
  path: '/condo/relatorios',
  label: 'Relatorios',
  shortLabel: 'Relatorios',
  icon: 'reports',
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
  '/condo/relatorios': 'Relatorios',
  '/condo/config': 'Configuracoes'
};

function getRoleLabel(role?: UserRole): string {
  if (!role) return '';
  return role === 'PORTEIRO' ? 'ATENDENTE' : role;
}

function findNavItem(path: string): NavItem | undefined {
  if (path === REPORTS_NAV_ITEM.path) return REPORTS_NAV_ITEM;
  if (path === CONFIG_NAV_ITEM.path) return CONFIG_NAV_ITEM;
  return NAV_ITEMS.find((item) => item.path === path);
}

function SidebarIcon({ type }: { type: NavItem['icon'] }): JSX.Element {
  if (type === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3h8v8H3z" />
        <path d="M13 3h8v5h-8z" />
        <path d="M13 10h8v11h-8z" />
        <path d="M3 13h8v8H3z" />
      </svg>
    );
  }
  if (type === 'global') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  }
  if (type === 'admin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 4 7v6c0 5 3.4 7.9 8 9 4.6-1.1 8-4 8-9V7z" />
        <path d="M9.2 12.2 11 14l3.8-3.8" />
      </svg>
    );
  }
  if (type === 'my-packages') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 8h18v11H3z" />
        <path d="M12 8v11" />
        <path d="M3 8l9-5 9 5" />
      </svg>
    );
  }
  if (type === 'settings') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.4" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z" />
      </svg>
    );
  }
  if (type === 'reports') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v14H4z" />
        <path d="M8 15V10" />
        <path d="M12 15V8" />
        <path d="M16 15v-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5h18v14H3z" />
      <path d="M3 10h18" />
    </svg>
  );
}

function SidebarLinkLabel({ icon, label }: { icon: NavItem['icon']; label: string }): JSX.Element {
  return (
    <span className="sidebar-link-content">
      <span className="sidebar-link-icon">
        <SidebarIcon type={icon} />
      </span>
      <span>{label}</span>
    </span>
  );
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
    addItem(items, '/condo/relatorios');
    addItem(items, '/condo/config');
    const extraShortcut = visible.find((item) => item.path !== '/dashboard' && item.path !== '/global');
    if (extraShortcut) addItem(items, extraShortcut.path);
    return items;
  }

  if (role === 'ADMIN') {
    addItem(items, '/dashboard');
    addItem(items, '/condo/admin/usuarios');
    addItem(items, '/condo/encomendas');
    addItem(items, '/condo/relatorios');
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
  const showReportsItem = user ? REPORTS_NAV_ITEM.roles.includes(user.role) : false;
  const isAdminSection = location.pathname.startsWith('/condo/admin');
  const bottomNavItems = useMemo(() => getBottomNavItems(user?.role, visible), [user?.role, visible]);
  const pageTitle = TITLES[location.pathname] ?? 'CondoJET';
  const showTopbarInfo = location.pathname !== '/dashboard';
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
                <SidebarLinkLabel icon={item.icon} label={item.label} />
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
                <SidebarLinkLabel icon="admin" label="Admin Condomínio" />
              </NavLink>
              <div className="sidebar-subnav">
                <NavLink
                  to="/condo/admin/usuarios"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-content">
                    <span className="sidebar-link-icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
                        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
                      </svg>
                    </span>
                    <span>Usuários</span>
                  </span>
                </NavLink>
                <NavLink
                  to="/condo/admin/moradores"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-content">
                    <span className="sidebar-link-icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
                      </svg>
                    </span>
                    <span>Moradores</span>
                  </span>
                </NavLink>
              </div>
            </div>
          ) : null}

          {showReportsItem ? (
            <NavLink
              to={REPORTS_NAV_ITEM.path}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <SidebarLinkLabel icon={REPORTS_NAV_ITEM.icon} label={REPORTS_NAV_ITEM.label} />
            </NavLink>
          ) : null}

          {showConfigItem ? (
            <NavLink
              to={CONFIG_NAV_ITEM.path}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <SidebarLinkLabel icon={CONFIG_NAV_ITEM.icon} label={CONFIG_NAV_ITEM.label} />
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
        {showTopbarInfo ? (
          <header className="app-topbar">
            <div>
              <h2>{pageTitle}</h2>
              <p>CondoJET em operacao segura e orientada por perfil.</p>
            </div>
          </header>
        ) : null}

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
