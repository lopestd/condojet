import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

describe('Task1 - app foundation', () => {
  it('returns health status', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'condojet-backend-bff'
    });
    await app.close();
  });

  it('propagates request id header', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: {
        'x-request-id': 'task1-req-1'
      }
    });
    expect(response.headers['x-request-id']).toBe('task1-req-1');
    await app.close();
  });
});
