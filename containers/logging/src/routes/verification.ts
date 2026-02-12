/**
 * Hash Chain Verification Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../utils/logger';

const verifySchema = z.object({
  organizationId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function registerVerificationRoutes(app: FastifyInstance): Promise<void> {
  const hashChainService = (app as any).hashChainService;
  
  if (!hashChainService) {
    throw new Error('HashChainService not available');
  }

  // Verify hash chain
  app.post('/verification/verify', {
    schema: {
      description: 'Verify hash chain integrity',
      tags: ['Verification'],
      summary: 'Verify chain',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          description: 'Verification result',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const body = verifySchema.parse(request.body);

      const result = await hashChainService.verifyChain(
        body.organizationId || tenantId,
        body.startDate ? new Date(body.startDate) : undefined,
        body.endDate ? new Date(body.endDate) : undefined
      );

      reply.send(result);
    } catch (error: any) {
      log.error('Failed to verify hash chain', error);
      throw error;
    }
  });

  // Create verification checkpoint
  app.post('/verification/checkpoint', {
    schema: {
      description: 'Create a verification checkpoint',
      tags: ['Verification'],
      summary: 'Create checkpoint',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          lastLogId: { type: 'string' },
          lastHash: { type: 'string' },
          logCount: { type: 'number' },
        },
        required: ['lastLogId', 'lastHash', 'logCount'],
      },
      response: {
        201: {
          description: 'Checkpoint created',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const body = request.body as {
        lastLogId: string;
        lastHash: string;
        logCount: number;
      };

      const checkpointId = await hashChainService.createCheckpoint(
        body.lastLogId,
        body.lastHash,
        BigInt(body.logCount),
        user.id,
        tenantId
      );

      reply.code(201).send({ id: checkpointId });
    } catch (error: any) {
      log.error('Failed to create checkpoint', error);
      throw error;
    }
  });

  // Get verification checkpoints
  app.get('/verification/checkpoints', {
    schema: {
      description: 'List verification checkpoints',
      tags: ['Verification'],
      summary: 'List checkpoints',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
      response: {
        200: {
          description: 'List of checkpoints',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const query = request.query as { limit?: string };

      const checkpoints = await hashChainService.getCheckpoints(
        tenantId,
        query.limit ? parseInt(query.limit, 10) : 10
      );

      reply.send({ items: checkpoints, total: checkpoints.length });
    } catch (error: any) {
      log.error('Failed to get checkpoints', error);
      throw error;
    }
  });

  // Verify since checkpoint
  app.post('/verification/checkpoint/:id/verify', {
    schema: {
      description: 'Verify logs since a checkpoint',
      tags: ['Verification'],
      summary: 'Verify since checkpoint',
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
          description: 'Verification result',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const { id } = request.params as { id: string };

      const result = await hashChainService.verifySinceCheckpoint(id, tenantId);

      reply.send(result);
    } catch (error: any) {
      log.error('Failed to verify since checkpoint', error);
      throw error;
    }
  });
}

