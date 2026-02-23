import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import { ApiProxyError } from '../../src/infrastructure/clients/apiPythonProxyClient.js';

type ApiRecord = {
  condominios: Array<{ id: number; nome: string; api_key: string }>;
  usuarios: Array<{ id: number; condominio_id: number; nome: string; email: string; perfil: string }>;
  enderecos: Array<{ id: number; condominio_id: number; tipo_endereco: string; quadra: string }>;
  moradores: Array<{ id: number; condominio_id: number; nome: string; endereco_id: number }>;
  encomendas: Array<{ id: number; condominio_id: number; morador_id: number; status: string; codigo_interno: string }>;
};

const { proxyImpl } = vi.hoisted(() => ({
  proxyImpl: vi.fn()
}));

vi.mock('../../src/infrastructure/clients/apiPythonProxyClient.js', async () => {
  const actual = await vi.importActual<object>('../../src/infrastructure/clients/apiPythonProxyClient.js');
  return {
    ...actual,
    proxyToApiPython: proxyImpl
  };
});

describe('Task8 - backend functional scenarios', () => {
  let record: ApiRecord;

  beforeEach(() => {
    record = {
      condominios: [],
      usuarios: [],
      enderecos: [],
      moradores: [],
      encomendas: []
    };
    proxyImpl.mockReset();
    proxyImpl.mockImplementation(async (method, path, headers, payload) => {
      const tokenTenant = headers.authorization?.includes('tenant=1')
        ? 1
        : headers.authorization?.includes('tenant=2')
          ? 2
          : undefined;
      const tenantId = tokenTenant;

      if (headers.authorization?.includes('tenant=mismatch')) {
        throw new ApiProxyError(403, { code: 'tenant_mismatch', message: 'tenant_mismatch' });
      }

      if (method === 'POST' && path === '/condominios') {
        const id = record.condominios.length + 1;
        const model = { id, nome: payload.nome, api_key: id === 1 ? 'tenant-a-key' : 'tenant-b-key' };
        record.condominios.push(model);
        return {
          ...model,
          admin: { id: id * 100, email: payload.admin.email, telefone: payload.admin.telefone, perfil: 'ADMIN' }
        };
      }

      if (method === 'POST' && path === '/usuarios') {
        const id = record.usuarios.length + 1;
        const model = { id, condominio_id: tenantId ?? payload.condominio_id ?? 1, nome: payload.nome, email: payload.email, perfil: payload.perfil };
        record.usuarios.push(model);
        return { id: model.id };
      }

      if (method === 'GET' && path === '/usuarios') {
        return record.usuarios.filter((item) => tenantId === undefined || item.condominio_id === tenantId);
      }

      if (method === 'POST' && path === '/enderecos') {
        const id = record.enderecos.length + 1;
        const model = { id, condominio_id: tenantId ?? 1, tipo_endereco: payload.tipo_endereco, quadra: payload.quadra };
        record.enderecos.push(model);
        return { id: model.id };
      }

      if (method === 'POST' && path === '/moradores') {
        const id = record.moradores.length + 1;
        const model = { id, condominio_id: tenantId ?? 1, nome: payload.nome, endereco_id: payload.endereco_id };
        record.moradores.push(model);
        return { id: model.id };
      }

      if (method === 'POST' && path === '/encomendas') {
        const id = record.encomendas.length + 1;
        const model = { id, condominio_id: tenantId ?? 1, morador_id: payload.morador_id, status: 'RECEBIDA', codigo_interno: `ENC-${id}` };
        record.encomendas.push(model);
        return { id: model.id, status: model.status, codigo_interno: model.codigo_interno };
      }

      if (method === 'PUT' && path.endsWith('/entregar')) {
        const id = Number(path.split('/')[2]);
        const item = record.encomendas.find((entry) => entry.id === id);
        if (!item) throw new ApiProxyError(404, { code: 'encomenda_not_found' });
        item.status = 'ENTREGUE';
        return { id: item.id, status: item.status };
      }

      if (method === 'GET' && path === '/minhas-encomendas') {
        return record.encomendas
          .filter((item) => tenantId === undefined || item.condominio_id === tenantId)
          .map((item) => ({ id: item.id, status: item.status, codigo_interno: item.codigo_interno }));
      }

      return {};
    });
  });

  it('runs main functional flow for two condominios', async () => {
    const app = await buildApp();

    const condoA = await app.inject({
      method: 'POST',
      url: '/api/v1/condominios',
      headers: {},
      payload: {
        nome: 'Condominio A',
        admin: { nome: 'Admin A', email: 'admin.a@condojet.com', telefone: '61999998888', senha: '123456' }
      }
    });
    const condoB = await app.inject({
      method: 'POST',
      url: '/api/v1/condominios',
      headers: {},
      payload: {
        nome: 'Condominio B',
        admin: { nome: 'Admin B', email: 'admin.b@condojet.com', telefone: '61999997777', senha: '123456' }
      }
    });
    expect(condoA.statusCode).toBe(201);
    expect(condoB.statusCode).toBe(201);

    const admin = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: { nome: 'Admin A', email: 'admin.a@condojet.com', senha: '123', perfil: 'ADMIN' }
    });
    const porteiro = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: { nome: 'Porteiro A', email: 'porteiro.a@condojet.com', senha: '123', perfil: 'PORTEIRO' }
    });
    expect(admin.statusCode).toBe(201);
    expect(porteiro.statusCode).toBe(201);

    const endereco1 = await app.inject({
      method: 'POST',
      url: '/api/v1/enderecos',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: { tipo_endereco: 'QUADRA_CONJUNTO_LOTE', quadra: 'Q1', conjunto: 'C1', lote: 'L1' }
    });
    const endereco2 = await app.inject({
      method: 'POST',
      url: '/api/v1/enderecos',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: { tipo_endereco: 'QUADRA_SETOR_CHACARA', quadra: 'Q2', setor_chacara: 'S1', numero_chacara: 'N7' }
    });
    expect(endereco1.statusCode).toBe(201);
    expect(endereco2.statusCode).toBe(201);

    const morador1 = await app.inject({
      method: 'POST',
      url: '/api/v1/moradores',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: {
        nome: 'Morador 1',
        telefone: '61911111111',
        email: 'morador1@condojet.com',
        endereco_id: 1,
        senha: '123'
      }
    });
    const morador2 = await app.inject({
      method: 'POST',
      url: '/api/v1/moradores',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: {
        nome: 'Morador 2',
        telefone: '61922222222',
        email: 'morador2@condojet.com',
        endereco_id: 2,
        senha: '123'
      }
    });
    expect(morador1.statusCode).toBe(201);
    expect(morador2.statusCode).toBe(201);

    const encomenda = await app.inject({
      method: 'POST',
      url: '/api/v1/encomendas',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: {
        tipo: 'PACOTE',
        morador_id: 1,
        endereco_id: 1
      }
    });
    expect(encomenda.statusCode).toBe(201);

    const entregar = await app.inject({
      method: 'PUT',
      url: '/api/v1/encomendas/1/entregar',
      headers: { authorization: 'Bearer token tenant=1' },
      payload: {
        retirado_por_nome: 'Morador 1'
      }
    });
    expect(entregar.statusCode).toBe(200);
    expect(entregar.json()).toEqual({ id: 1, status: 'ENTREGUE' });

    const minhas = await app.inject({
      method: 'GET',
      url: '/api/v1/minhas-encomendas',
      headers: { authorization: 'Bearer token tenant=1' }
    });
    expect(minhas.statusCode).toBe(200);
    expect(minhas.json()).toEqual([{ id: 1, status: 'ENTREGUE', codigo_interno: 'ENC-1' }]);

    await app.close();
  });

  it('propagates tenant_mismatch from api python', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: {
        authorization: 'Bearer token tenant=mismatch'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      code: 'tenant_mismatch',
      message: 'tenant_mismatch'
    });
    await app.close();
  });
});
