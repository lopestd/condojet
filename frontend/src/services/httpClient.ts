import axios from 'axios';
import type { AxiosError } from 'axios';

import type { ApiErrorPayload } from '../types';

const SESSION_STORAGE_KEY = 'condojet_session';
let inMemoryToken: string | null = null;
let redirectingToLogin = false;

function resolveBackendBaseUrl(): string {
  const envUrl = String(import.meta.env.VITE_BACKEND_URL ?? '').trim();
  if (typeof window === 'undefined') return envUrl || 'http://localhost:3000/api/v1';
  if (envUrl) {
    const isLocalAlias = envUrl.includes('://localhost:');
    const browserHostIsLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalAlias || browserHostIsLocal) return envUrl;
    return envUrl.replace('://localhost:', `://${window.location.hostname}:`);
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3000/api/v1`;
}

export const backendApi = axios.create({
  baseURL: resolveBackendBaseUrl(),
  timeout: 10000
});

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (!token) {
    delete backendApi.defaults.headers.common.Authorization;
    return;
  }
  backendApi.defaults.headers.common.Authorization = `Bearer ${token}`;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string; access_token?: string };
    return parsed.accessToken ?? parsed.access_token ?? null;
  } catch {
    return null;
  }
}

function resolveAuthToken(): string | null {
  return inMemoryToken ?? readStoredToken();
}

function clearSessionAndRedirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  inMemoryToken = null;
  delete backendApi.defaults.headers.common.Authorization;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.location.replace('/login');
}

backendApi.interceptors.request.use((config) => {
  const token = resolveAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

backendApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const originalConfig = error.config as (typeof error.config & { _retriedMissingToken?: boolean }) | undefined;
    const requestUrl = originalConfig?.url ?? '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (status === 401 && message === 'missing_token' && originalConfig && !originalConfig._retriedMissingToken) {
      const token = resolveAuthToken();
      if (token) {
        originalConfig._retriedMissingToken = true;
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${token}`;
        return backendApi.request(originalConfig);
      }
    }

    if (status === 401 && !isLoginRequest) {
      clearSessionAndRedirectToLogin();
    }

    return Promise.reject(error);
  }
);

export function readApiError(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const payload = axiosError.response?.data;
  if (payload?.message) return payload.message;
  if (axiosError.message) return axiosError.message;
  return 'Erro inesperado na requisição';
}
