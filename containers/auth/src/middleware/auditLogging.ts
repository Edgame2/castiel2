/**
 * Audit Logging Helper
 * 
 * Provides utilities for logging API actions for compliance and security.
 * Uses LoggingService for audit logging.
 */

import { FastifyRequest } from 'fastify';
import { getLoggingService } from '../services/LoggingService';

/**
 * Extract IP address from request
 */
function getIpAddress(request: FastifyRequest): string | undefined {
  // Check X-Forwarded-For header (for proxies)
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  // Check X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to socket remote address
  return request.socket.remoteAddress;
}

/**
 * Log audit action
 */
export async function logAuditAction(
  request: FastifyRequest,
  action: string,
  resourceType: string,
  metadata?: {
    resourceId?: string;
    userId?: string;
    projectId?: string;
    beforeState?: any;
    afterState?: any;
    [key: string]: any;
  }
): Promise<void> {
  const user = (request as any).user;
  const userId = user?.id || metadata?.userId;
  const tenantId = (request as any).tenantId || metadata?.projectId;
  const resourceId = metadata?.resourceId;
  
  const loggingService = getLoggingService();
  
  // Determine category based on action
  let category: 'ACTION' | 'ACCESS' | 'SECURITY' | 'SYSTEM' | 'CUSTOM' = 'ACTION';
  if (action.includes('login') || action.includes('auth') || action.includes('sso')) {
    category = 'SECURITY';
  } else if (action.includes('access') || action.includes('view')) {
    category = 'ACCESS';
  }

  // Determine severity
  let severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' = 'INFO';
  if (action.includes('delete') || action.includes('disable')) {
    severity = 'WARN';
  } else if (action.includes('error') || action.includes('fail')) {
    severity = 'ERROR';
  }

  await loggingService.logFromRequest(
    request,
    action,
    `${action} on ${resourceType}${resourceId ? ` (${resourceId})` : ''}`,
    {
      category,
      severity,
      resourceType,
      resourceId,
      metadata: {
        ...metadata,
        ipAddress: getIpAddress(request),
        userAgent: request.headers['user-agent'],
      },
    }
  );
}

