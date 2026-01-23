/**
 * Route Registration
 * Security Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { SecurityScanService } from '../services/SecurityScanService';
import { SecurityScannerService } from '../services/SecurityScannerService';
import {
  CreateSecurityScanInput,
  UpdateSecurityScanInput,
  RunSecurityScanInput,
  SecurityScanType,
  SecurityScanStatus,
} from '../types/security.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const scanService = new SecurityScanService();
  const scannerService = new SecurityScannerService(scanService);

  // ===== SECURITY SCAN ROUTES =====

  /**
   * Create security scan
   * POST /api/v1/security/scans
   */
  app.post<{ Body: Omit<CreateSecurityScanInput, 'tenantId' | 'userId'> }>(
    '/api/v1/security/scans',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new security scan',
        tags: ['Security Scans'],
        body: {
          type: 'object',
          required: ['type', 'target'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['secret_scan', 'vulnerability_scan', 'pii_detection', 'sast', 'dast', 'sca', 'compliance_check', 'threat_detection', 'custom'] },
            target: {
              type: 'object',
              required: ['type', 'path'],
              properties: {
                type: { type: 'string', enum: ['file', 'directory', 'module', 'project', 'dependency', 'endpoint'] },
                path: { type: 'string' },
                identifier: { type: 'string' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Security scan created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateSecurityScanInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const scan = await scanService.create(input);
      reply.code(201).send(scan);
    }
  );

  /**
   * Get scan by ID
   * GET /api/v1/security/scans/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/security/scans/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get security scan by ID',
        tags: ['Security Scans'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Security scan details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const scan = await scanService.getById(request.params.id, tenantId);
      reply.send(scan);
    }
  );

  /**
   * Update scan
   * PUT /api/v1/security/scans/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateSecurityScanInput }>(
    '/api/v1/security/scans/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update security scan',
        tags: ['Security Scans'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'scanning', 'completed', 'failed', 'cancelled'] },
            findings: { type: 'array' },
            summary: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Security scan updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const scan = await scanService.update(request.params.id, tenantId, request.body);
      reply.send(scan);
    }
  );

  /**
   * Delete scan
   * DELETE /api/v1/security/scans/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/security/scans/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete security scan',
        tags: ['Security Scans'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Security scan deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await scanService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List scans
   * GET /api/v1/security/scans
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/security/scans',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List security scans',
        tags: ['Security Scans'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'scanning', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of security scans',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await scanService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Run security scan
   * POST /api/v1/security/scans/:id/run
   */
  app.post<{ Params: { id: string }; Body: { options?: RunSecurityScanInput['options'] } }>(
    '/api/v1/security/scans/:id/run',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Run security scan',
        tags: ['Security Scans'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                includeFalsePositives: { type: 'boolean' },
                severityThreshold: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
                customRules: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Security scan started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: RunSecurityScanInput = {
        tenantId,
        userId,
        scanId: request.params.id,
        options: request.body.options,
      };

      const scan = await scannerService.runScan(input);
      reply.send(scan);
    }
  );
}

