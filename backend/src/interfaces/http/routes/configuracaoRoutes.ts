import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const updateConfiguracaoSchema = z.object({
  timezone: z.string().min(3).max(64)
});

export async function configuracaoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/configuracoes', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/configuracoes', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.put('/configuracoes', async (request, reply) => {
    const parsed = updateConfiguracaoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }
    const data = await proxyToApiPython('PUT', '/configuracoes', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(200).send(data);
  });
}

