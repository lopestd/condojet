import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { proxyToApiPython } from '../../../infrastructure/clients/apiPythonProxyClient.js';
import { buildValidationError, extractProxyHeaders } from '../utils/proxyRequest.js';

function formatBrazilPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizePhoneOrThrow(phone: string): string {
  const formatted = formatBrazilPhone(phone);
  if (formatted === null) {
    throw new Error('invalid_phone');
  }
  return formatted;
}

const createCondominioSchema = z.object({
  nome: z.string().min(2).max(150),
  admin: z.object({
    nome: z.string().min(2).max(120),
    email: z.string().email(),
    senha: z.string().min(6).max(120),
    telefone: z.string().min(10).max(20)
  })
});

const updateCondominioSchema = z
  .object({
    nome: z.string().min(2).max(150).optional(),
    ativo: z.boolean().optional()
  })
  .refine((value) => value.nome !== undefined || value.ativo !== undefined, {
    message: 'at_least_one_field_required'
  });

const condominioIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createAdminCondominioSchema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email(),
  senha: z.string().min(6).max(120),
  telefone: z.string().min(10).max(20)
});

const updateAdminCondominioSchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    senha: z.string().min(6).max(120).optional(),
    telefone: z.string().min(10).max(20).optional(),
    responsavel_sistema: z.boolean().optional(),
    ativo: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.nome !== undefined ||
      value.senha !== undefined ||
      value.telefone !== undefined ||
      value.responsavel_sistema !== undefined ||
      value.ativo !== undefined,
    {
    message: 'at_least_one_field_required'
    }
  );

const adminCondominioParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  usuarioId: z.coerce.number().int().positive()
});

export async function condominioRoutes(app: FastifyInstance): Promise<void> {
  app.post('/condominios', async (request, reply) => {
    const parsed = createCondominioSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(buildValidationError(parsed.error));
    }

    let telefone: string;
    try {
      telefone = normalizePhoneOrThrow(parsed.data.admin.telefone);
    } catch {
      return reply.status(422).send({ code: 'validation_error', message: 'invalid_phone' });
    }

    const data = await proxyToApiPython('POST', '/condominios', extractProxyHeaders(request.headers), {
      ...parsed.data,
      admin: {
        ...parsed.data.admin,
        telefone
      }
    });
    return reply.status(201).send(data);
  });

  app.get('/admin/condominios', async (request, reply) => {
    const data = await proxyToApiPython('GET', '/admin/condominios', extractProxyHeaders(request.headers));
    return reply.status(200).send(data);
  });

  app.put('/admin/condominios/:id', async (request, reply) => {
    const params = condominioIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }
    const body = updateCondominioSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }
    const data = await proxyToApiPython(
      'PUT',
      `/admin/condominios/${params.data.id}`,
      extractProxyHeaders(request.headers),
      body.data
    );
    return reply.status(200).send(data);
  });

  app.post('/admin/condominios/:id/admins', async (request, reply) => {
    const params = condominioIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }
    const body = createAdminCondominioSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }
    let telefone: string;
    try {
      telefone = normalizePhoneOrThrow(body.data.telefone);
    } catch {
      return reply.status(422).send({ code: 'validation_error', message: 'invalid_phone' });
    }

    const data = await proxyToApiPython('POST', `/admin/condominios/${params.data.id}/admins`, extractProxyHeaders(request.headers), {
      ...body.data,
      telefone
    });
    return reply.status(201).send(data);
  });

  app.get('/admin/condominios/:id/admins', async (request, reply) => {
    const params = condominioIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }
    const data = await proxyToApiPython(
      'GET',
      `/admin/condominios/${params.data.id}/admins`,
      extractProxyHeaders(request.headers)
    );
    return reply.status(200).send(data);
  });

  app.put('/admin/condominios/:id/admins/:usuarioId', async (request, reply) => {
    const params = adminCondominioParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send(buildValidationError(params.error));
    }
    const body = updateAdminCondominioSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send(buildValidationError(body.error));
    }
    let payload = body.data;
    if (body.data.telefone !== undefined) {
      let telefone: string;
      try {
        telefone = normalizePhoneOrThrow(body.data.telefone);
      } catch {
        return reply.status(422).send({ code: 'validation_error', message: 'invalid_phone' });
      }
      payload = { ...body.data, telefone };
    }

    const data = await proxyToApiPython(
      'PUT',
      `/admin/condominios/${params.data.id}/admins/${params.data.usuarioId}`,
      extractProxyHeaders(request.headers),
      payload
    );
    return reply.status(200).send(data);
  });
}
