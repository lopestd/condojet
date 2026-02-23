import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../src/infrastructure/clients/apiPythonClient.js', () => {
  return {
    apiPythonClient: {
      request: requestMock,
      post: postMock
    }
  };
});

describe('Task9 - global api key integration', () => {
  beforeEach(() => {
    requestMock.mockReset();
    postMock.mockReset();
    vi.resetModules();
    process.env.BFF_GLOBAL_API_KEY = 'global-key-test';
    process.env.API_GLOBAL_API_KEY = 'global-key-test';
  });

  it('always sends GLOBAL-API-KEY in backend -> api proxy calls', async () => {
    requestMock.mockResolvedValueOnce({ data: { ok: true } });

    const { proxyToApiPython } = await import('../../src/infrastructure/clients/apiPythonProxyClient.js');
    await proxyToApiPython('GET', '/usuarios', { authorization: 'Bearer t' });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const payload = requestMock.mock.calls[0][0];
    expect(payload.headers['X-API-Key']).toBe('global-key-test');
  });

  it('syncs GLOBAL-API-KEY on backend startup integration routine', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'ok' } });
    postMock.mockResolvedValueOnce({ data: { status: 'ok' } });
    const { syncGlobalApiKeyInApiPython } = await import('../../src/infrastructure/clients/globalApiKeySyncClient.js');

    await syncGlobalApiKeyInApiPython(1);

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/internal/global-api-key/sync',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Global-Api-Key': 'global-key-test'
        })
      })
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/internal/global-admin/sync',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Global-Api-Key': 'global-key-test'
        })
      })
    );
  });
});
