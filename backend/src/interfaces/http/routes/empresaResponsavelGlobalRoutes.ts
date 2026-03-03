import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const empresaIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createEmpresaSchema = z.object({
  nome: z.string().trim().min(1).max(120)
});

const updateEmpresaSchema = z
  .object({
    nome: z.string().trim().min(1).max(120).optional(),
    ativo: z.boolean().optional()
  })
  .refine((value) => value.nome !== undefined || value.ativo !== undefined, {
    message: 'at_least_one_field_required'
  });

export async function empresaResponsavelGlobalRoutes(app: FastifyInstance): Promise<void> {
  app.get('/empresas-responsaveis-globais', async (request, reply) => {
    const query = request.query as { incluir_inativas?: string };
    const includeInactive = query?.incluir_inativas === 'true';
    const suffix = includeInactive ? '?incluir_inativas=true' : '';
    const data = await proxyToApiPython(
      'GET',
      `/empresas-responsaveis-globais${suffix}`,
      extractProxyHeaders(request.headers)
    );
    return reply.status(200).send(data);
  });

  app.post('/empresas-responsaveis-globais', async (request, reply) => {
    const parsed = createEmpresaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython(
      'POST',
      '/empresas-responsaveis-globais',
      extractProxyHeaders(request.headers),
      parsed.data
    );
    return reply.status(201).send(data);
  });

  app.put('/empresas-responsaveis-globais/:id', async (request, reply) => {
    const params = empresaIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const parsed = updateEmpresaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/empresas-responsaveis-globais/${params.data.id}`,
      extractProxyHeaders(request.headers),
      parsed.data
    );
    return reply.status(200).send(data);
  });
}
