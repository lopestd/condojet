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

describe('Task3 - condominio routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('creates condominio with admin and global api key', async () => {
    proxyMock.mockResolvedValueOnce({ id: 10, nome: 'Condo A', api_key: 'condojet_x', admin: { id: 99 } });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/condominios',
      headers: {
        'x-request-id': 'req-condo-1'
      },
      payload: {
        nome: 'Condo A',
        admin: {
          nome: 'Admin A',
          email: 'admin.a@condojet.com',
          senha: '123456',
          telefone: '61999887766'
        }
      }
    });

    expect(response.statusCode).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/condominios',
      expect.objectContaining({
        xRequestId: 'req-condo-1'
      }),
      {
        nome: 'Condo A',
        admin: {
          nome: 'Admin A',
          email: 'admin.a@condojet.com',
          senha: '123456',
          telefone: '(61) 99988-7766'
        }
      }
    );
    await app.close();
  });

  it('returns 422 for invalid payload', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/condominios',
      headers: {
      },
      payload: {
        nome: ''
      }
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('lists condominios in global admin route', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 1, nome: 'Condo A', ativo: true }]);
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/condominios',
      headers: {
        authorization: 'Bearer global-token'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'GET',
      '/admin/condominios',
      expect.objectContaining({
        authorization: 'Bearer global-token'
      })
    );
    await app.close();
  });

  it('lists admins from selected condominio', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 91, nome: 'Admin A', perfil: 'ADMIN', ativo: true }]);
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/condominios/10/admins',
      headers: {
        authorization: 'Bearer global-token'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'GET',
      '/admin/condominios/10/admins',
      expect.objectContaining({
        authorization: 'Bearer global-token'
      })
    );
    await app.close();
  });
});
