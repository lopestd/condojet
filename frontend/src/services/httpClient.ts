import axios from 'axios';
import type { AxiosError } from 'axios';

import type { ApiErrorPayload } from '../types';

const SESSION_STORAGE_KEY = 'condojet_session';
let inMemoryToken: string | null = null;

export const backendApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
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

    if (status === 401 && message === 'missing_token' && originalConfig && !originalConfig._retriedMissingToken) {
      const token = resolveAuthToken();
      if (token) {
        originalConfig._retriedMissingToken = true;
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${token}`;
        return backendApi.request(originalConfig);
      }
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
