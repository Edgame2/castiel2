/**
 * Route registration for llm-service module (Plan W5 Layer 5)
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { randomUUID } from 'crypto';
import { ChainOfThoughtService } from '../services/ChainOfThoughtService';
import {
  publishReasoningRequested,
  publishReasoningCompleted,
  publishReasoningFailed,
} from '../events/publishers/LLMReasoningEventPublisher';
import type { LLMReasoningRequest, ReactivationStrategyRequest } from '../types/llm.types';

const requestBodySchema = {
  type: 'object',
  required: ['opportunityId'],
  properties: {
    opportunityId: { type: 'string' },
    predictionId: { type: 'string' },
    explanationId: { type: 'string' },
    context: { type: 'object' },
  },
};

function registerLLMRoute(
  fastify: FastifyInstance,
  path: string,
  reasoningType: string,
  handler: (tenantId: string, body: LLMReasoningRequest) => Promise<unknown>
): void {
  fastify.post<{ Body: LLMReasoningRequest }>(
    path,
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: `LLM ${reasoningType} (Plan W5 Layer 5). Body: opportunityId (required), predictionId?, explanationId?, context?`,
        tags: ['LLM'],
        security: [{ bearerAuth: [] }],
        body: requestBodySchema,
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string } }).user!.tenantId;
      const body = request.body as LLMReasoningRequest;
      const requestId = randomUUID();
      const t0 = Date.now();
      await publishReasoningRequested(tenantId, {
        requestId,
        reasoningType,
        opportunityId: body.opportunityId,
        predictionId: body.predictionId,
        correlationId: request.id as string,
      });
      try {
        const output = await handler(tenantId, body);
        await publishReasoningCompleted(tenantId, {
          requestId,
          output,
          latency: Date.now() - t0,
          correlationId: request.id as string,
        });
        return reply.send(output);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        await publishReasoningFailed(tenantId, {
          requestId,
          error: msg,
          correlationId: request.id as string,
        });
        log.error(`${reasoningType} failed`, error instanceof Error ? error : new Error(msg), { service: 'llm-service' });
        const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: { code: 'LLM_REASONING_FAILED', message: msg || 'LLM reasoning failed' },
        });
      }
    }
  );
}

export async function registerRoutes(
  fastify: FastifyInstance,
  config: ReturnType<typeof loadConfig>
): Promise<void> {
  await Promise.resolve(config);
  const service = new ChainOfThoughtService();

  registerLLMRoute(fastify, '/api/v1/llm/explain', 'explain', (tenantId, body) =>
    service.explain(body, tenantId)
  );
  registerLLMRoute(fastify, '/api/v1/llm/recommendations', 'recommendations', (tenantId, body) =>
    service.generateRecommendations(body, tenantId)
  );
  registerLLMRoute(fastify, '/api/v1/llm/scenarios', 'scenarios', (tenantId, body) =>
    service.analyzeScenarios(body, tenantId)
  );
  registerLLMRoute(fastify, '/api/v1/llm/summary', 'summary', (tenantId, body) =>
    service.generateSummary(body, tenantId)
  );
  registerLLMRoute(fastify, '/api/v1/llm/playbook', 'playbook', (tenantId, body) =>
    service.generatePlaybook(body, tenantId)
  );

  /** W9 – Reactivation strategy (FR-5.4). POST /api/v1/llm/reactivation/strategy */
  fastify.post<{ Body: ReactivationStrategyRequest }>(
    '/api/v1/llm/reactivation/strategy',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'W9 Layer 5: Generate reactivation strategy. Body: opportunityId (required), dormantFeatures?, reactivationPrediction? (from ml-service).',
        tags: ['LLM'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: {
            opportunityId: { type: 'string' },
            dormantFeatures: { type: 'object' },
            reactivationPrediction: { type: 'object' },
          },
        },
        response: { 200: { type: 'object', properties: { reactivationStrategy: { type: 'object', additionalProperties: true } }, additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const tenantId = (request as { user?: { tenantId: string } }).user!.tenantId;
      const body = request.body as ReactivationStrategyRequest;
      const requestId = randomUUID();
      const t0 = Date.now();
      await publishReasoningRequested(tenantId, {
        requestId,
        reasoningType: 'reactivation_strategy',
        opportunityId: body.opportunityId,
        correlationId: request.id as string,
      });
      try {
        const output = await service.generateReactivationStrategy(body, tenantId);
        await publishReasoningCompleted(tenantId, {
          requestId,
          output,
          latency: Date.now() - t0,
          correlationId: request.id as string,
        });
        return reply.send(output);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        await publishReasoningFailed(tenantId, {
          requestId,
          error: msg,
          correlationId: request.id as string,
        });
        log.error('reactivation_strategy failed', error instanceof Error ? error : new Error(msg), { service: 'llm-service' });
        const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
        return reply.status(statusCode).send({
          error: { code: 'LLM_REASONING_FAILED', message: msg || 'Reactivation strategy generation failed' },
        });
      }
    }
  );
}
