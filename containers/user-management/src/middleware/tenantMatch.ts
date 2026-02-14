/**
 * Tenant Match Middleware
 * When X-Tenant-ID is present (from gateway), require it matches the resource org or current org.
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Require that X-Tenant-ID header (when present) matches the resource tenant.
 * Use as preHandler on routes that are tenant-scoped.
 * When called via gateway, X-Tenant-ID is set; this ensures the user cannot access another tenant's resource.
 */
export async function requireTenantMatch(
  request: FastifyRequest<{ Params?: { orgId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
  if (!headerTenantId?.trim()) {
    return;
  }

  const resourceTenantId = (request.params as { orgId?: string } | undefined)?.orgId ?? (request as any).tenantId;
  if (!resourceTenantId || resourceTenantId.trim() !== headerTenantId.trim()) {
    reply.code(403).send({ error: 'Tenant context does not match resource' });
  }
}
