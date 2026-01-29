/**
 * Augment Fastify so request.user is typed (set by auth middleware)
 * and route schema may include description/tags (OpenAPI/Swagger).
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

declare module 'fastify/types/schema' {
  interface FastifySchema {
    description?: string;
    tags?: string[];
    security?: unknown;
  }
}
