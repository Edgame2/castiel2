/**
 * Alert Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../utils/logger';

const createAlertSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  type: z.enum(['PATTERN', 'THRESHOLD', 'ANOMALY']),
  conditions: z.record(z.unknown()),
  notificationChannels: z.array(z.string()).optional(),
});

const updateAlertSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
  notificationChannels: z.array(z.string()).optional(),
});

export async function registerAlertRoutes(app: FastifyInstance): Promise<void> {
  const alertService = (app as any).alertService;
  
  if (!alertService) {
    throw new Error('AlertService not available');
  }

  // Create alert rule
  app.post('/alerts', {
    schema: {
      description: 'Create an alert rule',
      tags: ['Alerts'],
      summary: 'Create alert',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          enabled: { type: 'boolean' },
          type: { type: 'string', enum: ['PATTERN', 'THRESHOLD', 'ANOMALY'] },
          conditions: { type: 'object' },
          notificationChannels: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'type', 'conditions'],
      },
      response: {
        201: {
          description: 'Alert rule created',
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
      const tenantId = user.tenantId ?? user.organizationId;
      const body = createAlertSchema.parse(request.body);

      const rule = await alertService.createRule({ ...body, organizationId: body.organizationId ?? tenantId }, user.id);

      reply.code(201).send(rule);
    } catch (error: any) {
      log.error('Failed to create alert rule', error);
      throw error;
    }
  });

  // Get alert rule
  app.get('/alerts/:id', {
    schema: {
      description: 'Get alert rule',
      tags: ['Alerts'],
      summary: 'Get alert',
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
          description: 'Alert rule',
          type: 'object',
        },
        404: {
          description: 'Alert not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const { id } = request.params as { id: string };

      const rule = await alertService.getRule(id, tenantId);

      if (!rule) {
        return reply.code(404).send({ error: 'Alert rule not found' });
      }

      reply.send(rule);
    } catch (error: any) {
      log.error('Failed to get alert rule', error);
      throw error;
    }
  });

  // List alert rules
  app.get('/alerts', {
    schema: {
      description: 'List alert rules',
      tags: ['Alerts'],
      summary: 'List alerts',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'List of alert rules',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const query = request.query as { organizationId?: string };

      const rules = await alertService.listRules(query.organizationId ?? tenantId);

      reply.send({ items: rules, total: rules.length });
    } catch (error: any) {
      log.error('Failed to list alert rules', error);
      throw error;
    }
  });

  // Update alert rule
  app.put('/alerts/:id', {
    schema: {
      description: 'Update alert rule',
      tags: ['Alerts'],
      summary: 'Update alert',
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
          name: { type: 'string' },
          description: { type: 'string' },
          enabled: { type: 'boolean' },
          conditions: { type: 'object' },
          notificationChannels: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          description: 'Alert rule updated',
          type: 'object',
        },
        404: {
          description: 'Alert not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const { id } = request.params as { id: string };
      const body = updateAlertSchema.parse(request.body);

      const rule = await alertService.updateRule(id, body, user.id, tenantId);

      reply.send(rule);
    } catch (error: any) {
      log.error('Failed to update alert rule', error);
      throw error;
    }
  });

  // Delete alert rule
  app.delete('/alerts/:id', {
    schema: {
      description: 'Delete alert rule',
      tags: ['Alerts'],
      summary: 'Delete alert',
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
          description: 'Alert rule deleted',
        },
        404: {
          description: 'Alert not found',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const { id } = request.params as { id: string };

      await alertService.deleteRule(id, tenantId);

      reply.code(204).send();
    } catch (error: any) {
      log.error('Failed to delete alert rule', error);
      throw error;
    }
  });

  // Evaluate alert rule (manual trigger)
  app.post('/alerts/:id/evaluate', {
    schema: {
      description: 'Manually evaluate an alert rule',
      tags: ['Alerts'],
      summary: 'Evaluate alert',
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
          description: 'Evaluation result',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId ?? user.organizationId;
      const { id } = request.params as { id: string };

      const triggered = await alertService.evaluateRule(id, tenantId);

      reply.send({ triggered });
    } catch (error: any) {
      log.error('Failed to evaluate alert rule', error);
      throw error;
    }
  });
}

