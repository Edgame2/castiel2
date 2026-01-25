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

    // Detect PII
    fastify.post<{ Body: { contentId: string; content: string } }>(
      '/api/v1/security/pii/detect',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Detect PII in content',
          tags: ['Security'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { contentId, content } = request.body;
          const tenantId = request.user!.tenantId;

          const detection = await securityScanningService.detectPII(tenantId, contentId, content);

          return reply.send(detection);
        } catch (error: any) {
          log.error('Failed to detect PII', error, { service: 'security-scanning' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'PII_DETECTION_FAILED',
              message: error.message || 'Failed to detect PII',
            },
          });
        }
      }
    );

    // Redact PII
    fastify.post<{ Body: { contentId: string; content: string } }>(
      '/api/v1/security/pii/redact',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Redact PII from content',
          tags: ['Security'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { contentId, content } = request.body;
          const tenantId = request.user!.tenantId;

          const redactedContent = await securityScanningService.redactPII(tenantId, contentId, content);

          return reply.send({ redactedContent });
        } catch (error: any) {
          log.error('Failed to redact PII', error, { service: 'security-scanning' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'PII_REDACTION_FAILED',
              message: error.message || 'Failed to redact PII',
            },
          });
        }
      }
    );

    // Get PII detection
    fastify.get<{ Params: { detectionId: string } }>(
      '/api/v1/security/pii/detections/:detectionId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get PII detection by ID',
          tags: ['Security'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { detectionId } = request.params;
          const tenantId = request.user!.tenantId;

          const detection = await securityScanningService.getPIIDetection(detectionId, tenantId);

          if (!detection) {
            return reply.status(404).send({
              error: {
                code: 'DETECTION_NOT_FOUND',
                message: 'PII detection not found',
              },
            });
          }

          return reply.send(detection);
        } catch (error: any) {
          log.error('Failed to get PII detection', error, { service: 'security-scanning' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'DETECTION_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve PII detection',
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
