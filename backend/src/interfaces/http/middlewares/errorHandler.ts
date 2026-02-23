import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { ApiProxyError } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { logger } from '../../../infrastructure/logger/logger.js';

type ErrorPayload = {
  message: string;
  code: string;
  request_id?: string;
  detail?: unknown;
};

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof ApiProxyError) {
    reply.status(error.statusCode).send(error.payload);
    return;
  }

  const requestId = String(request.id);
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

  logger.error(
    {
      err: error,
      request_id: requestId,
      method: request.method,
      path: request.url,
      status_code: statusCode
    },
    'backend_error'
  );

  const payload: ErrorPayload = {
    message: statusCode >= 500 ? 'internal_error' : error.message || 'request_error',
    code: statusCode >= 500 ? 'internal_error' : 'request_error',
    request_id: requestId
  };

  if (statusCode >= 500) {
    payload.detail = error.message;
  }

  reply.status(statusCode).send(payload);
}
