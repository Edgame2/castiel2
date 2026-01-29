/**
 * Route registration for learning-service module (Plan W6 Layer 7 – Feedback Loop)
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { FeedbackLearningService } from '../services/FeedbackLearningService';
import {
  publishFeedbackRecorded,
  publishOutcomeRecorded,
  publishFeedbackTrendAlert,
} from '../events/publishers/FeedbackLearningEventPublisher';
import type {
  RecordFeedbackRequest,
  RecordOutcomeRequest,
} from '../types/feedback-learning.types';

const feedbackBodySchema = {
  type: 'object',
  required: ['modelId', 'feedbackType'],
  properties: {
    modelId: { type: 'string' },
    predictionId: { type: 'string' },
    opportunityId: { type: 'string' },
    feedbackType: { type: 'string' },
    value: {},
    comment: { type: 'string' },
    metadata: { type: 'object' },
  },
};

const outcomeBodySchema = {
  type: 'object',
  required: ['modelId', 'outcomeType', 'success'],
  properties: {
    modelId: { type: 'string' },
    predictionId: { type: 'string' },
    opportunityId: { type: 'string' },
    outcomeType: { type: 'string' },
    success: { type: 'boolean' },
    value: {},
    metadata: { type: 'object' },
  },
};

export async function registerRoutes(
  fastify: FastifyInstance,
  config: ReturnType<typeof loadConfig>
): Promise<void> {
  void config;
  const service = new FeedbackLearningService();

  fastify.post<{ Body: RecordFeedbackRequest }>(
    '/api/v1/feedback',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Record user feedback (Plan W6 Layer 7)',
        tags: ['Feedback'],
        security: [{ bearerAuth: [] }],
        body: feedbackBodySchema,
        response: { 201: { type: 'object', properties: { id: { type: 'string' }, recordedAt: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string; id?: string } }).user!.tenantId;
      const userId = (request as { user?: { tenantId: string; id?: string } }).user?.id;
      const body = request.body as RecordFeedbackRequest;
      const feedback = await service.recordFeedback(tenantId, userId, body);
      await publishFeedbackRecorded(tenantId, {
        feedbackId: feedback.id,
        modelId: feedback.modelId,
        feedbackType: feedback.feedbackType,
        predictionId: feedback.predictionId,
      });
      return reply.status(201).send({ id: feedback.id, recordedAt: feedback.recordedAt });
    }
  );

  fastify.post<{ Body: RecordOutcomeRequest }>(
    '/api/v1/outcomes',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Record outcome (Plan W6 Layer 7)',
        tags: ['Feedback'],
        security: [{ bearerAuth: [] }],
        body: outcomeBodySchema,
        response: { 201: { type: 'object', properties: { id: { type: 'string' }, recordedAt: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string; id?: string } }).user!.tenantId;
      const userId = (request as { user?: { tenantId: string; id?: string } }).user?.id;
      const body = request.body as RecordOutcomeRequest;
      const outcome = await service.recordOutcome(tenantId, userId, body);
      await publishOutcomeRecorded(tenantId, {
        outcomeId: outcome.id,
        modelId: outcome.modelId,
        outcomeType: outcome.outcomeType,
        success: outcome.success,
        predictionId: outcome.predictionId,
      });
      return reply.status(201).send({ id: outcome.id, recordedAt: outcome.recordedAt });
    }
  );

  fastify.get<{ Params: { modelId: string }; Querystring: { from?: string; to?: string } }>(
    '/api/v1/feedback/summary/:modelId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Feedback summary by model (Plan W6 Layer 7)',
        tags: ['Feedback'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['modelId'], properties: { modelId: { type: 'string' } } },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string } }).user!.tenantId;
      const { modelId } = request.params;
      const now = new Date();
      const to = request.query.to ?? now.toISOString();
      const from = request.query.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const summary = await service.generateFeedbackReport(tenantId, modelId, from, to);
      return reply.send(summary);
    }
  );

  fastify.get<{
    Params: { modelId: string };
    Querystring: { from?: string; to?: string; alertThreshold?: string };
  }>(
    '/api/v1/feedback/trends/:modelId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Feedback trends by model; optional trend alert (Plan W6 Layer 7)',
        tags: ['Feedback'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['modelId'], properties: { modelId: { type: 'string' } } },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            alertThreshold: { type: 'string' },
          },
        },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string } }).user!.tenantId;
      const { modelId } = request.params;
      const now = new Date();
      const to = request.query.to ?? now.toISOString();
      const from = request.query.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const alertThreshold = request.query.alertThreshold != null ? parseInt(request.query.alertThreshold, 10) : undefined;
      const trends = await service.trackFeedbackTrends(tenantId, modelId, from, to, {
        alertThreshold: Number.isNaN(alertThreshold) ? undefined : alertThreshold,
      });
      if (trends.alert && trends.message) {
        await publishFeedbackTrendAlert(tenantId, {
          modelId,
          message: trends.message,
          period: trends.period,
        });
      }
      return reply.send(trends);
    }
  );
}
