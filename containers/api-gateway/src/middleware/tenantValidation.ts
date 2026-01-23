/**
 * Tenant Validation Middleware
 * Extracts tenantId from JWT and injects X-Tenant-ID header
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Tenant validation middleware
 * Extracts tenantId from JWT token and injects X-Tenant-ID header
 */
export async function tenantValidationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Skip for health checks and public endpoints
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    // Get JWT payload from request (set by JWT plugin)
    const user = (request as any).user;
    
    if (!user) {
      // Try to verify token manually if not already verified
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing or invalid authorization header' });
        return;
      }

      const token = authHeader.substring(7);
      try {
        const decoded = request.server.jwt.verify(token) as any;
        (request as any).user = decoded;
        
        // Extract tenantId from token
        const tenantId = decoded.tenantId || decoded.organizationId;
        
        if (!tenantId) {
          reply.code(400).send({ error: 'Missing tenantId in token' });
          return;
        }

        // Validate tenantId format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId)) {
          reply.code(400).send({ error: 'Invalid tenantId format' });
          return;
        }

        // Inject X-Tenant-ID header (immutable, cannot be overridden)
        request.headers['x-tenant-id'] = tenantId;
        (request as any).tenantId = tenantId;
      } catch (error) {
        reply.code(401).send({ error: 'Invalid or expired token' });
        return;
      }
    } else {
      // User already verified, extract tenantId
      const tenantId = user.tenantId || user.organizationId;
      
      if (!tenantId) {
        reply.code(400).send({ error: 'Missing tenantId in token' });
        return;
      }

      // Validate tenantId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        reply.code(400).send({ error: 'Invalid tenantId format' });
        return;
      }

      // Inject X-Tenant-ID header
      request.headers['x-tenant-id'] = tenantId;
      (request as any).tenantId = tenantId;
    }
  } catch (error) {
    reply.code(500).send({ error: 'Tenant validation failed' });
  }
}

