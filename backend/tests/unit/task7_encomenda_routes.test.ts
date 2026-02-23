import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';

const { proxyMock } = vi.hoisted(() => ({
  proxyMock: vi.fn()
}));

vi.mock('../../src/infrastructure/clients/apiPythonProxyClient.js', async () => {
  const actual = await vi.importActual<object>('../../src/infrastructure/clients/apiPythonProxyClient.js');
  return {
    ...actual,
    proxyToApiPython: proxyMock
  };
});

describe('Task7 - encomenda routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('creates encomenda', async () => {
    proxyMock.mockResolvedValueOnce({ id: 1, status: 'RECEBIDA' });
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/encomendas',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        tipo: 'PACOTE',
        morador_id: 3,
        endereco_id: 8,
        codigo_externo: 'BR123',
        descricao: 'Caixa',
        empresa_entregadora: 'Mercado Livre'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/encomendas',
      expect.any(Object),
      expect.objectContaining({ morador_id: 3 })
    );
    await app.close();
  });

  it('lists encomendas and gets one by id', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce({ id: 1, status: 'RECEBIDA' });
    const app = await buildApp();

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/encomendas',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });
    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/encomendas/1',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(getResponse.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenNthCalledWith(1, 'GET', '/encomendas', expect.any(Object));
    expect(proxyMock).toHaveBeenNthCalledWith(2, 'GET', '/encomendas/1', expect.any(Object));
    await app.close();
  });

  it('delivers and reopens encomenda', async () => {
    proxyMock.mockResolvedValueOnce({ id: 1, status: 'ENTREGUE' }).mockResolvedValueOnce({
      id: 1,
      status: 'DISPONIVEL_RETIRADA'
    });
    const app = await buildApp();

    const entregaResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/encomendas/1/entregar',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        retirado_por_nome: 'Joao'
      }
    });
    const reabrirResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/encomendas/1/reabrir',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        motivo_reabertura: 'Erro de baixa'
      }
    });

    expect(entregaResponse.statusCode).toBe(200);
    expect(reabrirResponse.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenNthCalledWith(
      1,
      'PUT',
      '/encomendas/1/entregar',
      expect.any(Object),
      { retirado_por_nome: 'Joao' }
    );
    expect(proxyMock).toHaveBeenNthCalledWith(
      2,
      'PUT',
      '/encomendas/1/reabrir',
      expect.any(Object),
      { motivo_reabertura: 'Erro de baixa' }
    );
    await app.close();
  });

  it('lists minhas encomendas', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 2, status: 'RECEBIDA' }]);
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/minhas-encomendas',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/minhas-encomendas', expect.any(Object));
    await app.close();
  });

  it('returns 422 for invalid entrega payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/encomendas/1/entregar',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {}
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
