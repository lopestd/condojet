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

describe('Task6 - morador routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('lists moradores', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 1 }]);
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moradores',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/moradores', expect.any(Object));
    await app.close();
  });

  it('creates morador', async () => {
    proxyMock.mockResolvedValueOnce({ id: 7 });
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moradores',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        nome: 'Morador A',
        telefone: '61999999999',
        email: 'morador.a@condojet.com',
        endereco_id: 1,
        senha: '123456'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/moradores',
      expect.any(Object),
      expect.objectContaining({
        email: 'morador.a@condojet.com'
      })
    );
    await app.close();
  });

  it('updates morador', async () => {
    proxyMock.mockResolvedValueOnce({ id: 7, updated: true });
    const app = await buildApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/moradores/7',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        ativo: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('PUT', '/moradores/7', expect.any(Object), { ativo: false });
    await app.close();
  });

  it('returns 422 for invalid create payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moradores',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        nome: 'Morador sem email'
      }
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
