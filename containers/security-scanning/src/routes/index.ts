/**
 * Route registration for security_scanning module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { SecurityScanningService } from '../services/SecurityScanningService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const securityScanningService = new SecurityScanningService();

    // Get scan status
    fastify.get<{ Params: { scanId: string } }>(
      '/api/v1/security/scans/:scanId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get security scan status',
          tags: ['Security'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { scanId } = request.params;
          const tenantId = request.user!.tenantId;

          const scan = await securityScanningService.getScan(scanId, tenantId);

          if (!scan) {
            return reply.status(404).send({
              error: {
                code: 'SCAN_NOT_FOUND',
                message: 'Security scan not found',
              },
            });
          }

          return reply.send(scan);
        } catch (error: any) {
          log.error('Failed to get scan', error, { service: 'security-scanning' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'SCAN_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve security scan',
            },
          });
        }
      }
    );

    // Trigger security scan
    fastify.post<{ Body: { targetId: string; targetType: 'shard' | 'document' | 'field'; scanType: 'pii' | 'secret' | 'vulnerability' } }>(
      '/api/v1/security/scans',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger security scan',
          tags: ['Security'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { targetId, targetType, scanType } = request.body;
          const tenantId = request.user!.tenantId;

          const scan = await securityScanningService.scanSecurity(tenantId, targetId, targetType, scanType);

          return reply.status(202).send({
            scanId: scan.scanId,
            status: scan.status,
            message: 'Security scan started',
          });
        } catch (error: any) {
          log.error('Failed to trigger security scan', error, { service: 'security-scanning' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'SCAN_TRIGGER_FAILED',
              message: error.message || 'Failed to trigger security scan',
            },
          });
        }
      }
    );

    log.info('Security scanning routes registered', { service: 'security-scanning' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'security-scanning' });
    throw error;
  }
}
