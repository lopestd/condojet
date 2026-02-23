import { apiPythonClient } from './apiPythonClient.js';
import { env } from '../config/env.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncGlobalApiKeyInApiPython(maxAttempts = 20): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await apiPythonClient.post(
        '/internal/global-api-key/sync',
        {},
        {
          headers: {
            'X-Global-Api-Key': env.globalApiKey
          }
        }
      );
      await apiPythonClient.post(
        '/internal/global-admin/sync',
        {},
        {
          headers: {
            'X-Global-Api-Key': env.globalApiKey
          }
        }
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(1000);
      }
    }
  }

  throw lastError;
}
