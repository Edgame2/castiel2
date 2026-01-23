/**
 * Onboarding Routes
 * 
 * API routes for user onboarding flow
 */

import type { FastifyInstance } from 'fastify';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { requireAuth } from '../middleware/authorization.js';

export async function registerOnboardingRoutes(
  server: FastifyInstance,
  controller: OnboardingController
): Promise<void> {
  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Onboarding routes not registered - authentication decorator missing');
    return;
  }

  // authDecorator is already the authenticated function (not a factory)
  const authGuards = [authDecorator, requireAuth()];

  // Get onboarding progress
  server.get(
    '/api/v1/onboarding',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get user onboarding progress',
        tags: ['Onboarding'],
        response: {
          200: {
            description: 'Onboarding progress',
            type: 'object',
          },
          404: {
            description: 'Onboarding progress not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getProgress(request, reply)
  );

  // Initialize onboarding
  server.post(
    '/api/v1/onboarding',
    {
      onRequest: authGuards,
      schema: {
        description: 'Initialize onboarding for current user',
        tags: ['Onboarding'],
        response: {
          201: {
            description: 'Onboarding initialized',
            type: 'object',
          },
        },
      },
    },
    (request, reply) => controller.initialize(request, reply)
  );

  // Update onboarding progress
  server.patch(
    '/api/v1/onboarding',
    {
      onRequest: authGuards,
      schema: {
        description: 'Update onboarding progress',
        tags: ['Onboarding'],
        body: {
          type: 'object',
          properties: {
            checklistItemId: {
              type: 'string',
              description: 'ID of checklist item to update',
            },
            markCompleted: {
              type: 'boolean',
              description: 'Mark checklist item as completed',
            },
            markSkipped: {
              type: 'boolean',
              description: 'Mark checklist item as skipped',
            },
            tourStep: {
              type: 'number',
              description: 'Current tour step number',
            },
            tourCompleted: {
              type: 'boolean',
              description: 'Mark tour as completed',
            },
            tourSkipped: {
              type: 'boolean',
              description: 'Mark tour as skipped',
            },
            discoveredFeature: {
              type: 'string',
              description: 'ID of discovered feature',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        response: {
          200: {
            description: 'Onboarding progress updated',
            type: 'object',
          },
        },
      },
    },
    (request, reply) => controller.updateProgress(request, reply)
  );

  // Skip onboarding
  server.post(
    '/api/v1/onboarding/skip',
    {
      onRequest: authGuards,
      schema: {
        description: 'Skip onboarding',
        tags: ['Onboarding'],
        response: {
          200: {
            description: 'Onboarding skipped',
            type: 'object',
          },
        },
      },
    },
    (request, reply) => controller.skip(request, reply)
  );

  // Get onboarding statistics (admin)
  server.get(
    '/api/v1/onboarding/stats',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get onboarding statistics for tenant (admin only)',
        tags: ['Onboarding'],
        response: {
          200: {
            description: 'Onboarding statistics',
            type: 'object',
            properties: {
              totalUsers: { type: 'number' },
              completedUsers: { type: 'number' },
              inProgressUsers: { type: 'number' },
              skippedUsers: { type: 'number' },
              averageCompletionTime: { type: 'number' },
              mostSkippedSteps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    stepId: { type: 'string' },
                    stepTitle: { type: 'string' },
                    skipCount: { type: 'number' },
                  },
                },
              },
              completionRate: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getStats(request, reply)
  );

  server.log.info('✅ Onboarding routes registered');
}








