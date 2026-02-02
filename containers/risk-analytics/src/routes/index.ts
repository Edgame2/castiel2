/**
 * Route registration for risk-analytics module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware, ServiceClient, generateServiceToken } from '@coder/shared';
import { RiskEvaluationService } from '../services/RiskEvaluationService';
import { RiskCatalogService } from '../services/RiskCatalogService';
import { RevenueAtRiskService } from '../services/RevenueAtRiskService';
import { QuotaService, CreateQuotaInput, UpdateQuotaInput } from '../services/QuotaService';
import { EarlyWarningService } from '../services/EarlyWarningService';
import { BenchmarkingService } from '../services/BenchmarkingService';
import { IndustryBenchmarkService } from '../services/IndustryBenchmarkService';
import { SimulationService } from '../services/SimulationService';
import { DataQualityService } from '../services/DataQualityService';
import { TrustLevelService } from '../services/TrustLevelService';
import { RiskAIValidationService } from '../services/RiskAIValidationService';
import { RiskExplainabilityService } from '../services/RiskExplainabilityService';
import { ExplainabilityService } from '../services/ExplainabilityService';
import { getSnapshots } from '../services/RiskSnapshotService';
import { listCompetitors, getCompetitorsForOpportunity, trackCompetitor, getDashboard, analyzeWinLossByCompetitor, recordWinLossReasons, getWinLossReasons } from '../services/CompetitiveIntelligenceService';
import { getPrioritizedOpportunities } from '../services/PrioritizedOpportunitiesService';
import { getTopAtRiskReasons } from '../services/AtRiskReasonsService';
import { StakeholderGraphService } from '../services/StakeholderGraphService';
import { executeQuickAction } from '../services/QuickActionsService';
import { getAnomalies, runStatisticalDetection, persistAndPublishMLAnomaly, type RunStatisticalDetectionResult } from '../services/AnomalyDetectionService';
import { getSentimentTrends } from '../services/SentimentTrendsService';
import { LeadingIndicatorsService } from '../services/LeadingIndicatorsService';
import { RiskClusteringService } from '../services/RiskClusteringService';
import { AccountHealthService } from '../services/AccountHealthService';
import { RiskPropagationService } from '../services/RiskPropagationService';
import {
  publishJobTrigger,
  publishRiskPredictionGenerated,
  publishMlExplanationRequested,
  publishMlExplanationCompleted,
  publishMlExplanationFailed,
  publishDecisionEvaluationRequested,
  publishDecisionEvaluationCompleted,
  publishActionExecutionRequested,
  publishActionExecutionCompleted,
  publishActionExecutionFailed,
} from '../events/publishers/RiskAnalyticsEventPublisher';
import { randomUUID } from 'crypto';
import { getContainer } from '@coder/shared/database';
import { CreateRiskInput, UpdateRiskInput, SetPonderationInput } from '../types/risk-catalog.types';
import type { ExplainPredictionRequest, ExplainBatchRequest } from '../types/explanation.types';
import type { EvaluateDecisionRequest, ExecuteDecisionRequest, ApplyCatalogRulesRequest, MakeMethodologyDecisionRequest, Rule as RuleType } from '../types/decision.types';
import type { MethodologyCard, UpsertSalesMethodologyBody } from '../types/sales-methodology.types';
import type { UpsertTenantMLConfigBody } from '../types/tenant-ml-config.types';
import { DecisionEngineService } from '../services/DecisionEngineService';
import { ActionExecutor } from '../services/ActionExecutor';
import { SalesMethodologyService } from '../services/SalesMethodologyService';
import { TenantMLConfigService } from '../services/TenantMLConfigService';
import { ReactivationService } from '../services/ReactivationService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const salesMethodologyService = new SalesMethodologyService();
    const tenantMLConfigService = new TenantMLConfigService();
    const riskCatalogService = new RiskCatalogService(fastify);
    const riskEvaluationService = new RiskEvaluationService(fastify, tenantMLConfigService, riskCatalogService);
    const revenueAtRiskService = new RevenueAtRiskService(fastify, riskEvaluationService);
    const quotaService = new QuotaService(fastify, revenueAtRiskService);
    const earlyWarningService = new EarlyWarningService(fastify, riskEvaluationService);
    const benchmarkingService = new BenchmarkingService(fastify);
    const industryBenchmarkService = new IndustryBenchmarkService(fastify);
    const simulationService = new SimulationService(fastify, riskEvaluationService);
    const dataQualityService = new DataQualityService(fastify);
    const trustLevelService = new TrustLevelService(fastify, dataQualityService);
    const riskAIValidationService = new RiskAIValidationService(fastify);
    const riskExplainabilityService = new RiskExplainabilityService(fastify);
    const explainabilityService = new ExplainabilityService();
    const mlServiceClientForMethodology = config.services?.ml_service?.url
      ? new ServiceClient({
          baseURL: config.services.ml_service.url,
          timeout: 15000,
          retries: 2,
        })
      : null;
    const getMethodologyFeatures = mlServiceClientForMethodology
      ? async (tenantId: string, opportunityId: string) => {
          const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
          try {
            const res = await mlServiceClientForMethodology.get<import('../types/decision.types').MethodologyFeaturesInput>(
              `/api/v1/ml/features/methodology?opportunityId=${encodeURIComponent(opportunityId)}`,
              { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${token}` } }
            );
            return res ?? null;
          } catch {
            return null;
          }
        }
      : null;
    const decisionEngineService = new DecisionEngineService(riskCatalogService, salesMethodologyService, getMethodologyFeatures);
    const actionExecutor = new ActionExecutor();
    const reactivationService = new ReactivationService(fastify);
    const stakeholderGraphService = new StakeholderGraphService(fastify);
    const riskClusteringService = new RiskClusteringService(fastify);
    const accountHealthService = new AccountHealthService(fastify);
    const riskPropagationService = new RiskPropagationService(fastify);
    const leadingIndicatorsService = new LeadingIndicatorsService(fastify);

    const mlServiceClient = new ServiceClient({
      baseURL: config.services?.ml_service?.url || '',
      timeout: 15000,
      retries: 2,
    });

    const shardManagerClient = new ServiceClient({
      baseURL: config.services?.shard_manager?.url || '',
      timeout: 10000,
      retries: 1,
    });

    // Get risk evaluation by ID
    fastify.get<{ Params: { evaluationId: string } }>(
      '/api/v1/risk/evaluations/:evaluationId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk evaluation by ID',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { evaluationId } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('risk_evaluations');
          const { resource } = await container.item(evaluationId, tenantId).read();

          if (!resource) {
            return reply.status(404).send({
              error: {
                code: 'EVALUATION_NOT_FOUND',
                message: 'Risk evaluation not found',
              },
            });
          }

          return reply.send(resource);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get risk evaluation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EVALUATION_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve risk evaluation' },
          });
        }
      }
    );

    // Get latest risk evaluation by opportunityId (for risk-adjusted forecasts, MISSING_FEATURES 5.1)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/risk/opportunities/:opportunityId/latest-evaluation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get latest risk evaluation for an opportunity (e.g. for risk-adjusted revenue forecast)',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('risk_evaluations');
          const { resources } = await container.items
            .query({
              query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.calculatedAt DESC OFFSET 0 LIMIT 1',
              parameters: [{ name: '@opportunityId', value: opportunityId }],
            }, { partitionKey: tenantId })
            .fetchAll();

          if (!resources || resources.length === 0) {
            return reply.status(404).send({
              error: { code: 'EVALUATION_NOT_FOUND', message: 'No risk evaluation found for this opportunity' },
            });
          }
          return reply.send(resources[0]);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get latest evaluation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EVALUATION_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve evaluation' },
          });
        }
      }
    );

    // Risk explainability: top drivers for risk score (Plan §4.1, §11.2)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/risk-explainability',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Top drivers for risk score (topDrivers: feature, contribution, direction). Derived from latest evaluation detectedRisks.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                evaluationId: { type: 'string' },
                opportunityId: { type: 'string' },
                riskScore: { type: 'number' },
                topDrivers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      feature: { type: 'string' },
                      contribution: { type: 'number' },
                      direction: { type: 'string', enum: ['increases', 'decreases'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { opportunityId } = request.params;
        const tenantId = request.user!.tenantId;
        const requestId = randomUUID();
        const t0 = Date.now();
        await publishMlExplanationRequested(tenantId, { requestId, opportunityId });
        try {
          const container = getContainer('risk_evaluations');
          const { resources } = await container.items
            .query({
              query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.calculatedAt DESC OFFSET 0 LIMIT 1',
              parameters: [{ name: '@opportunityId', value: opportunityId }],
            }, { partitionKey: tenantId })
            .fetchAll();

          if (!resources || resources.length === 0) {
            await publishMlExplanationFailed(tenantId, { requestId, opportunityId, error: 'No risk evaluation found for this opportunity', durationMs: Date.now() - t0 });
            return reply.status(404).send({
              error: { code: 'EVALUATION_NOT_FOUND', message: 'No risk evaluation found for this opportunity' },
            });
          }

          const ev = resources[0] as { evaluationId?: string; opportunityId?: string; riskScore?: number; detectedRisks?: Array<{ riskName?: string; contribution?: number }> };
          const dr = ev.detectedRisks ?? [];
          const topDrivers = dr.slice(0, 5).map((r) => ({
            feature: r.riskName || 'Risk',
            contribution: typeof r.contribution === 'number' ? r.contribution : 0.1,
            direction: 'increases' as const,
          }));

          await publishMlExplanationCompleted(tenantId, { requestId, opportunityId, evaluationId: ev.evaluationId, durationMs: Date.now() - t0 });
          return reply.send({
            evaluationId: ev.evaluationId,
            opportunityId: ev.opportunityId ?? opportunityId,
            riskScore: ev.riskScore ?? 0,
            topDrivers,
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          await publishMlExplanationFailed(tenantId, { requestId, opportunityId, error: msg, durationMs: Date.now() - t0 });
          log.error('Risk-explainability failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_EXPLAINABILITY_FAILED', message: msg || 'Failed to get risk explainability' },
          });
        }
      }
    );

    // Get risk snapshots for an opportunity (Plan §9.1, FIRST_STEPS §2)
    fastify.get<{ Params: { opportunityId: string }; Querystring: { from?: string; to?: string } }>(
      '/api/v1/opportunities/:opportunityId/risk-snapshots',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk snapshots for an opportunity in a date range (YYYY-MM-DD)',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          querystring: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const { from: fromQ, to: toQ } = request.query;
          const tenantId = request.user!.tenantId;
          const now = new Date();
          const defaultFrom = new Date(now);
          defaultFrom.setDate(defaultFrom.getDate() - 90);
          const from = fromQ || defaultFrom.toISOString().slice(0, 10);
          const to = toQ || now.toISOString().slice(0, 10);

          const snapshots = await getSnapshots(tenantId, opportunityId, from, to);
          return reply.send({ snapshots });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get risk snapshots', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_SNAPSHOTS_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve risk snapshots' },
          });
        }
      }
    );

    // Win-probability proxy to ml-service (FIRST_STEPS §8, Plan §4.1)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/win-probability',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get win probability for an opportunity (proxies to ml-service)',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: { 200: { type: 'object', properties: { probability: { type: 'number', minimum: 0, maximum: 1 } } } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const base = config.services?.ml_service?.url;
          if (!base) {
            return reply.status(503).send({
              error: { code: 'ML_SERVICE_UNAVAILABLE', message: 'ml-service URL not configured' },
            });
          }
          const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
          const res = await mlServiceClient.post<{ probability: number }>(
            '/api/v1/ml/win-probability/predict',
            { opportunityId },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
          );
          return reply.send(res);
        } catch (error: unknown) {
          const statusCode = (error as { response?: { status?: number } })?.response?.status ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Win-probability proxy failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'WIN_PROBABILITY_PROXY_FAILED', message: msg || 'Failed to get win probability from ml-service' },
          });
        }
      }
    );

    // Win-probability explain proxy to ml-service (Plan §905, §11.2)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/win-probability/explain',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Top drivers for win-probability (proxies to ml-service POST /api/v1/ml/win-probability/explain). Plan §905.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                topDrivers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      feature: { type: 'string' },
                      contribution: { type: 'number' },
                      direction: { type: 'string', enum: ['increases', 'decreases'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const base = config.services?.ml_service?.url;
          if (!base) {
            return reply.status(503).send({
              error: { code: 'ML_SERVICE_UNAVAILABLE', message: 'ml-service URL not configured' },
            });
          }
          const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
          const res = await mlServiceClient.post<{ topDrivers: { feature: string; contribution: number; direction: string }[] }>(
            '/api/v1/ml/win-probability/explain',
            { opportunityId },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
          );
          return reply.send(res);
        } catch (error: unknown) {
          const statusCode = (error as { response?: { status?: number } })?.response?.status ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Win-probability explain proxy failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'WIN_PROBABILITY_EXPLAIN_PROXY_FAILED', message: msg || 'Failed to get win-probability explain from ml-service' },
          });
        }
      }
    );

    // Win-probability trend proxy to ml-service (Gap 6, Plan §3.2). On 503 or missing ml_service.url return { points: [] }.
    fastify.get<{ Params: { opportunityId: string }; Querystring: { from?: string; to?: string } }>(
      '/api/v1/opportunities/:opportunityId/win-probability/trend',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Historical win-probability points (proxies to ml-service GET /api/v1/ml/win-probability/:opportunityId/trend). On 503 or missing ml_service URL returns { points: [] }.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          querystring: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      probability: { type: 'number' },
                      confidence: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const { from, to } = request.query;
          const tenantId = request.user!.tenantId;
          const base = config.services?.ml_service?.url;
          if (!base) {
            return reply.send({ points: [] });
          }
          const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
          const qs = new URLSearchParams();
          if (from) qs.set('from', from);
          if (to) qs.set('to', to);
          const path = `/api/v1/ml/win-probability/${encodeURIComponent(opportunityId)}/trend${qs.toString() ? `?${qs.toString()}` : ''}`;
          const res = await mlServiceClient.get<{ points: { date: string; probability: number; confidence?: number }[] }>(
            path,
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
          );
          return reply.send(res ?? { points: [] });
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 503) {
            return reply.send({ points: [] });
          }
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Win-probability trend proxy failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return reply.send({ points: [] });
        }
      }
    );

    // 30/60/90-day risk predictions from risk_predictions (FIRST_STEPS §8, Plan §4.1)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/risk-predictions',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get 30/60/90-day risk predictions (EarlyWarningService.predictRiskTrajectory). Returns stored prediction or stub when none.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                opportunityId: { type: 'string' },
                tenantId: { type: 'string' },
                predictionDate: { type: 'string', nullable: true },
                horizons: {
                  type: 'object',
                  properties: {
                    '30': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                    '60': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                    '90': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                  },
                },
                leadingIndicators: { type: 'array', items: {} },
                modelId: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await earlyWarningService.predictRiskTrajectory(opportunityId, tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Risk-predictions get failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_PREDICTIONS_FAILED', message: msg || 'Failed to get risk predictions' },
          });
        }
      }
    );

    // Generate 30/60/90-day risk predictions and write to risk_predictions (FIRST_STEPS §8, Plan §4.1)
    fastify.post<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/risk-predictions/generate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger generation of 30/60/90-day risk predictions (EarlyWarningService.generatePredictions). Rules-based; LSTM later. Writes to risk_predictions.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            201: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                opportunityId: { type: 'string' },
                predictionDate: { type: 'string' },
                horizons: {
                  type: 'object',
                  properties: {
                    '30': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                    '60': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                    '90': { type: 'object', properties: { riskScore: { type: 'number' }, confidence: { type: 'number' } } },
                  },
                },
                leadingIndicators: { type: 'array' },
                modelId: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await earlyWarningService.generatePredictions(opportunityId, tenantId);
          await publishRiskPredictionGenerated(tenantId, {
            predictionId: out.id,
            opportunityId: out.opportunityId,
            horizons: out.horizons,
            modelId: out.modelId,
            predictionDate: out.predictionDate,
          });
          return reply.status(201).send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Risk-predictions generate failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_PREDICTIONS_GENERATE_FAILED', message: msg || 'Failed to generate risk predictions' },
          });
        }
      }
    );

    // Risk velocity and acceleration from risk_snapshots (FIRST_STEPS §8, Plan §4.1)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/risk-velocity',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk velocity and acceleration from risk_snapshots (EarlyWarningService.calculateRiskVelocity)',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                velocity: { type: 'number', description: 'Change in riskScore per day (positive = risk increasing)' },
                acceleration: { type: 'number', description: 'Change in velocity per day' },
                dataPoints: { type: 'number' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await earlyWarningService.calculateRiskVelocity(opportunityId, tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Risk-velocity failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_VELOCITY_FAILED', message: msg || 'Failed to calculate risk velocity' },
          });
        }
      }
    );

    // Stakeholder graph (Plan §924): build from shard-manager has_contact, has_stakeholder, reports_to.
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/stakeholder-graph',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get stakeholder graph for an opportunity. Nodes: opportunity + contacts; edges: has_contact/has_stakeholder (opp→contact), reports_to (contact→contact). Centrality: Phase 2 (Azure ML).',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, type: { type: 'string', enum: ['opportunity', 'contact'] }, label: { type: 'string' } },
                  },
                },
                edges: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { source: { type: 'string' }, target: { type: 'string' }, relationshipType: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await stakeholderGraphService.getGraph(opportunityId, tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Stakeholder-graph failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'STAKEHOLDER_GRAPH_FAILED', message: msg || 'Failed to get stakeholder graph' },
          });
        }
      }
    );

    // Anomalies for opportunity (Plan §920): from risk_anomaly_alerts. Detection (statistical/ML) to be wired.
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/anomalies',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get anomalies for an opportunity from risk_anomaly_alerts. Detection (statistical, Isolation Forest) to be wired; returns stored alerts.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  opportunityId: { type: 'string' },
                  anomalyType: { type: 'string', enum: ['statistical', 'ml', 'pattern'] },
                  subtype: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  description: { type: 'string' },
                  detectedAt: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const list = await getAnomalies(opportunityId, tenantId);
          return reply.send(list);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Anomalies get failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'ANOMALIES_RETRIEVAL_FAILED', message: msg || 'Failed to get anomalies' },
          });
        }
      }
    );

    // Run statistical (Z-score) and optional ML (Isolation Forest) anomaly detection (Plan §920, §5.5). Persists to risk_anomaly_alerts and publishes anomaly.detected when detected.
    fastify.post<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/anomalies/detect',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Run statistical (Z-score) anomaly detection; when ml_service.url and feature_flags.anomaly_detection, also runs ML (Isolation Forest) via ml-service. Persists to risk_anomaly_alerts and publishes anomaly.detected on detection.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                detected: { type: 'boolean' },
                alert: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    opportunityId: { type: 'string' },
                    anomalyType: { type: 'string' },
                    subtype: { type: 'string' },
                    severity: { type: 'string' },
                    description: { type: 'string' },
                    detectedAt: { type: 'string' },
                    details: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          let ownerId: string | undefined;
          if (config.services?.shard_manager?.url) {
            try {
              const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
              const shard = await shardManagerClient.get<{ structuredData?: { OwnerId?: string } }>(
                `/api/v1/shards/${opportunityId}`,
                { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${token}` } }
              );
              ownerId = shard?.structuredData?.OwnerId;
            } catch {
              // keep ownerId undefined; notification-manager will skip owner-specific delivery
            }
          }
          const resultStat = await runStatisticalDetection(opportunityId, tenantId, { ownerId });
          let resultML: RunStatisticalDetectionResult | undefined;
          if (config.services?.ml_service?.url && config.feature_flags?.anomaly_detection) {
            try {
              const token = generateServiceToken(fastify, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
              const res = await mlServiceClient.post<{ isAnomaly: number; anomalyScore: number }>(
                '/api/v1/ml/anomaly/predict',
                { opportunityId },
                { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${token}` } }
              );
              if (res && (res.isAnomaly === -1 || (typeof res.anomalyScore === 'number' && res.anomalyScore > 0.5))) {
                resultML = await persistAndPublishMLAnomaly(opportunityId, tenantId, res, { ownerId });
              }
            } catch (e) {
              log.warn('Anomaly ML detection (ml-service) failed, using statistical only', { error: e instanceof Error ? e.message : String(e), opportunityId, tenantId, service: 'risk-analytics' });
            }
          }
          const detected = resultStat.detected || (resultML?.detected ?? false);
          const alert = (resultStat.detected ? resultStat.alert : undefined) ?? (resultML?.detected ? resultML.alert : undefined);
          return reply.send({ detected, alert });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Anomalies detect failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'ANOMALIES_DETECT_FAILED', message: msg || 'Failed to run anomaly detection' },
          });
        }
      }
    );

    // Sentiment trends (Plan §921): from risk_sentiment_trends; ai-insights/data-enrichment to populate.
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/sentiment-trends',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get sentiment trends for an opportunity. Data from risk_sentiment_trends; ai-insights or data-enrichment to populate.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                trends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      period: { type: 'string' },
                      score: { type: 'number' },
                      sampleSize: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const trends = await getSentimentTrends(opportunityId, tenantId);
          return reply.send({ trends });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Sentiment trends get failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SENTIMENT_TRENDS_RETRIEVAL_FAILED', message: msg || 'Failed to get sentiment trends' },
          });
        }
      }
    );

    // Leading indicators (Gap 5, Plan §4). LeadingIndicatorsService.getLeadingIndicators.
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/leading-indicators',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Leading-indicator status for an opportunity (LeadingIndicatorsCard). From risk_snapshots, risk_evaluations, early-warnings, shard-manager.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                indicators: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      status: { type: 'string', enum: ['ok', 'warning', 'critical', 'unknown'] },
                      value: { type: 'number' },
                      detail: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await leadingIndicatorsService.getLeadingIndicators(opportunityId, tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Leading-indicators get failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'LEADING_INDICATORS_FAILED', message: msg || 'Failed to get leading indicators' },
          });
        }
      }
    );

    // Quick actions (Plan §942, §11.10): create_task, log_activity, start_remediation. Publishes opportunity.quick_action.requested; 202 Accepted.
    fastify.post<{ Params: { opportunityId: string }; Body: { action: string; payload?: Record<string, unknown> } }>(
      '/api/v1/opportunities/:opportunityId/quick-actions',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Quick actions from EarlyWarningCard, AnomalyCard: create_task, log_activity, start_remediation. Publishes opportunity.quick_action.requested for async handling.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          body: {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['create_task', 'log_activity', 'start_remediation'] },
              payload: { type: 'object' },
            },
          },
          response: {
            202: {
              type: 'object',
              properties: { status: { type: 'string', enum: ['accepted'] }, action: { type: 'string' } },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const { action, payload } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const out = await executeQuickAction(opportunityId, tenantId, userId, { action: action as 'create_task' | 'log_activity' | 'start_remediation', payload });
          return (reply as { status: (code: number) => typeof reply }).status(202).send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 400;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Quick-actions failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'QUICK_ACTIONS_FAILED', message: msg || 'Failed to execute quick action' },
          });
        }
      }
    );

    // Peer deal comparison (Plan §11.12, §945): similar by industry, size; win rate, median cycle time.
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/similar-won-deals',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Peer deal comparison: deals similar by industry and size band. Returns count, winRate, medianCycleTimeDays, p25CloseAmount. Uses shard-manager c_opportunity (Plan §11.12).',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                count: { type: 'number' },
                winRate: { type: 'number' },
                medianCycleTimeDays: { type: ['number', 'null'] },
                p25CloseAmount: { type: ['number', 'null'] },
              },
            },
            404: { description: 'Opportunity not found' },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await benchmarkingService.getSimilarWonDeals(tenantId, opportunityId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Similar-won-deals failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SIMILAR_WON_DEALS_FAILED', message: msg || 'Failed to get similar won deals' },
          });
        }
      }
    );

    // Industry benchmarks (Plan §953): GET /industries/:id/benchmarks, GET /opportunities/:id/benchmark-comparison
    fastify.get<{ Params: { industryId: string }; Querystring: { period?: string } }>(
      '/api/v1/industries/:industryId/benchmarks',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get industry benchmark (Plan §953). Optional query period (YYYY-MM). From analytics_industry_benchmarks.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { industryId: { type: 'string' } }, required: ['industryId'] },
          querystring: { type: 'object', properties: { period: { type: 'string' } } },
          response: { 200: { type: 'object', nullable: true }, 404: { description: 'No benchmark for industry/period' } },
        },
      },
      async (request, reply) => {
        try {
          const { industryId } = request.params;
          const { period } = request.query;
          const out = await industryBenchmarkService.getBenchmark(industryId, period);
          if (!out) return reply.status(404).send({ error: { code: 'BENCHMARK_NOT_FOUND', message: 'No benchmark for this industry/period' } });
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('industries benchmarks failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'INDUSTRY_BENCHMARKS_FAILED', message: msg || 'Failed to get benchmarks' } });
        }
      }
    );

    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/benchmark-comparison',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Compare opportunity to industry benchmark (Plan §953). Uses shard-manager and analytics_industry_benchmarks.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: { 200: { type: 'object' }, 404: { description: 'Opportunity or benchmark not found' } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await industryBenchmarkService.compareToBenchmark(opportunityId, tenantId);
          if (!out) return reply.status(404).send({ error: { code: 'BENCHMARK_COMPARISON_NOT_FOUND', message: 'Opportunity or benchmark not found' } });
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('benchmark-comparison failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'BENCHMARK_COMPARISON_FAILED', message: msg || 'Failed to compare to benchmark' } });
        }
      }
    );

    // Risk clustering (Plan §914, §915): clusters, association-rules, on-demand trigger
    fastify.get<{ Querystring?: Record<string, string> }>(
      '/api/v1/risk-clustering/clusters',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk clusters (Plan §4.1, §915). Reads from risk_clusters. Cached or on-demand.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          response: { 200: { type: 'object', properties: { clusters: { type: 'array', items: { type: 'object' } } } } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const clusters = await riskClusteringService.identifyRiskClusters(tenantId);
          return reply.send({ clusters });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('risk-clustering clusters failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'RISK_CLUSTERING_FAILED', message: msg || 'Failed to get clusters' } });
        }
      }
    );

    fastify.get<{ Querystring?: Record<string, string> }>(
      '/api/v1/risk-clustering/association-rules',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get association rules (Plan §4.1, §915). Reads from risk_association_rules.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          response: { 200: { type: 'object', properties: { rules: { type: 'array', items: { type: 'object' } } } } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const rules = await riskClusteringService.findAssociationRules(tenantId);
          return reply.send({ rules });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('risk-clustering association-rules failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'RISK_CLUSTERING_FAILED', message: msg || 'Failed to get association rules' } });
        }
      }
    );

    fastify.post(
      '/api/v1/risk-clustering/trigger',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger risk-clustering batch job on-demand (Plan §4.1, §915). Publishes workflow.job.trigger; BatchJobWorker consumes from bi_batch_jobs.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          response: { 202: { type: 'object', properties: { ok: { type: 'boolean' }, job: { type: 'string' } } } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          await publishJobTrigger('risk-clustering', { tenantId });
          return (reply as { status: (code: number) => typeof reply }).status(202).send({ ok: true, job: 'risk-clustering' });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('risk-clustering trigger failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'RISK_CLUSTERING_TRIGGER_FAILED', message: msg || 'Failed to trigger risk-clustering' } });
        }
      }
    );

    // Account health (Plan §917): GET /api/v1/accounts/:id/health
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/accounts/:id/health',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get account health (Plan §4.1, §917). Reads from risk_account_health. 404 when batch has not run for this account.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: {
            200: { type: 'object', properties: { healthScore: { type: 'number' }, riskBreakdown: { type: 'object' }, trendDirection: { type: 'string' }, criticalOpportunities: { type: 'array', items: { type: 'string' } }, lastUpdated: { type: 'string' } } },
            404: { description: 'Account health not found (batch not run)' },
          },
        },
      },
      async (request, reply) => {
        try {
          const accountId = request.params.id;
          const tenantId = request.user!.tenantId;
          const doc = await accountHealthService.calculateAccountHealth(accountId, tenantId);
          if (!doc) return reply.status(404).send({ error: { code: 'ACCOUNT_HEALTH_NOT_FOUND', message: 'Account health not found (batch not yet run for this account)' } });
          return reply.send(doc);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('accounts health failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'ACCOUNT_HEALTH_FAILED', message: msg || 'Failed to get account health' } });
        }
      }
    );

    // Risk propagation (Plan §916): GET /api/v1/risk-propagation/opportunities/:id
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/risk-propagation/opportunities/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Analyze risk propagation from one opportunity (Plan §4.1, §916). RiskPropagationService.analyzeRiskPropagation. Stub until graph + Azure ML batch wired.',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: {
            200: {
              type: 'object',
              properties: {
                opportunityId: { type: 'string' },
                tenantId: { type: 'string' },
                propagatedRisk: { type: 'number' },
                affectedNodeIds: { type: 'array', items: { type: 'string' } },
                _stub: { type: 'boolean' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const opportunityId = request.params.id;
          const tenantId = request.user!.tenantId;
          const out = await riskPropagationService.analyzeRiskPropagation(opportunityId, tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('risk-propagation failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({ error: { code: 'RISK_PROPAGATION_FAILED', message: msg || 'Failed to analyze risk propagation' } });
        }
      }
    );

    // List competitor catalog (Plan Gap 4: for CompetitorSelectModal)
    fastify.get<{ Querystring?: Record<string, never> }>(
      '/api/v1/competitors',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List competitors in the tenant catalog (for CompetitorSelectModal and settings).',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                competitors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      aliases: { type: 'array', items: { type: 'string' } },
                      industry: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const competitors = await listCompetitors(tenantId);
          return reply.send({ competitors });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List competitors failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'LIST_COMPETITORS_FAILED', message: msg || 'Failed to list competitors' },
          });
        }
      }
    );

    // Track competitor on opportunity (Plan §10 Phase 1, §3.1.1–3.1.2)
    fastify.post<{ Params: { id: string }; Body: { opportunityId: string; competitorName?: string; mentionCount?: number; sentiment?: number; winLikelihood?: number } }>(
      '/api/v1/competitors/:id/track',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Track a competitor on an opportunity (upsert risk_competitor_tracking). :id = competitorId.',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          body: {
            type: 'object',
            required: ['opportunityId'],
            properties: {
              opportunityId: { type: 'string' },
              competitorName: { type: 'string' },
              mentionCount: { type: 'number' },
              sentiment: { type: 'number' },
              winLikelihood: { type: 'number' },
            },
          },
          response: {
            201: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                opportunityId: { type: 'string' },
                competitorId: { type: 'string' },
                competitorName: { type: 'string' },
                detectedDate: { type: 'string' },
                lastMentionDate: { type: 'string' },
                mentionCount: { type: 'number' },
                sentiment: { type: 'number' },
                winLikelihood: { type: 'number' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const competitorId = request.params.id;
          const { opportunityId, competitorName, mentionCount, sentiment, winLikelihood } = request.body;
          const tenantId = request.user!.tenantId;
          const out = await trackCompetitor(tenantId, competitorId, {
            opportunityId,
            competitorName,
            mentionCount,
            sentiment,
            winLikelihood,
          });
          return reply.status(201).send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Track competitor failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'TRACK_COMPETITOR_FAILED', message: msg || 'Failed to track competitor' },
          });
        }
      }
    );

    // Competitors for opportunity (Plan §10 Phase 1, §3.1.1–3.1.2 competitive intel)
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/competitors',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get competitors tracked for an opportunity (CompetitiveIntelligenceService, risk_competitor_tracking)',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: {
            200: {
              type: 'object',
              properties: {
                competitors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      competitorId: { type: 'string' },
                      competitorName: { type: 'string' },
                      detectedDate: { type: 'string' },
                      mentionCount: { type: 'number' },
                      lastMentionDate: { type: 'string' },
                      sentiment: { type: 'number' },
                      winLikelihood: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const competitors = await getCompetitorsForOpportunity(tenantId, opportunityId);
          return reply.send({ competitors });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Competitors for opportunity failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'COMPETITORS_RETRIEVAL_FAILED', message: msg || 'Failed to get competitors for opportunity' },
          });
        }
      }
    );

    // Win/loss reasons (Plan §11.8, §943): record and get lossReason, winReason, competitorId for an opportunity.
    fastify.put<{ Params: { opportunityId: string }; Body: { lossReason?: string; winReason?: string; competitorId?: string } }>(
      '/api/v1/opportunities/:opportunityId/win-loss-reasons',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Record win/loss reasons for an opportunity (Plan §11.8, §943). Upserts risk_win_loss_reasons. Feeds win/loss analytics.',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          body: {
            type: 'object',
            properties: {
              lossReason: { type: 'string' },
              winReason: { type: 'string' },
              competitorId: { type: 'string' },
            },
          },
          response: { 200: { type: 'object', properties: { opportunityId: { type: 'string' }, tenantId: { type: 'string' }, lossReason: { type: 'string' }, winReason: { type: 'string' }, competitorId: { type: 'string' }, recordedAt: { type: 'string' } } } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await recordWinLossReasons(opportunityId, tenantId, request.body ?? {});
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Record win-loss reasons failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'WIN_LOSS_REASONS_RECORD_FAILED', message: msg || 'Failed to record win-loss reasons' },
          });
        }
      }
    );

    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/opportunities/:opportunityId/win-loss-reasons',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get win/loss reasons for an opportunity (Plan §11.8, §943).',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
          response: { 200: { type: 'object' }, 404: { description: 'Not found' } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const out = await getWinLossReasons(opportunityId, tenantId);
          if (!out) return reply.status(404).send({ error: { code: 'WIN_LOSS_REASONS_NOT_FOUND', message: 'Win-loss reasons not found for this opportunity' } });
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get win-loss reasons failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'WIN_LOSS_REASONS_GET_FAILED', message: msg || 'Failed to get win-loss reasons' },
          });
        }
      }
    );

    // Competitive intelligence dashboard (Plan §4.1 getDashboard: Win/loss, landscape)
    fastify.get(
      '/api/v1/competitive-intelligence/dashboard',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get competitive intelligence dashboard: totalOpportunitiesWithCompetitors, totalMentions, topCompetitorsByMentions, recentMentionCount, winLoss. winLoss from risk_win_loss_reasons (Plan §11.8, §943): wins=# with winReason, losses=# with lossReason.',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                totalOpportunitiesWithCompetitors: { type: 'number' },
                totalMentions: { type: 'number' },
                topCompetitorsByMentions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      competitorId: { type: 'string' },
                      competitorName: { type: 'string' },
                      mentionCount: { type: 'number' },
                    },
                  },
                },
                recentMentionCount: { type: 'number' },
                winLoss: {
                  type: 'object',
                  properties: {
                    wins: { type: 'number' },
                    losses: { type: 'number' },
                    winRate: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const out = await getDashboard(tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Competitive-intelligence dashboard failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'COMPETITIVE_DASHBOARD_FAILED', message: msg || 'Failed to get competitive intelligence dashboard' },
          });
        }
      }
    );

    // Win/loss by competitor (Plan §4.1 analyzeWinLossByCompetitor)
    fastify.get(
      '/api/v1/analytics/competitive-win-loss',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Win/loss by competitor. byCompetitor (competitorId, competitorName, wins, losses, winRate); totalWins, totalLosses, overallWinRate. From risk_win_loss_reasons (Plan §11.8, §943): losses per competitorId where lossReason set; totalWins/totalLosses from winReason/lossReason counts.',
          tags: ['Competitive Intelligence'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                byCompetitor: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      competitorId: { type: 'string' },
                      competitorName: { type: 'string' },
                      wins: { type: 'number' },
                      losses: { type: 'number' },
                      winRate: { type: 'number' },
                    },
                  },
                },
                totalWins: { type: 'number' },
                totalLosses: { type: 'number' },
                overallWinRate: { type: 'number' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const out = await analyzeWinLossByCompetitor(tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Competitive win-loss failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'COMPETITIVE_WIN_LOSS_FAILED', message: msg || 'Failed to get competitive win-loss' },
          });
        }
      }
    );

    // Trigger risk evaluation (synchronous)
    fastify.post<{ Body: { opportunityId: string; options?: any } }>(
      '/api/v1/risk/evaluations',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger risk evaluation for an opportunity',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId, options } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const evaluation = await riskEvaluationService.evaluateRisk({
            opportunityId,
            tenantId,
            userId,
            trigger: 'manual',
            options,
          });

          return (reply as { status: (code: number) => typeof reply }).status(202).send({
            evaluationId: evaluation.evaluationId,
            status: 'completed',
            evaluation,
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to trigger risk evaluation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EVALUATION_FAILED', message: msg || 'Failed to evaluate risk' },
          });
        }
      }
    );

    // ===== REVENUE AT RISK ROUTES =====

    // Calculate revenue at risk for opportunity
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate revenue at risk for opportunity',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const revenueAtRisk = await revenueAtRiskService.calculateForOpportunity(
            opportunityId,
            tenantId,
            userId
          );

          return reply.send(revenueAtRisk);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate revenue at risk for opportunity', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'REVENUE_CALCULATION_FAILED', message: msg || 'Failed to calculate revenue at risk' },
          });
        }
      }
    );

    // Calculate revenue at risk for user portfolio
    fastify.get<{ Params: { userId: string } }>(
      '/api/v1/risk-analysis/portfolio/:userId/revenue-at-risk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate revenue at risk for user portfolio',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { userId } = request.params;
          const tenantId = request.user!.tenantId;

          // Users can only view their own portfolio unless they have permission
          if (userId !== request.user!.id) {
            // TODO: Add permission check for viewing other users' portfolios
          }

          const portfolioRisk = await revenueAtRiskService.calculateForPortfolio(userId, tenantId);

          return reply.send(portfolioRisk);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate portfolio revenue at risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'REVENUE_CALCULATION_FAILED', message: msg || 'Failed to calculate portfolio revenue at risk' },
          });
        }
      }
    );

    // Calculate revenue at risk for team
    fastify.get<{ Params: { teamId: string } }>(
      '/api/v1/risk-analysis/teams/:teamId/revenue-at-risk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate revenue at risk for team',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { teamId } = request.params;
          const tenantId = request.user!.tenantId;

          // TODO: Add permission check for viewing team revenue at risk

          const teamRisk = await revenueAtRiskService.calculateForTeam(teamId, tenantId);

          return reply.send(teamRisk);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate team revenue at risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'REVENUE_CALCULATION_FAILED', message: msg || 'Failed to calculate team revenue at risk' },
          });
        }
      }
    );

    // Calculate revenue at risk for tenant
    fastify.get(
      '/api/v1/risk-analysis/tenant/revenue-at-risk',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate revenue at risk for tenant',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;

          // TODO: Add permission check for viewing tenant revenue at risk (Director+ or admin)

          const tenantRisk = await revenueAtRiskService.calculateForTenant(tenantId);

          return reply.send(tenantRisk);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate tenant revenue at risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'REVENUE_CALCULATION_FAILED', message: msg || 'Failed to calculate tenant revenue at risk' },
          });
        }
      }
    );

    // Prioritized opportunities for manager dashboard "Recommended today" (Plan §941, §1024)
    fastify.get(
      '/api/v1/risk-analysis/tenant/prioritized-opportunities',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get prioritized opportunities for tenant. Rank by revenue-at-risk × risk × early-warning; suggestedAction from mitigation-ranking (Phase 2).',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      opportunityId: { type: 'string' },
                      revenueAtRisk: { type: 'number' },
                      riskScore: { type: 'number' },
                      earlyWarningScore: { type: 'number' },
                      suggestedAction: { type: 'string' },
                      rankScore: { type: 'number' },
                    },
                  },
                },
                suggestedAction: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const out = await getPrioritizedOpportunities(tenantId);
          return reply.send(out);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Prioritized-opportunities failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'PRIORITIZED_OPPORTUNITIES_FAILED', message: msg || 'Failed to get prioritized opportunities' },
          });
        }
      }
    );

    // Top at-risk reasons for dashboard (Plan §11.11, §944)
    fastify.get<{ Querystring: { limit?: number } }>(
      '/api/v1/risk-analysis/tenant/top-at-risk-reasons',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Top at-risk reasons for tenant. Aggregates atRiskReasons from risk_evaluations for "Top at-risk reasons" widget in manager/executive dashboard.',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { limit: { type: 'number', minimum: 1, maximum: 50 } } },
          response: {
            200: {
              type: 'object',
              properties: {
                reasons: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      reason: { type: 'string' },
                      count: { type: 'number' },
                      suggestedMitigation: { type: 'string', description: 'Plan §944: from at_risk_reasons_mitigation when key matches' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const limit = request.query?.limit ?? 15;
          const mitigationMap = config.at_risk_reasons_mitigation ?? {};
          const reasons = await getTopAtRiskReasons(tenantId, limit, mitigationMap);
          return reply.send({ reasons });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Top-at-risk-reasons failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'TOP_AT_RISK_REASONS_FAILED', message: msg || 'Failed to get top at-risk reasons' },
          });
        }
      }
    );

    // ===== EARLY WARNING ROUTES =====

    // Detect early warning signals for opportunity
    fastify.post<{ Params: { opportunityId: string } }>(
      '/api/v1/risk-analysis/opportunities/:opportunityId/early-warnings',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Detect early warning signals for opportunity',
          tags: ['Early Warning'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const signals = await earlyWarningService.detectSignals(opportunityId, tenantId, userId);

          return reply.send(signals);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to detect early warning signals', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EARLY_WARNING_DETECTION_FAILED', message: msg || 'Failed to detect early warning signals' },
          });
        }
      }
    );

    // Get early warning signals for opportunity
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/risk-analysis/opportunities/:opportunityId/early-warnings',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get early warning signals for opportunity',
          tags: ['Early Warning'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;

          const signals = await earlyWarningService.getWarnings(opportunityId, tenantId);

          return reply.send(signals);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get early warning signals', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EARLY_WARNING_RETRIEVAL_FAILED', message: msg || 'Failed to get early warning signals' },
          });
        }
      }
    );

    // Acknowledge early warning signal
    fastify.post<{ Params: { warningId: string } }>(
      '/api/v1/risk-analysis/early-warnings/:warningId/acknowledge',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Acknowledge early warning signal',
          tags: ['Early Warning'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { warningId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await earlyWarningService.acknowledgeWarning(warningId, tenantId, userId);

          return reply.send({ acknowledged: true });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to acknowledge early warning', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EARLY_WARNING_ACKNOWLEDGE_FAILED', message: msg || 'Failed to acknowledge early warning' },
          });
        }
      }
    );

    // ===== RISK CATALOG ROUTES (from risk-catalog) =====

    // Get applicable risk catalog (global + industry + tenant-specific)
    fastify.get<{ Params: { tenantId: string }; Querystring: { industryId?: string } }>(
      '/api/v1/risk-catalog/catalog/:tenantId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get applicable risk catalog for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { tenantId } = request.params;
          const { industryId } = request.query;
          const catalog = await riskCatalogService.getCatalog(tenantId, industryId);
          return reply.send(catalog);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get catalog', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'CATALOG_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve risk catalog' },
          });
        }
      }
    );

    // Create risk
    fastify.post<{ Body: CreateRiskInput }>(
      '/api/v1/risk-catalog/risks',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create custom risk (global, industry, or tenant-specific based on role)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const userRoles = (request.user as any)?.roles || [];
          const input = request.body as CreateRiskInput;

          const catalog = await riskCatalogService.createCustomRisk(tenantId, userId, input, userRoles);
          return reply.status(201).send(catalog);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to create risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_CREATION_FAILED', message: msg || 'Failed to create risk' },
          });
        }
      }
    );

    // Update risk
    fastify.put<{ Params: { riskId: string }; Body: UpdateRiskInput }>(
      '/api/v1/risk-catalog/risks/:riskId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update risk catalog entry',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const updates = request.body as UpdateRiskInput;

          const catalog = await riskCatalogService.updateRisk(riskId, tenantId, userId, updates);
          return reply.send(catalog);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to update risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_UPDATE_FAILED', message: msg || 'Failed to update risk' },
          });
        }
      }
    );

    // Delete tenant-specific risk
    fastify.delete<{ Params: { riskId: string } }>(
      '/api/v1/risk-catalog/risks/:riskId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete tenant-specific risk',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.deleteRisk(riskId, tenantId, userId);
          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to delete risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_DELETION_FAILED', message: msg || 'Failed to delete risk' },
          });
        }
      }
    );

    // Duplicate risk
    fastify.post<{
      Params: { riskId: string };
      Body: { sourceCatalogType: 'global' | 'industry'; sourceIndustryId?: string; newRiskId?: string };
    }>(
      '/api/v1/risk-catalog/risks/:riskId/duplicate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Duplicate risk (global/industry → tenant-specific)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { sourceCatalogType, sourceIndustryId, newRiskId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const catalog = await riskCatalogService.duplicateRisk(
            riskId,
            sourceCatalogType,
            sourceIndustryId,
            tenantId,
            userId,
            newRiskId
          );
          return reply.status(201).send(catalog);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to duplicate risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_DUPLICATION_FAILED', message: msg || 'Failed to duplicate risk' },
          });
        }
      }
    );

    // Enable risk for tenant
    fastify.put<{ Params: { riskId: string }; Body: { catalogType: 'global' | 'industry'; industryId?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/enable',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Enable risk for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { catalogType, industryId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setRiskEnabledForTenant(riskId, catalogType, industryId, tenantId, userId, true);
          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to enable risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_ENABLE_FAILED', message: msg || 'Failed to enable risk' },
          });
        }
      }
    );

    // Disable risk for tenant
    fastify.put<{ Params: { riskId: string }; Body: { catalogType: 'global' | 'industry'; industryId?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/disable',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Disable risk for tenant',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { catalogType, industryId } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setRiskEnabledForTenant(riskId, catalogType, industryId, tenantId, userId, false);
          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to disable risk', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RISK_DISABLE_FAILED', message: msg || 'Failed to disable risk' },
          });
        }
      }
    );

    // Get risk weights
    fastify.get<{ Params: { riskId: string }; Querystring: { industryId?: string; opportunityType?: string } }>(
      '/api/v1/risk-catalog/risks/:riskId/ponderation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk weights (ponderation)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { industryId, opportunityType } = request.query;
          const tenantId = request.user!.tenantId;

          const ponderation = await riskCatalogService.getPonderation(riskId, tenantId, industryId, opportunityType);
          return reply.send({ ponderation });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get ponderation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'PONDERATION_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve risk ponderation' },
          });
        }
      }
    );

    // Set risk weights
    fastify.put<{ Params: { riskId: string }; Body: SetPonderationInput }>(
      '/api/v1/risk-catalog/risks/:riskId/ponderation',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Set risk weights (ponderation)',
          tags: ['Risk Catalog'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { riskId } = request.params;
          const { ponderations } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await riskCatalogService.setPonderation(riskId, tenantId, userId, ponderations);
          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to set ponderation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'PONDERATION_UPDATE_FAILED', message: msg || 'Failed to update risk ponderation' },
          });
        }
      }
    );

    // ===== QUOTA ROUTES =====

    // Create quota
    fastify.post<{ Body: CreateQuotaInput }>(
      '/api/v1/quotas',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a new quota',
          tags: ['Quotas'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const quota = await quotaService.createQuota(tenantId, userId, request.body);
          return reply.status(201).send(quota);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to create quota', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'QUOTA_CREATION_FAILED', message: msg || 'Failed to create quota' },
          });
        }
      }
    );

    // Get quota by ID
    fastify.get<{ Params: { quotaId: string } }>(
      '/api/v1/quotas/:quotaId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get quota by ID',
          tags: ['Quotas'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { quotaId } = request.params;
          const tenantId = request.user!.tenantId;
          const quota = await quotaService.getQuota(quotaId, tenantId);
          if (!quota) {
            return reply.status(404).send({ error: 'Quota not found' });
          }
          return reply.send(quota);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get quota', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'QUOTA_RETRIEVAL_FAILED', message: msg || 'Failed to get quota' },
          });
        }
      }
    );

    // Update quota
    fastify.put<{ Params: { quotaId: string }; Body: UpdateQuotaInput }>(
      '/api/v1/quotas/:quotaId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update quota',
          tags: ['Quotas'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { quotaId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const quota = await quotaService.updateQuota(quotaId, tenantId, userId, request.body);
          return reply.send(quota);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to update quota', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'QUOTA_UPDATE_FAILED', message: msg || 'Failed to update quota' },
          });
        }
      }
    );

    // Get quota performance
    fastify.post<{ Params: { quotaId: string } }>(
      '/api/v1/quotas/:quotaId/performance',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate quota performance',
          tags: ['Quotas'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { quotaId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const performance = await quotaService.calculatePerformance(quotaId, tenantId, userId);
          return reply.send(performance);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate quota performance', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'QUOTA_PERFORMANCE_CALCULATION_FAILED', message: msg || 'Failed to calculate quota performance' },
          });
        }
      }
    );

    // ===== SIMULATION ROUTES =====

    // Run simulation
    fastify.post<{ Params: { opportunityId: string }; Body: { scenarioName?: string; modifications?: any } }>(
      '/api/v1/simulations/opportunities/:opportunityId/run',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Run risk simulation for opportunity',
          tags: ['Simulations'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          const scenario = {
            scenarioName: request.body.scenarioName || 'Simulation scenario',
            modifications: request.body.modifications || {},
          };
          const result = await simulationService.runSimulation(opportunityId, tenantId, userId, scenario);
          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to run simulation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SIMULATION_FAILED', message: msg || 'Failed to run simulation' },
          });
        }
      }
    );

    // Compare scenarios
    fastify.post<{ Params: { opportunityId: string }; Body: { scenarios: Array<{ scenarioName?: string; modifications?: any }> } }>(
      '/api/v1/simulations/opportunities/:opportunityId/compare',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Compare multiple simulation scenarios',
          tags: ['Simulations'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;
          // Run all scenarios first
          const simulationIds: string[] = [];
          for (const scenario of request.body.scenarios) {
            const sim = await simulationService.runSimulation(opportunityId, tenantId, userId, {
              scenarioName: scenario.scenarioName || 'Simulation scenario',
              modifications: scenario.modifications || {},
            });
            simulationIds.push(sim.id);
          }
          
          // Then compare them
          const comparison = await simulationService.compareSimulations(simulationIds, tenantId);
          return reply.send(comparison);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to compare scenarios', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SIMULATION_COMPARISON_FAILED', message: msg || 'Failed to compare scenarios' },
          });
        }
      }
    );

    // Get simulations for opportunity
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/simulations/opportunities/:opportunityId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get simulations for opportunity',
          tags: ['Simulations'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const simulations = await simulationService.getSimulations(opportunityId, tenantId);
          return reply.send(simulations);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get simulations', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SIMULATION_RETRIEVAL_FAILED', message: msg || 'Failed to get simulations' },
          });
        }
      }
    );

    // ===== BENCHMARKING ROUTES =====

    // Get win rate benchmarks
    fastify.get<{ Querystring: { industryId?: string; opportunityType?: string } }>(
      '/api/v1/benchmarks/win-rates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get win rate benchmarks',
          tags: ['Benchmarks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { industryId } = request.query;
          const benchmarks = await benchmarkingService.calculateWinRates(tenantId, {
            industryId,
            scope: 'tenant',
          });
          return reply.send(benchmarks);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get win rate benchmarks', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'BENCHMARK_RETRIEVAL_FAILED', message: msg || 'Failed to get benchmarks' },
          });
        }
      }
    );

    // Get closing time benchmarks
    fastify.get<{ Querystring: { industryId?: string; opportunityType?: string } }>(
      '/api/v1/benchmarks/closing-times',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get closing time benchmarks',
          tags: ['Benchmarks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { industryId } = request.query;
          const benchmarks = await benchmarkingService.calculateClosingTimes(tenantId, {
            industryId,
            scope: 'tenant',
          });
          return reply.send(benchmarks);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get closing time benchmarks', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'BENCHMARK_RETRIEVAL_FAILED', message: msg || 'Failed to get benchmarks' },
          });
        }
      }
    );

    // Get deal size benchmarks
    fastify.get<{ Querystring: { industryId?: string; opportunityType?: string } }>(
      '/api/v1/benchmarks/deal-sizes',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get deal size benchmarks',
          tags: ['Benchmarks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { industryId } = request.query;
          const benchmarks = await benchmarkingService.calculateDealSizes(tenantId, {
            industryId,
            scope: 'tenant',
          });
          return reply.send(benchmarks);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get deal size benchmarks', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'BENCHMARK_RETRIEVAL_FAILED', message: msg || 'Failed to get benchmarks' },
          });
        }
      }
    );

    // ===== DATA QUALITY ROUTES =====

    // Evaluate data quality
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/risk/opportunities/:opportunityId/data-quality',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Evaluate data quality for opportunity',
          tags: ['Data Quality'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          const qualityScore = await dataQualityService.evaluateQuality(opportunityId, tenantId);
          return reply.send(qualityScore);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to evaluate data quality', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'DATA_QUALITY_EVALUATION_FAILED', message: msg || 'Failed to evaluate data quality' },
          });
        }
      }
    );

    // ===== TRUST LEVEL ROUTES =====

    // Calculate trust level (Plan §11.6, §906: uses dataQuality from latest evaluation when available)
    fastify.post<{ Params: { opportunityId: string }; Body: { modelConfidence?: number; dataCompleteness?: number; historicalAccuracy?: number } }>(
      '/api/v1/risk/opportunities/:opportunityId/trust-level',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Calculate trust level for risk evaluation. When latest evaluation has dataQuality, it is used for dataQuality and dataCompleteness factors.',
          tags: ['Trust Level'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;
          let evaluationData: Record<string, unknown> = { ...request.body };
          try {
            const container = getContainer('risk_evaluations');
            const { resources } = await container.items
              .query(
                {
                  query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.calculatedAt DESC OFFSET 0 LIMIT 1',
                  parameters: [{ name: '@opportunityId', value: opportunityId }],
                },
                { partitionKey: tenantId }
              )
              .fetchAll();
            if (resources?.[0]?.dataQuality) {
              evaluationData = { ...request.body, dataQuality: resources[0].dataQuality };
            }
          } catch {
            // continue without dataQuality from evaluation
          }
          const trustLevel = await trustLevelService.calculateTrustLevel(opportunityId, tenantId, evaluationData);
          return reply.send(trustLevel);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to calculate trust level', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'TRUST_LEVEL_CALCULATION_FAILED', message: msg || 'Failed to calculate trust level' },
          });
        }
      }
    );

    // ===== AI VALIDATION ROUTES =====

    // Validate AI evaluation
    fastify.post<{ Params: { evaluationId: string } }>(
      '/api/v1/risk/evaluations/:evaluationId/validate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Validate AI-generated risk evaluation',
          tags: ['AI Validation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { evaluationId } = request.params;
          const tenantId = request.user!.tenantId;
          const container = getContainer('risk_evaluations');
          const { resource: evaluation } = await container.item(evaluationId, tenantId).read();
          if (!evaluation) {
            return reply.status(404).send({
              error: {
                code: 'EVALUATION_NOT_FOUND',
                message: 'Risk evaluation not found',
              },
            });
          }
          const validation = await riskAIValidationService.validateEvaluation(evaluation, tenantId);
          return reply.send(validation);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to validate AI evaluation', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'AI_VALIDATION_FAILED', message: msg || 'Failed to validate AI evaluation' },
          });
        }
      }
    );

    // ===== EXPLAINABILITY ROUTES =====

    // Generate explainability
    fastify.post<{ Params: { evaluationId: string } }>(
      '/api/v1/risk/evaluations/:evaluationId/explainability',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Generate explainability for risk evaluation',
          tags: ['Explainability'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        const { evaluationId } = request.params;
        const tenantId = request.user!.tenantId;
        const requestId = randomUUID();
        const t0 = Date.now();
        await publishMlExplanationRequested(tenantId, { requestId, evaluationId });
        try {
          const container = getContainer('risk_evaluations');
          const { resource: evaluation } = await container.item(evaluationId, tenantId).read();
          if (!evaluation) {
            await publishMlExplanationFailed(tenantId, { requestId, evaluationId, error: 'Risk evaluation not found', durationMs: Date.now() - t0 });
            return reply.status(404).send({
              error: {
                code: 'EVALUATION_NOT_FOUND',
                message: 'Risk evaluation not found',
              },
            });
          }
          const explainability = await riskExplainabilityService.generateExplainability(evaluation, tenantId);
          const opportunityId = (evaluation as { opportunityId?: string }).opportunityId;
          await publishMlExplanationCompleted(tenantId, { requestId, opportunityId, evaluationId, durationMs: Date.now() - t0 });
          return reply.send(explainability);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          await publishMlExplanationFailed(tenantId, { requestId, evaluationId, error: msg, durationMs: Date.now() - t0 });
          log.error('Failed to generate explainability', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EXPLAINABILITY_GENERATION_FAILED', message: msg || 'Failed to generate explainability' },
          });
        }
      }
    );

    // Plan W5 Layer 4: explain/prediction, feature-importance, factors, batch (ALL_LAYERS_DETAILED_REQUIREMENTS)
    fastify.post<{ Body: ExplainPredictionRequest }>(
      '/api/v1/explain/prediction',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Generate or retrieve explanation for a prediction (evaluationId or predictionId).',
          tags: ['Explainability'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            properties: {
              predictionId: { type: 'string' },
              opportunityId: { type: 'string' },
              modelId: { type: 'string' },
              evaluationId: { type: 'string' },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                predictionId: { type: 'string' },
                opportunityId: { type: 'string' },
                modelId: { type: 'string' },
                baseValue: { type: 'number' },
                prediction: { type: 'number' },
                positiveFactors: { type: 'array', items: { type: 'object' } },
                negativeFactors: { type: 'array', items: { type: 'object' } },
                confidence: { type: 'string' },
                detailLevel: { type: 'string' },
                generatedAt: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = request.body as ExplainPredictionRequest;
        const requestId = randomUUID();
        const t0 = Date.now();
        await publishMlExplanationRequested(tenantId, { requestId, opportunityId: body.opportunityId, evaluationId: body.evaluationId });
        try {
          const explanation = await explainabilityService.explainPrediction(body, tenantId);
          await publishMlExplanationCompleted(tenantId, { requestId, opportunityId: explanation.opportunityId, evaluationId: explanation.predictionId, durationMs: Date.now() - t0 });
          return reply.send(explanation);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          await publishMlExplanationFailed(tenantId, { requestId, opportunityId: body.opportunityId, evaluationId: body.evaluationId, error: msg, durationMs: Date.now() - t0 });
          log.error('Explain prediction failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EXPLAIN_PREDICTION_FAILED', message: msg || 'Failed to explain prediction' },
          });
        }
      }
    );

    fastify.get<{ Params: { modelId: string } }>(
      '/api/v1/explain/feature-importance/:modelId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get global feature importance for a model.',
          tags: ['Explainability'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { modelId: { type: 'string' } }, required: ['modelId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                modelId: { type: 'string' },
                featureImportance: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { feature: { type: 'string' }, importance: { type: 'number' }, category: { type: 'string' }, description: { type: 'string' }, rank: { type: 'number' } },
                  },
                },
                sampleSize: { type: 'number' },
                calculatedAt: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { modelId } = request.params;
        const tenantId = request.user!.tenantId;
        try {
          const global = await explainabilityService.getGlobalFeatureImportance(modelId, tenantId);
          if (!global) {
            return reply.status(404).send({
              error: { code: 'GLOBAL_FEATURE_IMPORTANCE_NOT_FOUND', message: 'Global feature importance not found for this model' },
            });
          }
          return reply.send(global);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get feature importance failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'FEATURE_IMPORTANCE_FAILED', message: msg || 'Failed to get feature importance' },
          });
        }
      }
    );

    fastify.get<{ Params: { predictionId: string } }>(
      '/api/v1/explain/factors/:predictionId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get factors (positive and negative) for a prediction.',
          tags: ['Explainability'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { predictionId: { type: 'string' } }, required: ['predictionId'] },
          response: {
            200: {
              type: 'object',
              properties: {
                positiveFactors: { type: 'array', items: { type: 'object' } },
                negativeFactors: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { predictionId } = request.params;
        const tenantId = request.user!.tenantId;
        try {
          const factors = await explainabilityService.getFactorsByPredictionId(predictionId, tenantId);
          if (!factors) {
            return reply.status(404).send({
              error: { code: 'EXPLANATION_NOT_FOUND', message: 'Explanation or factors not found for this prediction' },
            });
          }
          return reply.send(factors);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get factors failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'FACTORS_FAILED', message: msg || 'Failed to get factors' },
          });
        }
      }
    );

    fastify.post<{ Body: ExplainBatchRequest }>(
      '/api/v1/explain/batch',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Batch generate or retrieve explanations (evaluationIds or predictionIds).',
          tags: ['Explainability'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            properties: {
              predictionIds: { type: 'array', items: { type: 'string' } },
              evaluationIds: { type: 'array', items: { type: 'string' } },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                explanations: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = (request.body as ExplainBatchRequest) ?? {};
        try {
          const explanations = await explainabilityService.explainBatch(body, tenantId);
          return reply.send({ explanations });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Explain batch failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'EXPLAIN_BATCH_FAILED', message: msg || 'Failed to run batch explain' },
          });
        }
      }
    );

    // Plan W5 Layer 6: Decision Engine (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY)
    fastify.post<{ Body: EvaluateDecisionRequest }>(
      '/api/v1/decisions/evaluate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Evaluate rules and create a decision for an opportunity (Plan W5 Layer 6).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId'],
            properties: {
              opportunityId: { type: 'string' },
              riskScore: { type: 'number' },
              evaluationId: { type: 'string' },
              context: { type: 'object' },
            },
          },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = request.body as EvaluateDecisionRequest;
        const requestId = randomUUID();
        const t0 = Date.now();
        await publishDecisionEvaluationRequested(tenantId, { requestId, opportunityId: body.opportunityId, correlationId: request.id as string });
        try {
          const decision = await decisionEngineService.makeDecision(body, tenantId);
          await publishDecisionEvaluationCompleted(tenantId, { requestId, decisionId: decision.id, opportunityId: decision.opportunityId, durationMs: Date.now() - t0, correlationId: request.id as string });
          return reply.send(decision);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Decision evaluate failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'DECISION_EVALUATE_FAILED', message: msg || 'Failed to evaluate decision' },
          });
        }
      }
    );

    fastify.post<{ Body: ApplyCatalogRulesRequest }>(
      '/api/v1/decisions/apply-catalog-rules',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Apply risk catalog–driven rules (W7 Gap 1 FR-6.5). Maps detected risks to catalog, gets rules for catalog risks, evaluates and returns decision.',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId'],
            properties: {
              opportunityId: { type: 'string' },
              evaluationId: { type: 'string' },
              riskScore: { type: 'number' },
              industry: { type: 'string' },
              detectedRisks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    riskId: { type: 'string' },
                    riskName: { type: 'string' },
                    category: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                  required: ['riskId', 'riskName', 'category'],
                },
              },
            },
          },
          response: { 200: { type: 'object' }, 204: { description: 'No catalog rules applied' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = request.body as ApplyCatalogRulesRequest;
        const decision = await decisionEngineService.applyRiskCatalogRules(body, tenantId);
        if (!decision) {
          return reply.status(204).send();
        }
        return reply.send(decision);
      }
    );

    fastify.post<{ Body: MakeMethodologyDecisionRequest }>(
      '/api/v1/decisions/methodology',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'W8 Layer 6: Make methodology-based decisions (stage requirements, duration anomaly, MEDDIC). Fetches methodology features from ml-service.',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId'],
            properties: { opportunityId: { type: 'string' } },
          },
          response: { 200: { type: 'object' }, 204: { description: 'No methodology decisions (no features or no findings)' } },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        const body = request.body as MakeMethodologyDecisionRequest;
        try {
          const decision = await decisionEngineService.makeMethodologyDecisions(tenantId, body.opportunityId);
          if (!decision) {
            return reply.status(204).send();
          }
          return reply.send(decision);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('makeMethodologyDecisions failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'METHODOLOGY_DECISION_FAILED', message: msg || 'Failed to make methodology decision' },
          });
        }
      }
    );

    fastify.post<{ Body: ExecuteDecisionRequest }>(
      '/api/v1/decisions/execute',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Execute actions for a decision (Plan W5 Layer 6).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['decisionId', 'opportunityId'],
            properties: {
              decisionId: { type: 'string' },
              opportunityId: { type: 'string' },
              actionIds: { type: 'array', items: { type: 'string' } },
            },
          },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = request.body as ExecuteDecisionRequest;
        const requestId = randomUUID();
        try {
          const decision = await decisionEngineService.getDecision(body.decisionId, tenantId);
          if (!decision) {
            return reply.status(404).send({
              error: { code: 'DECISION_NOT_FOUND', message: 'Decision not found' },
            });
          }
          const actionsToRun = body.actionIds?.length
            ? decision.actions.filter((a) => body.actionIds!.includes(a.idempotencyKey))
            : decision.actions;
          for (const a of actionsToRun) {
            await publishActionExecutionRequested(tenantId, { requestId, actionId: a.idempotencyKey, opportunityId: body.opportunityId, actionType: a.type, correlationId: request.id as string });
          }
          const { success, results } = await actionExecutor.executeMany(actionsToRun, body.opportunityId, tenantId);
          for (let i = 0; i < actionsToRun.length; i++) {
            const a = actionsToRun[i];
            const r = results[i];
            if (r?.success) {
              await publishActionExecutionCompleted(tenantId, { requestId, actionId: a.idempotencyKey, opportunityId: body.opportunityId, durationMs: 0, correlationId: request.id as string });
            } else {
              await publishActionExecutionFailed(tenantId, { requestId, actionId: a.idempotencyKey, opportunityId: body.opportunityId, error: r?.error ?? 'Unknown', correlationId: request.id as string });
            }
          }
          return reply.send({ success, results });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Decision execute failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'DECISION_EXECUTE_FAILED', message: msg || 'Failed to execute decision' },
          });
        }
      }
    );

    /** Super Admin §6.2: List rule templates (read-only). GET /api/v1/decisions/templates */
    const RULE_TEMPLATES = [
      { name: 'Mark high-value, low-risk as hot', description: 'Flag opportunities with high value and low risk score for priority follow-up.' },
      { name: 'Escalate stalled opportunities', description: 'Trigger escalation when an opportunity has been in the same stage beyond a threshold.' },
      { name: 'Notify on competitor detected', description: 'Send a notification when competitor intelligence is detected for an opportunity.' },
      { name: 'Create task when stage changes', description: 'Create a follow-up task whenever the opportunity stage is updated.' },
      { name: 'Alert on risk spike', description: 'Alert when risk score increases above a configured threshold.' },
    ];
    fastify.get(
      '/api/v1/decisions/templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List rule templates (Super Admin §6.2).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
      async (_request, reply) => {
        return reply.send({ items: RULE_TEMPLATES });
      }
    );

    /** Super Admin §6.3: Detect rule conflicts. GET /api/v1/decisions/conflicts */
    fastify.get(
      '/api/v1/decisions/conflicts',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Detect rule conflicts (priority, overlapping conditions). Super Admin §6.3.',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      ruleIds: { type: 'array', items: { type: 'string' } },
                      ruleNames: { type: 'array', items: { type: 'string' } },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        try {
          const rules = await decisionEngineService.getAllRules(tenantId);
          const items: Array<{ type: string; ruleIds: string[]; ruleNames: string[]; message: string }> = [];
          const enabled = rules.filter((r) => r.enabled);
          const byPriority = new Map<number, RuleType[]>();
          for (const r of enabled) {
            const p = r.priority ?? 0;
            if (!byPriority.has(p)) byPriority.set(p, []);
            byPriority.get(p)!.push(r);
          }
          for (const [, group] of byPriority) {
            if (group.length > 1) {
              items.push({
                type: 'priority_conflict',
                ruleIds: group.map((r) => r.id),
                ruleNames: group.map((r) => r.name),
                message: `Multiple rules have the same priority (${group[0].priority}). Execution order may be ambiguous.`,
              });
            }
          }
          for (let i = 0; i < enabled.length; i++) {
            const a = enabled[i];
            const fieldsA = new Set((a.conditions ?? []).map((c) => c.field).filter(Boolean));
            if (fieldsA.size === 0) continue;
            for (let j = i + 1; j < enabled.length; j++) {
              const b = enabled[j];
              const fieldsB = new Set((b.conditions ?? []).map((c) => c.field).filter(Boolean));
              const overlap = [...fieldsA].filter((f) => fieldsB.has(f));
              if (overlap.length > 0) {
                items.push({
                  type: 'overlapping_conditions',
                  ruleIds: [a.id, b.id],
                  ruleNames: [a.name, b.name],
                  message: `Rules share condition field(s): ${overlap.join(', ')}. May trigger together.`,
                });
              }
            }
          }
          return reply.send({ items });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get conflicts failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'CONFLICTS_GET_FAILED', message: msg || 'Failed to get conflicts' },
          });
        }
      }
    );

    fastify.get<{ Querystring: { all?: string } }>(
      '/api/v1/decisions/rules',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List rules for tenant (Plan W5 Layer 6). Default: enabled only. Query ?all=true for all rules (§6.1.1).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { all: { type: 'string', enum: ['true', 'false'] } } },
          response: { 200: { type: 'object', properties: { rules: { type: 'array', items: { type: 'object' } } } } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const all = request.query?.all === 'true';
        try {
          const rules = all
            ? await decisionEngineService.getAllRules(tenantId)
            : await decisionEngineService.getRules(tenantId);
          return reply.send({ rules });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get rules failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RULES_GET_FAILED', message: msg || 'Failed to get rules' },
          });
        }
      }
    );

    fastify.post<{ Body: RuleType }>(
      '/api/v1/decisions/rules',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a rule (Plan W5 Layer 6). Body: name, enabled, priority, conditions, conditionLogic, actions, createdBy.',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          body: { type: 'object', required: ['name', 'enabled', 'priority', 'conditions', 'conditionLogic', 'actions', 'createdBy'], properties: {} },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const body = request.body as RuleType & { createdBy: string };
        try {
          const id = `rule_${tenantId}_${randomUUID()}`;
          const rule: RuleType = {
            ...body,
            id,
            tenantId,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: body.createdBy ?? 'api',
          };
          const saved = await decisionEngineService.upsertRule(rule as RuleType);
          return reply.send(saved);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Create rule failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RULE_CREATE_FAILED', message: msg || 'Failed to create rule' },
          });
        }
      }
    );

    fastify.put<{ Params: { ruleId: string }; Body: RuleType }>(
      '/api/v1/decisions/rules/:ruleId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update a rule (Plan W5 Layer 6).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { ruleId: { type: 'string' } }, required: ['ruleId'] },
          body: { type: 'object' },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const { ruleId } = request.params;
        const body = request.body as Partial<RuleType>;
        try {
          const rule: RuleType = {
            ...body,
            id: ruleId,
            tenantId,
            version: (body.version ?? 1) + 1,
            createdAt: (body as RuleType).createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: (body as RuleType).createdBy ?? 'api',
          } as RuleType;
          const saved = await decisionEngineService.upsertRule(rule);
          return reply.send(saved);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Update rule failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RULE_UPDATE_FAILED', message: msg || 'Failed to update rule' },
          });
        }
      }
    );

    fastify.delete<{ Params: { ruleId: string } }>(
      '/api/v1/decisions/rules/:ruleId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete a rule (§6.1.1).',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { ruleId: { type: 'string' } }, required: ['ruleId'] },
          response: { 204: { description: 'Rule deleted' }, 404: { description: 'Rule not found' } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const { ruleId } = request.params;
        try {
          await decisionEngineService.deleteRule(tenantId, ruleId);
          return reply.status(204).send();
        } catch (error: unknown) {
          const err = error as { code?: number; statusCode?: number };
          const code = err?.code ?? err?.statusCode;
          if (code === 404) {
            return reply.status(404).send({
              error: { code: 'RULE_NOT_FOUND', message: 'Rule not found' },
            });
          }
          const msg = error instanceof Error ? (error as Error).message : String(error);
          log.error('Delete rule failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (err?.statusCode ?? 500) as number;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RULE_DELETE_FAILED', message: msg || 'Failed to delete rule' },
          });
        }
      }
    );

    fastify.post<{ Params: { ruleId: string }; Body: { riskScore?: number; opportunityId: string } }>(
      '/api/v1/decisions/rules/:ruleId/test',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Test a rule against sample data (Plan W5 Layer 6). Body: riskScore?, opportunityId.',
          tags: ['Decision Engine'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { ruleId: { type: 'string' } }, required: ['ruleId'] },
          body: { type: 'object', required: ['opportunityId'], properties: { riskScore: { type: 'number' }, opportunityId: { type: 'string' } } },
          response: { 200: { type: 'object', properties: { matched: { type: 'boolean' }, actions: { type: 'array' } } } },
        },
      },
      async (request, reply) => {
        const tenantId = request.user!.tenantId;
        const { ruleId } = request.params;
        const body = request.body as { riskScore?: number; opportunityId: string };
        try {
          const rules = await decisionEngineService.getAllRules(tenantId);
          const rule = rules.find((r) => r.id === ruleId);
          if (!rule) {
            return reply.status(404).send({
              error: { code: 'RULE_NOT_FOUND', message: 'Rule not found' },
            });
          }
          const result = await decisionEngineService.testRule(rule, { riskScore: body.riskScore, opportunityId: body.opportunityId });
          return reply.send(result);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Test rule failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'RULE_TEST_FAILED', message: msg || 'Failed to test rule' },
          });
        }
      }
    );

    // Plan W8: Sales Methodology (REQUIREMENTS_GAP_ANALYSIS Gap 2)
    fastify.get(
      '/api/v1/sales-methodology',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get tenant sales methodology (stages, requirements, exit criteria, MEDDIC). Returns 404 if not configured.',
          tags: ['Sales Methodology'],
          security: [{ bearerAuth: [] }],
          response: {
            200: { type: 'object', description: 'SalesMethodology document' },
            404: { type: 'object', properties: { error: { type: 'object' } } },
          },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        try {
          const doc = await salesMethodologyService.getByTenantId(tenantId);
          if (!doc) {
            return reply.status(404).send({
              error: { code: 'SALES_METHODOLOGY_NOT_FOUND', message: 'Sales methodology not configured for tenant' },
            });
          }
          return reply.send(doc);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get sales methodology failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SALES_METHODOLOGY_GET_FAILED', message: msg || 'Failed to get sales methodology' },
          });
        }
      }
    );

    fastify.put<{ Body: UpsertSalesMethodologyBody }>(
      '/api/v1/sales-methodology',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create or update tenant sales methodology. Body: methodologyType, stages, requiredFields, risks; §3.1.2 optional name, displayName, description, isActive, isDefault. tenantId from X-Tenant-ID.',
          tags: ['Sales Methodology'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['methodologyType', 'stages'],
            properties: {
              methodologyType: { type: 'string', enum: ['MEDDIC', 'MEDDPICC', 'Challenger', 'Sandler', 'SPIN', 'Custom'] },
              stages: { type: 'array', items: { type: 'object' } },
              requiredFields: { type: 'array', items: { type: 'object' } },
              risks: { type: 'array', items: { type: 'object' } },
              name: { type: 'string', nullable: true },
              displayName: { type: 'string', nullable: true },
              description: { type: 'string', nullable: true },
              isActive: { type: 'boolean', nullable: true },
              isDefault: { type: 'boolean', nullable: true },
              integrationConfig: {
                type: 'object',
                nullable: true,
                properties: {
                  featureEngineering: { type: 'object', properties: { enabled: { type: 'boolean' }, features: { type: 'array', items: { type: 'string' } } } },
                  riskDetection: { type: 'object', properties: { enabled: { type: 'boolean' }, detectNonCompliance: { type: 'boolean' } } },
                  recommendations: { type: 'object', properties: { enabled: { type: 'boolean' }, suggestMissingSteps: { type: 'boolean' } } },
                },
              },
            },
          },
          response: { 200: { type: 'object', description: 'SalesMethodology document' } },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        const body = request.body as UpsertSalesMethodologyBody;
        try {
          const doc = await salesMethodologyService.upsert(tenantId, body);
          return reply.send(doc);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Upsert sales methodology failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'SALES_METHODOLOGY_UPSERT_FAILED', message: msg || 'Failed to upsert sales methodology' },
          });
        }
      }
    );

    // §3.1.1 View All Methodologies: list methodology templates (card grid) with usage stats
    const METHODOLOGY_TEMPLATES_BASE: MethodologyCard[] = [
      { id: 'MEDDIC', name: 'MEDDIC', type: 'standard', description: 'Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion. Qualification framework for complex sales.', stages: 6, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
      { id: 'MEDDPICC', name: 'MEDDPICC', type: 'standard', description: 'MEDDIC plus Paper process and Identify competition. Extended qualification framework.', stages: 8, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
      { id: 'Challenger', name: 'Challenger', type: 'standard', description: 'Teach, Tailor, Take control. Commercial teaching and insight-led selling.', stages: 3, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
      { id: 'Sandler', name: 'Sandler', type: 'standard', description: 'Pain-focused selling. No pressure tactics; uncover pain and qualify through structured discovery.', stages: 7, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
      { id: 'SPIN', name: 'SPIN', type: 'standard', description: 'Situation, Problem, Implication, Need-payoff. Question-based selling for discovery and value.', stages: 4, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
      { id: 'Custom', name: 'Custom', type: 'custom', description: 'Tenant-defined methodology. Configure stages, requirements, and risks per tenant.', stages: 0, requiredFields: 0, exitCriteria: 0, tenantsUsing: 0, activeOpportunities: null, avgComplianceScore: null },
    ];
    fastify.get(
      '/api/v1/sales-methodology/templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List methodology templates for View All Methodologies (§3.1.1). Returns standard + Custom cards; tenantsUsing from DB; activeOpportunities/avgComplianceScore when available.',
          tags: ['Sales Methodology'],
          security: [{ bearerAuth: [] }],
          response: {
            200: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['standard', 'custom'] },
                  description: { type: 'string' },
                  stages: { type: 'number' },
                  requiredFields: { type: 'number' },
                  exitCriteria: { type: 'number' },
                  tenantsUsing: { type: 'number' },
                  activeOpportunities: { type: ['number', 'null'] },
                  avgComplianceScore: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
      },
      async (_request, reply) => {
        try {
          const counts = await salesMethodologyService.listMethodologyTypeCounts();
          const templates: MethodologyCard[] = METHODOLOGY_TEMPLATES_BASE.map((t) => ({
            ...t,
            tenantsUsing: counts[t.id] ?? 0,
          }));
          return reply.send(templates);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List methodology templates failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          return (reply as { status: (code: number) => typeof reply }).status(500).send({
            error: { code: 'METHODOLOGY_TEMPLATES_FAILED', message: msg || 'Failed to list methodology templates' },
          });
        }
      }
    );

    // Plan W10: Tenant ML Configuration (REQUIREMENTS_GAP_ANALYSIS Gap 4)
    fastify.get(
      '/api/v1/tenant-ml-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get tenant ML configuration (risk tolerance, decision preferences, model preferences, custom features). 404 if not configured.',
          tags: ['Tenant ML Config'],
          security: [{ bearerAuth: [] }],
          response: {
            200: { type: 'object', description: 'TenantMLConfiguration document' },
            404: { type: 'object', properties: { error: { type: 'object' } } },
          },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        try {
          const doc = await tenantMLConfigService.getByTenantId(tenantId);
          if (!doc) {
            return reply.status(404).send({
              error: { code: 'TENANT_ML_CONFIG_NOT_FOUND', message: 'Tenant ML configuration not configured' },
            });
          }
          return reply.send(doc);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get tenant ML config failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'TENANT_ML_CONFIG_GET_FAILED', message: msg || 'Failed to get tenant ML config' },
          });
        }
      }
    );

    fastify.put<{ Body: UpsertTenantMLConfigBody }>(
      '/api/v1/tenant-ml-config',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create or update tenant ML configuration. Body: riskTolerance, decisionPreferences, modelPreferences, customFeatures?. Tenant from X-Tenant-ID.',
          tags: ['Tenant ML Config'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['riskTolerance', 'decisionPreferences', 'modelPreferences'],
            properties: {
              riskTolerance: {
                type: 'object',
                required: ['overallTolerance', 'autoEscalationThreshold'],
                properties: {
                  overallTolerance: { type: 'string', enum: ['conservative', 'balanced', 'aggressive'] },
                  categoryTolerances: { type: 'object' },
                  autoEscalationThreshold: { type: 'number' },
                },
              },
              decisionPreferences: {
                type: 'object',
                properties: {
                  autoMarkHot: { type: 'boolean' },
                  autoCreateTasks: { type: 'boolean' },
                  requireApprovalForActions: { type: 'boolean' },
                },
              },
              modelPreferences: {
                type: 'object',
                properties: {
                  preferIndustryModels: { type: 'boolean' },
                  abTestingEnabled: { type: 'boolean' },
                  minConfidenceThreshold: { type: 'number' },
                },
              },
              customFeatures: { type: 'array', items: { type: 'object' } },
            },
          },
          response: { 200: { type: 'object', description: 'TenantMLConfiguration document' } },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        const body = request.body as UpsertTenantMLConfigBody;
        try {
          const doc = await tenantMLConfigService.upsert(tenantId, body);
          return reply.send(doc);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Upsert tenant ML config failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'TENANT_ML_CONFIG_UPSERT_FAILED', message: msg || 'Failed to upsert tenant ML config' },
          });
        }
      }
    );

    // W9 Layer 6: Reactivation evaluate (FR-6.7)
    fastify.post<{
      Body: {
        opportunityIds: string[];
        minProbability?: number;
        maxOpportunities?: number;
        includeStrategy?: boolean;
      };
    }>(
      '/api/v1/reactivation/evaluate',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'W9 Layer 6: Evaluate opportunities for reactivation. Calls ml-service for dormant features and prediction, optionally llm-service for strategy. Publishes reactivation.opportunity.identified and reactivation.strategy.generated.',
          tags: ['Reactivation'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityIds'],
            properties: {
              opportunityIds: { type: 'array', items: { type: 'string' } },
              minProbability: { type: 'number' },
              maxOpportunities: { type: 'number' },
              includeStrategy: { type: 'boolean' },
            },
          },
          response: {
            200: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  opportunityId: { type: 'string' },
                  dormantFeatures: { type: 'object' },
                  reactivationPrediction: { type: 'object' },
                  reactivationStrategy: { type: 'object', nullable: true },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId;
        if (!tenantId) {
          return (reply as { status: (code: number) => typeof reply }).status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        }
        const body = request.body;
        try {
          const items = await reactivationService.evaluateReactivationOpportunities(tenantId, body.opportunityIds, {
            minProbability: body.minProbability,
            maxOpportunities: body.maxOpportunities,
            includeStrategy: body.includeStrategy,
          });
          return reply.send(items);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Reactivation evaluate failed', error instanceof Error ? error : new Error(msg), { service: 'risk-analytics' });
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          return (reply as { status: (code: number) => typeof reply }).status(statusCode).send({
            error: { code: 'REACTIVATION_EVALUATE_FAILED', message: msg || 'Failed to evaluate reactivation opportunities' },
          });
        }
      }
    );

    log.info('Risk analytics routes registered', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'risk-analytics' });
    throw error;
  }
}
