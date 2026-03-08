import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const updateConfiguracaoSchema = z
  .object({
    timezone: z.string().min(3).max(64).optional(),
    prazo_dias_encomenda_esquecida: z.number().int().min(1).max(365).optional()
  })
  .refine((payload) => payload.timezone !== undefined || payload.prazo_dias_encomenda_esquecida !== undefined, {
    message: 'Informe ao menos um campo de configuração.'
  });

const updateCondominioConfiguracaoSchema = z.object({
  nome_condominio: z.string().min(2).max(150),
  tipo_condominio_id: z.number().int().min(1),
  parametros_enderecamento: z
    .object({
      predio_rotulo_bloco: z.string().min(1).max(80),
      predio_rotulo_andar: z.string().min(1).max(80),
      predio_rotulo_apartamento: z.string().min(1).max(80),
      horizontal_rotulo_tipo: z.string().min(1).max(80),
      horizontal_rotulo_subtipo: z.string().min(1).max(80),
      horizontal_rotulo_numero: z.string().min(1).max(80),
      horizontal_hint_tipo: z.string().min(1).max(255),
      horizontal_hint_subtipo: z.string().min(1).max(255),
      horizontal_tipos_permitidos_ids: z.array(z.number().int().min(1)).optional(),
      horizontal_subtipos_permitidos_ids: z.array(z.number().int().min(1)).optional()
    })
    .optional()
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

  app.get('/configuracoes/condominio', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/configuracoes/condominio', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.put('/configuracoes/condominio', async (request, reply) => {
    const parsed = updateCondominioConfiguracaoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }
    const data = await proxyToApiPython('PUT', '/configuracoes/condominio', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(200).send(data);
  });

  app.get('/configuracoes/enderecos/referencias', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/configuracoes/enderecos/referencias', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });
}
