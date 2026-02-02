/**
 * Extend FastifyRequest with user set by JWT/auth middleware
 */
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      tenantId: string;
      [key: string]: unknown;
    };
  }
}
