import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const createMoradorSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(1),
  email: z.string().email(),
  endereco_id: z.number().int().positive(),
  senha: z.string().min(1)
});

const updateMoradorSchema = z
  .object({
    nome: z.string().min(1).optional(),
    telefone: z.string().min(1).optional(),
    ativo: z.boolean().optional(),
    senha: z.string().min(1).optional()
  })
  .refine(
    (value) => value.nome !== undefined || value.telefone !== undefined || value.ativo !== undefined || value.senha !== undefined,
    {
      message: 'at_least_one_field_required'
    }
  );

const moradorPathParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export async function moradorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/moradores', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/moradores', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.post('/moradores', async (request, reply) => {
    const parsed = createMoradorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython('POST', '/moradores', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(201).send(data);
  });

  app.put('/moradores/:id', async (request, reply) => {
    const params = moradorPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const body = updateMoradorSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/moradores/${params.data.id}`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });
}
