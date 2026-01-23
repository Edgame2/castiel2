/**
 * Audit Access Middleware
 * Logs access to audit logs (meta-auditing)
 * Per ModuleImplementationGuide Section 11: Security
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { log } from '../utils/logger';
import { IngestionService } from '../services/IngestionService';
import { LogCategory, LogSeverity } from '../types';

/**
 * Paths that should be audited when accessed
 */
const AUDITED_PATHS = [
  { pattern: /^\/api\/v1\/logs$/, method: 'GET', action: 'audit.logs.searched' },
  { pattern: /^\/api\/v1\/logs\/[^/]+$/, method: 'GET', action: 'audit.log.viewed' },
  { pattern: /^\/api\/v1\/logs\/search$/, method: 'GET', action: 'audit.logs.searched' },
  { pattern: /^\/api\/v1\/logs\/export$/, method: 'POST', action: 'audit.logs.exported' },
  { pattern: /^\/api\/v1\/export\/[^/]+\/download$/, method: 'GET', action: 'audit.export.downloaded' },
  { pattern: /^\/api\/v1\/verification\/verify$/, method: 'POST', action: 'audit.chain.verified' },
];

/**
 * Create audit access logging hook
 */
export function createAuditAccessHook(app: FastifyInstance) {
  return async function auditAccess(request: FastifyRequest, reply: FastifyReply) {
    // Only audit after successful responses
    const originalSend = reply.send.bind(reply);
    
    reply.send = function(payload: any) {
      // Check if this path should be audited
      const auditedPath = AUDITED_PATHS.find(
        p => p.pattern.test(request.url) && p.method === request.method
      );
      
      if (auditedPath && reply.statusCode >= 200 && reply.statusCode < 300) {
        // Fire and forget - don't block the response
        auditLogAccess(app, request, auditedPath.action).catch(err => {
          log.error('Failed to audit log access', err);
        });
      }
      
      return originalSend(payload);
    };
  };
}

/**
 * Log access to audit logs
 */
async function auditLogAccess(
  app: FastifyInstance,
  request: FastifyRequest,
  action: string
): Promise<void> {
  const ingestionService = (app as any).ingestionService as IngestionService | undefined;
  
  if (!ingestionService) {
    return;
  }
  
  const user = (request as any).user;
  
  if (!user) {
    return; // Only audit authenticated access
  }
  
  // Extract relevant info from request
  const params = request.params as Record<string, string>;
  const query = request.query as Record<string, unknown>;
  
  const metadata: Record<string, unknown> = {
    path: request.url,
    method: request.method,
    query: sanitizeQuery(query),
  };
  
  // Add log ID if viewing a specific log
  if (params.id) {
    metadata.viewedLogId = params.id;
  }
  
  try {
    await ingestionService.ingest({
      action,
      category: LogCategory.ACCESS,
      severity: LogSeverity.INFO,
      message: `User ${user.email} accessed audit logs`,
      metadata,
      resourceType: 'audit_log',
      resourceId: params.id,
    }, {
      organizationId: user.organizationId,
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  } catch (error) {
    log.error('Failed to log audit access', error);
  }
}

/**
 * Sanitize query parameters for logging (remove sensitive data)
 */
function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Truncate long values
    if (typeof value === 'string' && value.length > 100) {
      sanitized[key] = value.substring(0, 100) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}



