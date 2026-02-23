import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const createUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(1),
  perfil: z.enum(['ADMIN', 'PORTEIRO'])
});

const updateUsuarioSchema = z
  .object({
    nome: z.string().min(1).optional(),
    senha: z.string().min(1).optional(),
    ativo: z.boolean().optional()
  })
  .refine((value) => value.nome !== undefined || value.senha !== undefined || value.ativo !== undefined, {
    message: 'at_least_one_field_required'
  });

const usuarioPathParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export async function usuarioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/usuarios', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/usuarios', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.post('/usuarios', async (request, reply) => {
    const parsed = createUsuarioSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython('POST', '/usuarios', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(201).send(data);
  });

  app.put('/usuarios/:id', async (request, reply) => {
    const params = usuarioPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const body = updateUsuarioSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/usuarios/${params.data.id}`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });
}
