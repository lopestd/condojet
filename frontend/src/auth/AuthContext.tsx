import { createContext, useContext, useMemo, useState } from 'react';

import { backendApi, setAuthToken } from '../services/httpClient';
import type { SessionUser, UserRole } from '../types';

type LoginInput = {
  email: string;
  senha: string;
  condominioId?: number;
};

type LoginResponse = {
  access_token: string;
  role: UserRole;
  condominio_id: number | null;
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
    return parsed;
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
      senha: input.senha
    };
    if (typeof input.condominioId === 'number') {
      payload.condominio_id = input.condominioId;
    }
    const { data } = await backendApi.post<LoginResponse>('/auth/login', payload);
    const nextUser: SessionUser = {
      accessToken: data.access_token,
      role: data.role,
      condominioId: data.condominio_id
    };
    setAuthToken(nextUser.accessToken);
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
