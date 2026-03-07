export type Empty = Record<string, never>;

export type UserRole = 'ADMIN_GLOBAL' | 'ADMIN' | 'PORTEIRO' | 'MORADOR';

export type SessionUser = {
  accessToken: string;
  role: UserRole;
  condominioId: number | null;
  nomeUsuario: string;
  email: string;
  nomeCondominio: string;
  timezone: string;
};

export type ApiErrorPayload = {
  message?: string;
  code?: string;
  detail?: unknown;
};
