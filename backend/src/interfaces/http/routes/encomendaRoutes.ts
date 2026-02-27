import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const encomendaPathParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createEncomendaSchema = z.object({
  tipo: z.string().min(1),
  morador_id: z.number().int().positive(),
  endereco_id: z.number().int().positive(),
  codigo_externo: z.string().trim().min(1),
  descricao: z.string().min(1).optional(),
  empresa_entregadora: z.string().trim().min(1)
});

const entregarEncomendaSchema = z.object({
  retirado_por_nome: z.string().min(1)
});

const reabrirEncomendaSchema = z.object({
  motivo_reabertura: z.string().min(1)
});

const updateEncomendaSchema = z
  .object({
    tipo: z.string().min(1).optional(),
    morador_id: z.number().int().positive().optional(),
    endereco_id: z.number().int().positive().optional(),
    codigo_externo: z.string().min(1).optional(),
    descricao: z.string().min(1).optional(),
    empresa_entregadora: z.string().min(1).optional()
  })
  .refine(
    (value) =>
      value.tipo !== undefined ||
      value.morador_id !== undefined ||
      value.endereco_id !== undefined ||
      value.codigo_externo !== undefined ||
      value.descricao !== undefined ||
      value.empresa_entregadora !== undefined,
    {
      message: 'at_least_one_field_required'
    }
  );

export async function encomendaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/encomendas', async (request, reply) => {
    const parsed = createEncomendaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython('POST', '/encomendas', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(201).send(data);
  });

  app.get('/encomendas', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/encomendas', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.get('/encomendas/:id', async (request, reply) => {
    const params = encomendaPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const data = await proxyToApiPython('GET', `/encomendas/${params.data.id}`, extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.put('/encomendas/:id', async (request, reply) => {
    const params = encomendaPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const body = updateEncomendaSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/encomendas/${params.data.id}`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });

  app.put('/encomendas/:id/entregar', async (request, reply) => {
    const params = encomendaPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const body = entregarEncomendaSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/encomendas/${params.data.id}/entregar`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });

  app.put('/encomendas/:id/reabrir', async (request, reply) => {
    const params = encomendaPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    const body = reabrirEncomendaSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/encomendas/${params.data.id}/reabrir`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });

  app.delete('/encomendas/:id', async (request, reply) => {
    const params = encomendaPathParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }

    await proxyToApiPython('DELETE', `/encomendas/${params.data.id}`, extractProxyHeaders(request.headers));
    return reply.status(204).send();
  });

  app.get('/minhas-encomendas', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/minhas-encomendas', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });
}
