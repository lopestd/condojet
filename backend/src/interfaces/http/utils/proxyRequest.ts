import { z } from 'zod';

import type { ApiProxyHeaders } from '../../../infrastructure/clients/apiPythonProxyClient.js';

export function extractProxyHeaders(input: Record<string, unknown>): ApiProxyHeaders {
  const read = (key: string): string | undefined => {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return undefined;
  };

  return {
    authorization: read('authorization'),
    xRequestId: read('x-request-id')
  };
}

export function buildValidationError(error: z.ZodError): {
  message: string;
  code: string;
  detail: ReturnType<z.ZodError['flatten']>;
} {
  return {
    message: 'validation_error',
    code: 'validation_error',
    detail: error.flatten()
  };
}
