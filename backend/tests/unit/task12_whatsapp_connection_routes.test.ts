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

describe('Task12 - whatsapp connection routes', () => {
  beforeEach(() => {
    proxyMock.mockReset();
  });

  it('lists connections', async () => {
    proxyMock.mockResolvedValueOnce({ items: [] });
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/conexoes',
      headers: { authorization: 'Bearer token' }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith('GET', '/whatsapp/conexoes', expect.any(Object));
    await app.close();
  });

  it('creates connection with valid phone', async () => {
    proxyMock.mockResolvedValueOnce({ ok: true });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/conexoes',
      headers: { authorization: 'Bearer token' },
      payload: { instanceName: 'condo-zap', phone: '(62) 99999-9999' }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/whatsapp/conexoes',
      expect.any(Object),
      expect.objectContaining({ phone: '62999999999' })
    );
    await app.close();
  });

  it('renews qr', async () => {
    proxyMock.mockResolvedValueOnce({ ok: true });
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/conexoes/condo-zap/renovar-qr',
      headers: { authorization: 'Bearer token' },
      payload: { phone: '62999999999' }
    });

    expect(response.statusCode).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith(
      'POST',
      '/whatsapp/conexoes/condo-zap/renovar-qr',
      expect.any(Object),
      expect.objectContaining({ phone: '62999999999' })
    );
    await app.close();
  });
});
