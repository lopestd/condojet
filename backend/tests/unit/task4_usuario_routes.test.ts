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

describe('Task4 - usuario routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('lists usuarios', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 1, nome: 'Admin' }]);
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: {
        authorization: 'Bearer token'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'GET',
      '/usuarios',
      expect.objectContaining({
        authorization: 'Bearer token'
      })
    );
    await app.close();
  });

  it('creates usuario', async () => {
    proxyMock.mockResolvedValueOnce({ id: 2 });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: {
        authorization: 'Bearer token'
      },
      payload: {
        nome: 'Porteiro 1',
        email: 'porteiro1@condojet.com',
        telefone: '(61) 99999-0001',
        senha: '123456',
        perfil: 'PORTEIRO'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/usuarios',
      expect.any(Object),
      expect.objectContaining({
        telefone: '(61) 99999-0001',
        perfil: 'PORTEIRO'
      })
    );
    await app.close();
  });

  it('updates usuario', async () => {
    proxyMock.mockResolvedValueOnce({ id: 2, updated: true });
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/usuarios/2',
      headers: {
        authorization: 'Bearer token'
      },
      payload: {
        ativo: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'PUT',
      '/usuarios/2',
      expect.any(Object),
      { ativo: false }
    );
    await app.close();
  });

  it('returns 422 for invalid create payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/usuarios',
      headers: {
        authorization: 'Bearer token'
      },
      payload: {
        nome: 'Admin'
      }
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
