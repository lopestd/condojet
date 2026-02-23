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

describe('Task5 - endereco routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('lists enderecos', async () => {
    proxyMock.mockResolvedValueOnce([{ id: 1 }]);
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/enderecos',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/enderecos', expect.any(Object));
    await app.close();
  });

  it('creates endereco tipo QUADRA_CONJUNTO_LOTE', async () => {
    proxyMock.mockResolvedValueOnce({ id: 11 });
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/enderecos',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        tipo_endereco: 'QUADRA_CONJUNTO_LOTE',
        quadra: 'Q1',
        conjunto: 'C1',
        lote: 'L2'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/enderecos',
      expect.any(Object),
      expect.objectContaining({
        tipo_endereco: 'QUADRA_CONJUNTO_LOTE',
        quadra: 'Q1'
      })
    );
    await app.close();
  });

  it('returns 422 when tipo_endereco payload is inconsistent', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/enderecos',
      headers: {
        authorization: 'Bearer token',
        'x-api-key': 'tenant-a'
      },
      payload: {
        tipo_endereco: 'QUADRA_CONJUNTO_LOTE',
        quadra: 'Q1'
      }
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
