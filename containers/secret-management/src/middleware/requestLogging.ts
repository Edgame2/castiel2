/**
 * Request Logging Middleware
 * 
 * Logs all API requests for monitoring and debugging.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getLoggingClient } from '../services/logging/LoggingClient';

export async function requestLoggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const user = (request as any).user;
  
  // Log request received
  await getLoggingClient().sendLog({
    level: 'info',
    message: 'API request received',
    service: 'secret-management',
    metadata: {
      method: request.method,
      path: request.url,
      userId: user?.id,
      organizationId: user?.organizationId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    },
  });
  
  // Hook into reply finish to log completion
  (reply as any).addHook('onSend', async (request: any, reply: any) => {
    const duration = Date.now() - startTime;
    
    await getLoggingClient().sendLog({
      level: reply.statusCode >= 400 ? 'error' : 'info',
      message: 'API request completed',
      service: 'secret-management',
      metadata: {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        duration,
        userId: user?.id,
        organizationId: user?.organizationId,
      },
    });
  });
}
