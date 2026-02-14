/**
 * Retention Policy Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../utils/logger';
import { LogCategory, LogSeverity } from '../types';

const createPolicySchema = z.object({
  category: z.nativeEnum(LogCategory).optional(),
  severity: z.nativeEnum(LogSeverity).optional(),
  retentionDays: z.number().int().positive(),
  archiveAfterDays: z.number().int().positive().optional(),
  deleteAfterDays: z.number().int().positive(),
  minRetentionDays: z.number().int().positive().optional(),
  maxRetentionDays: z.number().int().positive().optional(),
  immutable: z.boolean().optional(),
});

const updatePolicySchema = z.object({
  retentionDays: z.number().int().positive().optional(),
  archiveAfterDays: z.number().int().positive().nullable().optional(),
  deleteAfterDays: z.number().int().positive().optional(),
  minRetentionDays: z.number().int().positive().optional(),
  maxRetentionDays: z.number().int().positive().optional(),
  immutable: z.boolean().optional(),
});

export async function registerPolicyRoutes(app: FastifyInstance): Promise<void> {
  const retentionService = (app as any).retentionService;
  
  if (!retentionService) {
    throw new Error('RetentionService not available');
  }

  // Create retention policy
  app.post('/policies', {
    schema: {
      description: 'Create a retention policy',
      tags: ['Policies'],
      summary: 'Create policy',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          severity: { type: 'string' },
          retentionDays: { type: 'number' },
          archiveAfterDays: { type: 'number' },
          deleteAfterDays: { type: 'number' },
          immutable: { type: 'boolean' },
        },
        required: ['retentionDays', 'deleteAfterDays'],
      },
      response: {
        201: {
          description: 'Policy created',
          type: 'object',
        },
        400: {
          description: 'Invalid request',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;
      const body = createPolicySchema.parse(request.body);

      const policy = await retentionService.createPolicy({ ...body, tenantId }, user.id);

      reply.code(201).send(policy);
    } catch (error: any) {
      log.error('Failed to create policy', error);
      throw error;
    }
  });

  // Get retention policy
  app.get('/policies/:id', {
    schema: {
      description: 'Get retention policy',
      tags: ['Policies'],
      summary: 'Get policy',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Policy',
          type: 'object',
        },
        404: {
          description: 'Policy not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;
      const { id } = request.params as { id: string };

      const policies = await retentionService.listPolicies(tenantId);
      const policy = policies.find((p: { id: string }) => p.id === id);

      if (!policy) {
        return reply.code(404).send({ error: 'Policy not found' });
      }

      reply.send(policy);
    } catch (error: any) {
      log.error('Failed to get policy', error);
      throw error;
    }
  });

  // List retention policies
  app.get('/policies', {
    schema: {
      description: 'List retention policies',
      tags: ['Policies'],
      summary: 'List policies',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
      },
      response: {
        200: {
          description: 'List of policies',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;

      const policies = await retentionService.listPolicies(tenantId);

      reply.send({ items: policies, total: policies.length });
    } catch (error: any) {
      log.error('Failed to list policies', error);
      throw error;
    }
  });

  // Update retention policy
  app.put('/policies/:id', {
    schema: {
      description: 'Update retention policy',
      tags: ['Policies'],
      summary: 'Update policy',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          retentionDays: { type: 'number' },
          archiveAfterDays: { type: ['number', 'null'] },
          deleteAfterDays: { type: 'number' },
          immutable: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Policy updated',
          type: 'object',
        },
        404: {
          description: 'Policy not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;
      const { id } = request.params as { id: string };
      const body = updatePolicySchema.parse(request.body);

      const policy = await retentionService.updatePolicy(id, body, user.id, tenantId);

      reply.send(policy);
    } catch (error: any) {
      log.error('Failed to update policy', error);
      throw error;
    }
  });

  // Delete retention policy
  app.delete('/policies/:id', {
    schema: {
      description: 'Delete retention policy',
      tags: ['Policies'],
      summary: 'Delete policy',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Policy deleted',
        },
        404: {
          description: 'Policy not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;
      const { id } = request.params as { id: string };

      await retentionService.deletePolicy(id, tenantId);

      reply.code(204).send();
    } catch (error: any) {
      log.error('Failed to delete policy', error);
      throw error;
    }
  });
}

