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

describe('Task10 - configuracao routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('gets configuracoes', async () => {
    proxyMock.mockResolvedValueOnce({ timezone: 'America/Sao_Paulo', prazo_dias_encomenda_esquecida: 15 });
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/configuracoes',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/configuracoes', expect.any(Object));
    await app.close();
  });

  it('updates timezone only', async () => {
    proxyMock.mockResolvedValueOnce({ timezone: 'America/Fortaleza', prazo_dias_encomenda_esquecida: 15 });
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/configuracoes',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        timezone: 'America/Fortaleza'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('PUT', '/configuracoes', expect.any(Object), {
      timezone: 'America/Fortaleza'
    });
    await app.close();
  });

  it('updates forgotten threshold only', async () => {
    proxyMock.mockResolvedValueOnce({ timezone: 'America/Sao_Paulo', prazo_dias_encomenda_esquecida: 10 });
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/configuracoes',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        prazo_dias_encomenda_esquecida: 10
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('PUT', '/configuracoes', expect.any(Object), {
      prazo_dias_encomenda_esquecida: 10
    });
    await app.close();
  });

  it('returns 422 when payload is empty', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/configuracoes',
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
