import type { FastifyInstance } from 'fastify';

export async function registerRequestContext(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request, reply) => {
    const incomingRequestId = request.headers['x-request-id'];
    if (typeof incomingRequestId === 'string' && incomingRequestId.trim()) {
      reply.header('X-Request-Id', incomingRequestId);
      return;
    }
    reply.header('X-Request-Id', request.id);
  });
}
