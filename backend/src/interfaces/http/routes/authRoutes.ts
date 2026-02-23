import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
  condominio_id: z.coerce.number().int().positive().optional()
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }
    const data = await proxyToApiPython('POST', '/auth/login', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(200).send(data);
  });

  app.post('/auth/logout', async (request, reply) => {
    const data = await proxyToApiPython('POST', '/auth/logout', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });
}
