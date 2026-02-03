import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; tenantId: string; organizationId?: string };
  }
  interface FastifySchema {
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  }
}
