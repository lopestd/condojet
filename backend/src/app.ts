import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from './infrastructure/config/env.js';
import { authRoutes } from './interfaces/http/routes/authRoutes.js';
import { condominioRoutes } from './interfaces/http/routes/condominioRoutes.js';
import { errorHandler } from './interfaces/http/middlewares/errorHandler.js';
import { registerRequestContext } from './interfaces/http/middlewares/requestContext.js';
import { encomendaRoutes } from './interfaces/http/routes/encomendaRoutes.js';
import { enderecoRoutes } from './interfaces/http/routes/enderecoRoutes.js';
import { healthRoutes } from './interfaces/http/routes/healthRoutes.js';
import { moradorRoutes } from './interfaces/http/routes/moradorRoutes.js';
import { usuarioRoutes } from './interfaces/http/routes/usuarioRoutes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, env.corsOrigins.includes(origin));
    },
    credentials: true
  });

  await registerRequestContext(app);
  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(condominioRoutes, { prefix: '/api/v1' });
  await app.register(usuarioRoutes, { prefix: '/api/v1' });
  await app.register(enderecoRoutes, { prefix: '/api/v1' });
  await app.register(moradorRoutes, { prefix: '/api/v1' });
  await app.register(encomendaRoutes, { prefix: '/api/v1' });

  return app;
}
