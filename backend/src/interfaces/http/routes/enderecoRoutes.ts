import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

const createEnderecoSchema = z
  .object({
    tipo_endereco: z.enum(['QUADRA_CONJUNTO_LOTE', 'QUADRA_SETOR_CHACARA']),
    quadra: z.string().min(1),
    conjunto: z.string().min(1).optional(),
    lote: z.string().min(1).optional(),
    setor_chacara: z.string().min(1).optional(),
    numero_chacara: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (value.tipo_endereco === 'QUADRA_CONJUNTO_LOTE') {
      if (!value.conjunto) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conjunto'], message: 'required_for_tipo_endereco' });
      }
      if (!value.lote) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lote'], message: 'required_for_tipo_endereco' });
      }
    }
    if (value.tipo_endereco === 'QUADRA_SETOR_CHACARA') {
      if (!value.setor_chacara) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['setor_chacara'],
          message: 'required_for_tipo_endereco'
        });
      }
      if (!value.numero_chacara) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numero_chacara'],
          message: 'required_for_tipo_endereco'
        });
      }
    }
  });

const createEnderecoV2Schema = z
  .object({
    bloco: z.string().min(1).optional(),
    andar: z.string().min(1).optional(),
    apartamento: z.string().min(1).optional(),
    tipo_logradouro_horizontal_id: z.number().int().min(1).optional(),
    tipo_logradouro_horizontal_nome: z.string().min(1).optional(),
    tipo_logradouro_horizontal_campo_nome: z.string().min(1).max(80).optional(),
    subtipo_logradouro_horizontal_id: z.number().int().min(1).optional(),
    subtipo_logradouro_horizontal_nome: z.string().min(1).optional(),
    subtipo_logradouro_horizontal_campo_nome: z.string().min(1).max(80).optional(),
    numero: z.string().min(1).optional()
  })
  .refine(
    (value) =>
      (value.bloco && value.andar && value.apartamento) ||
      (
        value.tipo_logradouro_horizontal_id &&
        value.subtipo_logradouro_horizontal_id &&
        value.tipo_logradouro_horizontal_nome &&
        value.subtipo_logradouro_horizontal_nome &&
        value.numero
      ),
    { message: 'payload_endereco_v2_incompleto' }
  );

export async function enderecoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/enderecos', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/enderecos', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.post('/enderecos', async (request, reply) => {
    const parsed = createEnderecoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    const data = await proxyToApiPython('POST', '/enderecos', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(201).send(data);
  });

  app.get('/enderecos/v2', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/enderecos/v2', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.post('/enderecos/v2', async (request, reply) => {
    const parsed = createEnderecoV2Schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }
    const data = await proxyToApiPython('POST', '/enderecos/v2', extractProxyHeaders(request.headers), parsed.data);
    return reply.status(201).send(data);
  });
}
