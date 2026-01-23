/**
 * Route Registration
 * Compliance Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ComplianceCheckService } from '../services/ComplianceCheckService';
import { ComplianceCheckerService } from '../services/ComplianceCheckerService';
import { CompliancePolicyService } from '../services/CompliancePolicyService';
import {
  CreateComplianceCheckInput,
  UpdateComplianceCheckInput,
  RunComplianceCheckInput,
  CreateCompliancePolicyInput,
  UpdateCompliancePolicyInput,
  ComplianceStandard,
  ComplianceCheckStatus,
  PolicyType,
} from '../types/compliance.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const checkService = new ComplianceCheckService();
  const checkerService = new ComplianceCheckerService(checkService);
  const policyService = new CompliancePolicyService();

  // ===== COMPLIANCE CHECK ROUTES =====

  /**
   * Create compliance check
   * POST /api/v1/compliance/checks
   */
  app.post<{ Body: Omit<CreateComplianceCheckInput, 'tenantId' | 'userId'> }>(
    '/api/v1/compliance/checks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new compliance check',
        tags: ['Compliance Checks'],
        body: {
          type: 'object',
          required: ['standard', 'target'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            standard: { type: 'string', enum: ['wcag', 'owasp', 'gdpr', 'hipaa', 'soc2', 'pci_dss', 'iso27001', 'custom'] },
            target: {
              type: 'object',
              required: ['type', 'path'],
              properties: {
                type: { type: 'string', enum: ['file', 'directory', 'module', 'project', 'endpoint', 'organization'] },
                path: { type: 'string' },
                identifier: { type: 'string' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Compliance check created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateComplianceCheckInput = {
        ...request.body,
        tenantId,
        userId,
        standard: request.body.standard as any,
      };

      const check = await checkService.create(input);
      reply.code(201).send(check);
    }
  );

  /**
   * Get check by ID
   * GET /api/v1/compliance/checks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/compliance/checks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get compliance check by ID',
        tags: ['Compliance Checks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Compliance check details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const check = await checkService.getById(request.params.id, tenantId);
      reply.send(check);
    }
  );

  /**
   * Update check
   * PUT /api/v1/compliance/checks/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateComplianceCheckInput }>(
    '/api/v1/compliance/checks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update compliance check',
        tags: ['Compliance Checks'],
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
            status: { type: 'string', enum: ['pending', 'checking', 'compliant', 'non_compliant', 'partial', 'failed', 'cancelled'] },
            requirements: { type: 'array' },
            violations: { type: 'array' },
            summary: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Compliance check updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const check = await checkService.update(request.params.id, tenantId, request.body);
      reply.send(check);
    }
  );

  /**
   * Delete check
   * DELETE /api/v1/compliance/checks/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/compliance/checks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete compliance check',
        tags: ['Compliance Checks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Compliance check deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await checkService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List checks
   * GET /api/v1/compliance/checks
   */
  app.get<{
    Querystring: {
      standard?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/compliance/checks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List compliance checks',
        tags: ['Compliance Checks'],
        querystring: {
          type: 'object',
          properties: {
            standard: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'checking', 'compliant', 'non_compliant', 'partial', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of compliance checks',
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
      const result = await checkService.list(tenantId, {
        standard: request.query.standard as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Run compliance check
   * POST /api/v1/compliance/checks/:id/run
   */
  app.post<{ Params: { id: string }; Body: { options?: RunComplianceCheckInput['options'] } }>(
    '/api/v1/compliance/checks/:id/run',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Run compliance check',
        tags: ['Compliance Checks'],
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
                includeNotApplicable: { type: 'boolean' },
                severityThreshold: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
                policyIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Compliance check started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: RunComplianceCheckInput = {
        tenantId,
        userId,
        checkId: request.params.id,
        options: request.body.options,
      };

      const check = await checkerService.runCheck(input);
      reply.send(check);
    }
  );

  // ===== COMPLIANCE POLICY ROUTES =====

  /**
   * Create compliance policy
   * POST /api/v1/compliance/policies
   */
  app.post<{ Body: Omit<CreateCompliancePolicyInput, 'tenantId' | 'userId'> }>(
    '/api/v1/compliance/policies',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new compliance policy',
        tags: ['Compliance Policies'],
        body: {
          type: 'object',
          required: ['name', 'type', 'standard', 'rules'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['security', 'privacy', 'accessibility', 'data_protection', 'code_standards', 'custom'] },
            standard: { type: 'string', enum: ['wcag', 'owasp', 'gdpr', 'hipaa', 'soc2', 'pci_dss', 'iso27001', 'custom'] },
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  condition: { type: 'string' },
                  severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
                  remediation: { type: 'string' },
                },
              },
            },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Compliance policy created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateCompliancePolicyInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        standard: request.body.standard as any,
      };

      const policy = await policyService.create(input);
      reply.code(201).send(policy);
    }
  );

  /**
   * Get policy by ID
   * GET /api/v1/compliance/policies/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/compliance/policies/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get compliance policy by ID',
        tags: ['Compliance Policies'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Compliance policy details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const policy = await policyService.getById(request.params.id, tenantId);
      reply.send(policy);
    }
  );

  /**
   * Update policy
   * PUT /api/v1/compliance/policies/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateCompliancePolicyInput }>(
    '/api/v1/compliance/policies/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update compliance policy',
        tags: ['Compliance Policies'],
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
            rules: { type: 'array' },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Compliance policy updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const policy = await policyService.update(request.params.id, tenantId, request.body);
      reply.send(policy);
    }
  );

  /**
   * Delete policy
   * DELETE /api/v1/compliance/policies/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/compliance/policies/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete compliance policy',
        tags: ['Compliance Policies'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Compliance policy deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await policyService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List policies
   * GET /api/v1/compliance/policies
   */
  app.get<{
    Querystring: {
      type?: string;
      standard?: string;
      enabled?: boolean;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/compliance/policies',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List compliance policies',
        tags: ['Compliance Policies'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            standard: { type: 'string' },
            enabled: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of compliance policies',
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
      const result = await policyService.list(tenantId, {
        type: request.query.type as any,
        standard: request.query.standard as any,
        enabled: request.query.enabled,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

