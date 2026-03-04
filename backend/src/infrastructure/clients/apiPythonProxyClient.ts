import type { AxiosError, Method } from 'axios';

import { apiPythonClient } from './apiPythonClient.js';
import { env } from '../config/env.js';

export type ApiProxyHeaders = {
  authorization?: string;
  xRequestId?: string;
};

export class ApiProxyError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly payload: unknown
  ) {
    super('api_proxy_error');
  }
}

function buildHeaders(headers: ApiProxyHeaders): Record<string, string> {
  const output: Record<string, string> = {};
  if (headers.authorization) output.Authorization = headers.authorization;
  output['X-API-Key'] = env.globalApiKey;
  if (headers.xRequestId) output['X-Request-Id'] = headers.xRequestId;
  return output;
}

export async function proxyToApiPython<T>(
  method: Method,
  path: string,
  headers: ApiProxyHeaders,
  payload?: unknown
): Promise<T> {
  try {
    const { data } = await apiPythonClient.request<T>({
      method,
      url: path,
      headers: buildHeaders(headers),
      data: payload
    });
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status ?? 502;
    const responsePayload =
      axiosError.response?.data ??
      (axiosError.code === 'ECONNABORTED'
        ? {
            message: 'upstream_timeout',
            detail: axiosError.message
          }
        : {
            message: 'upstream_error',
            detail: axiosError.message
          });
    throw new ApiProxyError(statusCode, responsePayload);
  }
}
