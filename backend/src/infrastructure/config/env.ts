import dotenv from 'dotenv';

dotenv.config();

function readString(key: string, fallback?: string): string | undefined {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(key: string, fallback: number): number {
  const raw = readString(key);
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const env = {
  nodeEnv: readString('BFF_NODE_ENV', process.env.NODE_ENV) ?? 'development',
  port: readNumber('BFF_PORT', Number(process.env.PORT ?? 3000)),
  apiPythonBaseUrl:
    readString('BFF_API_PYTHON_BASE_URL', process.env.API_PYTHON_BASE_URL) ?? 'http://localhost:8000/api/v1',
  corsOrigin: readString('BFF_CORS_ORIGIN', process.env.CORS_ORIGIN) ?? 'http://localhost:5173',
  globalApiKey:
    readString('BFF_GLOBAL_API_KEY', process.env.API_GLOBAL_API_KEY) ??
    readString('GLOBAL_API_KEY') ??
    'change-me-global-key'
};
