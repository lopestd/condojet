import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const createConnectionSchema = z.object({
  instanceName: z.string().trim().min(3).max(120),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Telefone deve conter 10 ou 11 dígitos.'
    })
});

const renewConnectionSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Telefone deve conter 10 ou 11 dígitos.'
    })
});

export async function whatsappConnectionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/whatsapp/conexoes', async (request, reply) => {
    const querySchema = z.object({
      instancia: z.string().trim().optional()
    });
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(422).send(buildValidationError(parsedQuery.error));
    }

    const params = new URLSearchParams();
    if (parsedQuery.data.instancia) {
      params.set('instancia', parsedQuery.data.instancia);
    }
    const suffix = params.toString();
    const path = suffix ? `/whatsapp/conexoes?${suffix}` : '/whatsapp/conexoes';

    const data = await proxyToApiPython('GET', path, extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.post('/whatsapp/conexoes', async (request, reply) => {
    const parsedBody = createConnectionSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send(buildValidationError(parsedBody.error));
    }

    const data = await proxyToApiPython('POST', '/whatsapp/conexoes', extractProxyHeaders(request.headers), parsedBody.data);
    return reply.status(200).send(data);
  });

  app.post('/whatsapp/conexoes/:nome/renovar-qr', async (request, reply) => {
    const parsedParams = z
      .object({
        nome: z.string().trim().min(1).max(120)
      })
      .safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send(buildValidationError(parsedParams.error));
    }

    const parsedBody = renewConnectionSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send(buildValidationError(parsedBody.error));
    }

    const data = await proxyToApiPython(
      'POST',
      `/whatsapp/conexoes/${encodeURIComponent(parsedParams.data.nome)}/renovar-qr`,
      extractProxyHeaders(request.headers),
      parsedBody.data
    );
    return reply.status(200).send(data);
  });
}
