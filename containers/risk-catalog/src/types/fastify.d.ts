/**
 * Augment Fastify so request.user is typed (set by auth middleware).
 */
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      tenantId: string;
    };
  }
}
