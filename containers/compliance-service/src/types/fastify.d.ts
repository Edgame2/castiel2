import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; tenantId: string; [key: string]: unknown };
  }
}
