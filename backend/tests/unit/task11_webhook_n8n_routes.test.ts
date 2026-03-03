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

describe('Task11 - webhook n8n routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('lists webhooks by contexto', async () => {
    proxyMock.mockResolvedValueOnce({ contexto: 'whatsapp', items: [] });
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhooks-n8n?contexto=whatsapp',
      headers: {
        authorization: 'Bearer token'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/webhooks-n8n?contexto=whatsapp', expect.any(Object));
    await app.close();
  });

  it('upserts webhook', async () => {
    proxyMock.mockResolvedValueOnce({ tipo: 'whatsapp_query', ativo: true, url: 'https://n8n.local/webhook/query' });
    const app = await buildApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/webhooks-n8n/whatsapp_query',
      headers: {
        authorization: 'Bearer token'
      },
      payload: {
        url: 'https://n8n.local/webhook/query',
        ativo: true
      }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'PUT',
      '/webhooks-n8n/whatsapp_query',
      expect.any(Object),
      expect.objectContaining({
        ativo: true
      })
    );
    await app.close();
  });

  it('rejects invalid webhook type', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhooks-n8n/outro_tipo',
      headers: {
        authorization: 'Bearer token'
      }
    });

    expect(response.statusCode).toBe(422);
    expect(proxyMock).not.toHaveBeenCalled();
    await app.close();
  });
});
