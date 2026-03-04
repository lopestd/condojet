import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const webhookTypes = ['whatsapp_create', 'whatsapp_query', 'whatsapp_notify'] as const;

const webhookTypeSchema = z.enum(webhookTypes);

const upsertWebhookSchema = z.object({
  url: z.string().min(8).max(2048).url(),
  ativo: z.boolean()
});

const testWebhookSchema = z
  .object({
    url: z.string().min(8).max(2048).url().optional()
  })
  .optional();

export async function webhookN8nRoutes(app: FastifyInstance): Promise<void> {
  app.get('/webhooks-n8n', async (request, reply) => {
    const querySchema = z.object({
      contexto: z.string().default('whatsapp')
    });
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(422).send(buildValidationError(parsedQuery.error));
    }

    const params = new URLSearchParams({ contexto: parsedQuery.data.contexto });
    const data = await proxyToApiPython('GET', `/webhooks-n8n?${params.toString()}`, extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.get('/webhooks-n8n/:tipo', async (request, reply) => {
    const parsed = webhookTypeSchema.safeParse((request.params as { tipo?: string }).tipo);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython('GET', `/webhooks-n8n/${parsed.data}`, extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.put('/webhooks-n8n/:tipo', async (request, reply) => {
    const parsedType = webhookTypeSchema.safeParse((request.params as { tipo?: string }).tipo);
    if (!parsedType.success) {
      return reply.status(422).send(buildValidationError(parsedType.error));
    }

    const parsedBody = upsertWebhookSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send(buildValidationError(parsedBody.error));
    }

    const data = await proxyToApiPython(
      'PUT',
      `/webhooks-n8n/${parsedType.data}`,
      extractProxyHeaders(request.headers),
      parsedBody.data
    );
    return reply.status(200).send(data);
  });

  app.post('/webhooks-n8n/:tipo/testar', async (request, reply) => {
    const parsedType = webhookTypeSchema.safeParse((request.params as { tipo?: string }).tipo);
    if (!parsedType.success) {
      return reply.status(422).send(buildValidationError(parsedType.error));
    }

    const parsedBody = testWebhookSchema.safeParse(request.body ?? {});
    if (!parsedBody.success) {
      return reply.status(422).send(buildValidationError(parsedBody.error));
    }

    const data = await proxyToApiPython(
      'POST',
      `/webhooks-n8n/${parsedType.data}/testar`,
      extractProxyHeaders(request.headers),
      parsedBody.data ?? {}
    );
    return reply.status(200).send(data);
  });
}
