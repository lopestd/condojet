import { type CSSProperties, useEffect, useMemo, useState } from 'react';
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
  { path: '/global', label: 'Gestão Global', shortLabel: 'Global', icon: 'global', roles: ['ADMIN_GLOBAL'] },
  { path: '/condo/admin/usuarios', label: 'Admin Condomínio', shortLabel: 'Admin', icon: 'admin', roles: ['ADMIN'] },
  { path: '/condo/encomendas', label: 'Encomendas', shortLabel: 'Encomendas', icon: 'packages', roles: ['ADMIN', 'PORTEIRO'] },
  {
    path: '/condo/minhas-encomendas',
    label: 'Minhas Encomendas',
    shortLabel: 'Encomendas',
    icon: 'my-packages',
    roles: ['MORADOR']
  }
];

const CONFIG_NAV_ITEM: NavItem = {
  path: '/condo/config',
  label: 'Configurações',
  shortLabel: 'Config',
  icon: 'settings',
  roles: ['ADMIN', 'PORTEIRO']
};

const GLOBAL_CONFIG_NAV_ITEM: NavItem = {
  path: '/global/config',
  label: 'Configurações',
  shortLabel: 'Config',
  icon: 'settings',
  roles: ['ADMIN_GLOBAL']
};

const REPORTS_NAV_ITEM: NavItem = {
  path: '/condo/relatorios',
  label: 'Relatórios',
  shortLabel: 'Relatórios',
  icon: 'reports',
  roles: ['ADMIN']
};

const TITLES: Record<string, string> = {
  '/dashboard': 'Painel CondoJET',
  '/global': 'Gestão Global',
  '/global/config': 'Configurações Globais',
  '/global/config/gerais': 'Configurações Globais - Gerais',
  '/global/config/whatsapp': 'Configurações Globais - WhatsApp',
  '/condo/admin': 'Administração do Condomínio',
  '/condo/admin/usuarios': 'Administração do Condomínio',
  '/condo/admin/moradores': 'Administração do Condomínio',
  '/condo/encomendas': 'Encomendas',
  '/condo/operacao': 'Operação de Encomendas',
  '/condo/minhas-encomendas': 'Minhas Encomendas',
  '/condo/relatorios': 'Relatórios',
  '/condo/config': 'Configurações',
  '/condo/config/gerais': 'Configurações - Gerais'
};

function getRoleLabel(role?: UserRole): string {
  if (!role) return '';
  return role === 'PORTEIRO' ? 'ATENDENTE' : role;
}

function findNavItem(path: string): NavItem | undefined {
  if (path === REPORTS_NAV_ITEM.path) return REPORTS_NAV_ITEM;
  if (path === CONFIG_NAV_ITEM.path) return CONFIG_NAV_ITEM;
  if (path === GLOBAL_CONFIG_NAV_ITEM.path) return GLOBAL_CONFIG_NAV_ITEM;
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
    addItem(items, '/global/config');
    const extraShortcut = visible.find((item) => item.path !== '/dashboard' && item.path !== '/global');
    if (extraShortcut) addItem(items, extraShortcut.path);
    return items;
  }

  if (role === 'ADMIN') {
    addItem(items, '/dashboard');
    addItem(items, '/condo/encomendas');
    addItem(items, '/condo/relatorios');
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
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );

  const visible = useMemo(() => NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false)), [user]);
  const showAdminMenu = user?.role === 'ADMIN';
  const condoConfigVisible = user ? CONFIG_NAV_ITEM.roles.includes(user.role) : false;
  const globalConfigVisible = user ? GLOBAL_CONFIG_NAV_ITEM.roles.includes(user.role) : false;
  const showReportsItem = user?.role === 'ADMIN';
  const isAdminSection = location.pathname.startsWith('/condo/admin');
  const isConfigSection = location.pathname.startsWith('/condo/config') || location.pathname.startsWith('/global/config');
  const bottomNavItems = useMemo(() => getBottomNavItems(user?.role, visible), [user?.role, visible]);
  const pageTitle = TITLES[location.pathname] ?? 'CondoJET';
  useEffect(() => {
    function handleResize(): void {
      setIsMobileViewport(window.innerWidth <= 900);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showTopbarInfo = location.pathname !== '/dashboard' || isMobileViewport;
  const profileLabel = getRoleLabel(user?.role);
  const usuarioLabel = user ? `${user.nomeUsuario} (${profileLabel})` : 'Usuário';
  const emailLabel = user?.email?.trim() ? user.email : 'Carregando e-mail...';

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
          <small>Gestão de encomendas em condomínios</small>
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

          {globalConfigVisible ? (
            <div className="sidebar-group">
              <NavLink
                to={GLOBAL_CONFIG_NAV_ITEM.path}
                className={isConfigSection ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setMobileMenuOpen(false)}
              >
                <SidebarLinkLabel icon={GLOBAL_CONFIG_NAV_ITEM.icon} label={GLOBAL_CONFIG_NAV_ITEM.label} />
              </NavLink>
              <div className="sidebar-subnav">
                <NavLink
                  to="/global/config/gerais"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-content">
                    <span className="sidebar-link-icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="3.4" />
                        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z" />
                      </svg>
                    </span>
                    <span>Gerais</span>
                  </span>
                </NavLink>
                <NavLink
                  to="/global/config/whatsapp"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-content">
                    <span className="sidebar-link-icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6.2 19.1 7 15.9a7.5 7.5 0 1 1 2.7 2.2z" />
                        <path d="M10.2 9.2c.2-.4.3-.4.5-.4h.4c.1 0 .3 0 .4.3l.6 1.4c.1.2.1.3 0 .4l-.3.5c-.1.1-.2.2-.1.4.3.6.8 1.2 1.5 1.6.2.1.3 0 .4-.1l.5-.6c.1-.1.3-.2.4-.1l1.3.6c.2.1.3.2.3.4v.4c0 .2 0 .4-.3.5-.4.2-1 .3-1.5.2-2.3-.5-4.4-2.7-4.9-5-.1-.5 0-1.1.2-1.5z" />
                      </svg>
                    </span>
                    <span>WhatsApp</span>
                  </span>
                </NavLink>
              </div>
            </div>
          ) : null}

          {condoConfigVisible ? (
            <div className="sidebar-group">
              <NavLink
                to={CONFIG_NAV_ITEM.path}
                className={isConfigSection ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setMobileMenuOpen(false)}
              >
                <SidebarLinkLabel icon={CONFIG_NAV_ITEM.icon} label={CONFIG_NAV_ITEM.label} />
              </NavLink>
              <div className="sidebar-subnav">
                <NavLink
                  to="/condo/config/gerais"
                  className={({ isActive }) => (isActive ? 'sidebar-sublink active' : 'sidebar-sublink')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sidebar-link-content">
                    <span className="sidebar-link-icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="3.4" />
                        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z" />
                      </svg>
                    </span>
                    <span>Gerais</span>
                  </span>
                </NavLink>
              </div>
            </div>
          ) : null}
        </nav>

        <footer className="sidebar-footer">
          {user ? (
            <div className="user-card">
              <div className="user-card-main">
                <p>{usuarioLabel}</p>
                <small>{emailLabel}</small>
              </div>
              <button className="user-card-logout" type="button" onClick={logout}>
                Sair
              </button>
            </div>
          ) : null}
        </footer>
      </aside>

      {mobileMenuOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} /> : null}

      <section className="app-main">
        {showTopbarInfo ? (
          <header className="app-topbar">
            <div>
              <h2>{pageTitle}</h2>
              <p>[CondoJET] Gestão eficiente de encomendas em condomínios</p>
            </div>
          </header>
        ) : null}

        <section className="page-content">
          <Outlet />
        </section>

        {bottomNavItems.length > 0 ? (
          <nav
            className="bottom-nav"
            aria-label="Atalhos"
            style={{ ['--bottom-nav-columns' as const]: String(bottomNavItems.length) } as CSSProperties}
          >
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
