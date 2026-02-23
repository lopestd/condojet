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

describe('Task2 - auth routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('proxies login with global backend headers', async () => {
    proxyMock.mockResolvedValueOnce({ access_token: 't', role: 'ADMIN', condominio_id: 1 });
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {
        'x-request-id': 'req-auth-1'
      },
      payload: {
        email: 'admin@condojet.com',
        senha: '123456',
        condominio_id: 1
      }
    });
    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledTimes(1);
    expect(proxyMock.mock.calls[0][0]).toBe('POST');
    expect(proxyMock.mock.calls[0][1]).toBe('/auth/login');
    expect(proxyMock.mock.calls[0][2]).toMatchObject({
      xRequestId: 'req-auth-1'
    });
    await app.close();
  });

  it('returns 422 for invalid login payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {
        'x-api-key': 'tenant-a'
      },
      payload: {
        email: 'invalid-email',
        condominio_id: 1
      }
    });
    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
