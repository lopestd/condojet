import { createContext, useContext, useMemo, useState } from 'react';

import { backendApi, setAuthToken } from '../services/httpClient';
import type { SessionUser, UserRole } from '../types';

type LoginInput = {
  email: string;
  senha: string;
  accessMode: 'global' | 'condominio';
};

type LoginResponse = {
  access_token: string;
  role: UserRole;
  condominio_id: number | null;
};

type SessionProfileResponse = {
  role: UserRole;
  condominio_id: number | null;
  nome_usuario: string;
  nome_condominio: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = 'condojet_session';

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredSession(): SessionUser | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.accessToken || !parsed.role) return null;
    return {
      accessToken: parsed.accessToken,
      role: parsed.role,
      condominioId: parsed.condominioId ?? null,
      nomeUsuario: parsed.nomeUsuario ?? 'Usuario',
      nomeCondominio: parsed.nomeCondominio ?? (parsed.condominioId ? `Condominio ${parsed.condominioId}` : 'CondoJET Global')
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const stored = parseStoredSession();
    setAuthToken(stored?.accessToken ?? null);
    return stored;
  });

  async function login(input: LoginInput): Promise<void> {
    const payload: Record<string, unknown> = {
      email: input.email,
      senha: input.senha,
      acesso_condominio: input.accessMode === 'condominio'
    };
    const { data } = await backendApi.post<LoginResponse>('/auth/login', payload);
    setAuthToken(data.access_token);
    const { data: profile } = await backendApi.get<SessionProfileResponse>('/auth/me');
    const nextUser: SessionUser = {
      accessToken: data.access_token,
      role: profile.role,
      condominioId: profile.condominio_id,
      nomeUsuario: profile.nome_usuario,
      nomeCondominio: profile.nome_condominio
    };
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }

  function logout(): void {
    setAuthToken(null);
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user?.accessToken,
      login,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
