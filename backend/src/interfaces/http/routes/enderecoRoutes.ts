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
}
