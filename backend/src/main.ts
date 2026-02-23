import { buildApp } from './app.js';
import { syncGlobalApiKeyInApiPython } from './infrastructure/clients/globalApiKeySyncClient.js';
import { env } from './infrastructure/config/env.js';
import { logger } from './infrastructure/logger/logger.js';

async function bootstrap(): Promise<void> {
  await syncGlobalApiKeyInApiPython();
  logger.info('GLOBAL_API_KEY synchronized in API Python');

  const app = await buildApp();

  await app.listen({ port: env.port, host: '0.0.0.0' });
  logger.info(`Backend BFF running on port ${env.port}`);
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Failed to start backend');
  process.exit(1);
});
