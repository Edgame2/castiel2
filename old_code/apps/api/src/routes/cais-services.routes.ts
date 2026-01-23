/**
 * CAIS Services API Routes
 * REST endpoints for all new Compound AI System services
 * Includes: Phase 1-7 services (22 total services)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';

export async function registerCAISServicesRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & {
    monitoring: IMonitoringProvider;
  }
): Promise<void> {
  const { monitoring } = options;

  // Get authenticate decorator
  const authenticate = (fastify as any).authenticate;
  if (!authenticate) {
    fastify.log.warn('⚠️ CAIS Services routes not registered - authenticate decorator missing');
    return;
  }

  // Get services from server instance (initialized in adaptive-learning-services.init.ts)
  const conflictResolutionLearningService = (fastify as any).conflictResolutionLearningService;
  const hierarchicalMemoryService = (fastify as any).hierarchicalMemoryService;
  const adversarialTestingService = (fastify as any).adversarialTestingService;
  const communicationAnalysisService = (fastify as any).communicationAnalysisService;
  const calendarIntelligenceService = (fastify as any).calendarIntelligenceService;
  const socialSignalService = (fastify as any).socialSignalService;
  const productUsageService = (fastify as any).productUsageService;
  const anomalyDetectionService = (fastify as any).anomalyDetectionService;
  const explanationQualityService = (fastify as any).explanationQualityService;
  const explanationMonitoringService = (fastify as any).explanationMonitoringService;
  const collaborativeIntelligenceService = (fastify as any).collaborativeIntelligenceService;
  const forecastDecompositionService = (fastify as any).forecastDecompositionService;
  const consensusForecastingService = (fastify as any).consensusForecastingService;
  const forecastCommitmentService = (fastify as any).forecastCommitmentService;
  const pipelineHealthService = (fastify as any).pipelineHealthService;
  const playbookExecutionService = (fastify as any).playbookExecutionService;
  const negotiationIntelligenceService = (fastify as any).negotiationIntelligenceService;
  const relationshipEvolutionService = (fastify as any).relationshipEvolutionService;
  const competitiveIntelligenceService = (fastify as any).competitiveIntelligenceService;
  const customerSuccessIntegrationService = (fastify as any).customerSuccessIntegrationService;
  const selfHealingService = (fastify as any).selfHealingService;
  const federatedLearningService = (fastify as any).federatedLearningService;

  // ============================================
  // Phase 1: Core Learning Services
  // ============================================

  /**
   * POST /cais/conflict-resolution/resolve
   * Resolve conflicts between detection methods
   */
  if (conflictResolutionLearningService) {
    fastify.post<{
      Body: {
        tenantId: string;
        contextKey: string;
        method1: string;
        method2: string;
        conflictType: string;
        conflictDescription: string;
      };
    }>(
      '/cais/conflict-resolution/resolve',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 1'],
          summary: 'Resolve conflict between detection methods',
          description: 'Resolves conflicts between two detection methods using learned strategies',
          body: {
            type: 'object',
            required: ['tenantId', 'contextKey', 'method1', 'method2', 'conflictType'],
            properties: {
              tenantId: { type: 'string' },
              contextKey: { type: 'string' },
              method1: { type: 'string' },
              method2: { type: 'string' },
              conflictType: { type: 'string' },
              conflictDescription: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, contextKey, method1, method2, conflictType, conflictDescription } = request.body;
          const resolution = await conflictResolutionLearningService.resolveConflict(
            tenantId,
            contextKey,
            method1,
            method2,
            conflictType,
            conflictDescription
          );
          return reply.code(200).send(resolution);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.conflict-resolution.resolve' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/memory/store
   * Store memory record
   */
  if (hierarchicalMemoryService) {
    fastify.post<{
      Body: {
        tenantId: string;
        tier: 'immediate' | 'session' | 'temporal' | 'relational' | 'global';
        content: any;
        contextKey: string;
        tags?: string[];
      };
    }>(
      '/cais/memory/store',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 1'],
          summary: 'Store memory record',
          description: 'Stores a memory record in the hierarchical memory system',
          body: {
            type: 'object',
            required: ['tenantId', 'tier', 'content', 'contextKey'],
            properties: {
              tenantId: { type: 'string' },
              tier: { type: 'string', enum: ['immediate', 'session', 'temporal', 'relational', 'global'] },
              content: { type: 'object' },
              contextKey: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, tier, content, contextKey, tags } = request.body;
          const record = await hierarchicalMemoryService.storeMemory(tenantId, tier, content, contextKey, tags);
          return reply.code(200).send(record);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.memory.store' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );

    /**
     * GET /cais/memory/retrieve/:tenantId
     * Retrieve memory records
     */
    fastify.get<{
      Params: { tenantId: string };
      Querystring: { contextKey?: string; tier?: string; limit?: number };
    }>(
      '/cais/memory/retrieve/:tenantId',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 1'],
          summary: 'Retrieve memory records',
          description: 'Retrieves memory records from the hierarchical memory system',
          params: {
            type: 'object',
            required: ['tenantId'],
            properties: {
              tenantId: { type: 'string' },
            },
          },
          querystring: {
            type: 'object',
            properties: {
              contextKey: { type: 'string' },
              tier: { type: 'string' },
              limit: { type: 'number', default: 10 },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId } = request.params;
          const { contextKey, tier, limit = 10 } = request.query;
          const result = await hierarchicalMemoryService.retrieveMemory(tenantId, contextKey, tier, limit);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.memory.retrieve' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/adversarial/test
   * Run adversarial test
   */
  if (adversarialTestingService) {
    fastify.post<{
      Body: {
        tenantId: string;
        testType: 'input_perturbation' | 'stress_test' | 'gaming_detection';
        target: string;
        parameters?: Record<string, any>;
      };
    }>(
      '/cais/adversarial/test',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 1'],
          summary: 'Run adversarial test',
          description: 'Runs an adversarial test to detect vulnerabilities',
          body: {
            type: 'object',
            required: ['tenantId', 'testType', 'target'],
            properties: {
              tenantId: { type: 'string' },
              testType: { type: 'string', enum: ['input_perturbation', 'stress_test', 'gaming_detection'] },
              target: { type: 'string' },
              parameters: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, testType, target, parameters } = request.body;
          const result = await adversarialTestingService.runTest(tenantId, testType, target, parameters);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.adversarial.test' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 2: Signal Intelligence Services
  // ============================================

  /**
   * POST /cais/communication/analyze
   * Analyze communication (email, meeting, etc.)
   */
  if (communicationAnalysisService) {
    fastify.post<{
      Body: {
        tenantId: string;
        communicationType: 'email' | 'meeting' | 'call' | 'message';
        content: string;
        opportunityId?: string;
        metadata?: Record<string, any>;
      };
    }>(
      '/cais/communication/analyze',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 2'],
          summary: 'Analyze communication',
          description: 'Analyzes communication content for sentiment, tone, and engagement',
          body: {
            type: 'object',
            required: ['tenantId', 'communicationType', 'content'],
            properties: {
              tenantId: { type: 'string' },
              communicationType: { type: 'string', enum: ['email', 'meeting', 'call', 'message'] },
              content: { type: 'string' },
              opportunityId: { type: 'string' },
              metadata: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, communicationType, content, opportunityId, metadata } = request.body;
          const result = await communicationAnalysisService.analyzeCommunication(
            tenantId,
            communicationType,
            content,
            opportunityId,
            metadata
          );
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.communication.analyze' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/calendar/analyze
   * Analyze calendar patterns
   */
  if (calendarIntelligenceService) {
    fastify.post<{
      Body: {
        tenantId: string;
        opportunityId: string;
        events: Array<{
          startTime: Date;
          endTime: Date;
          attendees: string[];
          status: string;
          subject: string;
        }>;
      };
    }>(
      '/cais/calendar/analyze',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 2'],
          summary: 'Analyze calendar patterns',
          description: 'Analyzes calendar events for sales intelligence patterns',
          body: {
            type: 'object',
            required: ['tenantId', 'opportunityId', 'events'],
            properties: {
              tenantId: { type: 'string' },
              opportunityId: { type: 'string' },
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: { type: 'string', format: 'date-time' },
                    attendees: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string' },
                    subject: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, opportunityId, events } = request.body;
          const result = await calendarIntelligenceService.analyzeCalendar(tenantId, opportunityId, events);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.calendar.analyze' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/social-signals/process
   * Process social signal
   */
  if (socialSignalService) {
    fastify.post<{
      Body: {
        tenantId: string;
        source: string;
        signalType: string;
        content: any;
        opportunityId?: string;
      };
    }>(
      '/cais/social-signals/process',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 2'],
          summary: 'Process social signal',
          description: 'Processes external social signals for sales intelligence',
          body: {
            type: 'object',
            required: ['tenantId', 'source', 'signalType', 'content'],
            properties: {
              tenantId: { type: 'string' },
              source: { type: 'string' },
              signalType: { type: 'string' },
              content: { type: 'object' },
              opportunityId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, source, signalType, content, opportunityId } = request.body;
          const result = await socialSignalService.processSignal(tenantId, source, signalType, content, opportunityId);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.social-signals.process' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/product-usage/track
   * Track product usage event
   */
  if (productUsageService) {
    fastify.post<{
      Body: {
        tenantId: string;
        accountId: string;
        eventType: string;
        eventData: Record<string, any>;
        opportunityId?: string;
      };
    }>(
      '/cais/product-usage/track',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 2'],
          summary: 'Track product usage event',
          description: 'Tracks product usage events for sales intelligence',
          body: {
            type: 'object',
            required: ['tenantId', 'accountId', 'eventType', 'eventData'],
            properties: {
              tenantId: { type: 'string' },
              accountId: { type: 'string' },
              eventType: { type: 'string' },
              eventData: { type: 'object' },
              opportunityId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, accountId, eventType, eventData, opportunityId } = request.body;
          const result = await productUsageService.trackEvent(tenantId, accountId, eventType, eventData, opportunityId);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.product-usage.track' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 3: Quality & Monitoring Services
  // ============================================

  /**
   * POST /cais/anomaly/detect
   * Detect anomalies
   */
  if (anomalyDetectionService) {
    fastify.post<{
      Body: {
        tenantId: string;
        opportunityId: string;
        data: Record<string, any>;
      };
    }>(
      '/cais/anomaly/detect',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 3'],
          summary: 'Detect anomalies',
          description: 'Detects anomalies in opportunity data',
          body: {
            type: 'object',
            required: ['tenantId', 'opportunityId', 'data'],
            properties: {
              tenantId: { type: 'string' },
              opportunityId: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, opportunityId, data } = request.body;
          const result = await anomalyDetectionService.detectOpportunityAnomalies(tenantId, opportunityId, data);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.anomaly.detect' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/explanation-quality/assess
   * Assess explanation quality
   */
  if (explanationQualityService) {
    fastify.post<{
      Body: {
        tenantId: string;
        explanation: any;
        explanationId: string;
      };
    }>(
      '/cais/explanation-quality/assess',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 3'],
          summary: 'Assess explanation quality',
          description: 'Assesses the quality of an AI explanation',
          body: {
            type: 'object',
            required: ['tenantId', 'explanation', 'explanationId'],
            properties: {
              tenantId: { type: 'string' },
              explanation: { type: 'object' },
              explanationId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, explanation, explanationId } = request.body;
          const result = await explanationQualityService.assessQuality(tenantId, explanation, explanationId);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.explanation-quality.assess' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/explanation-monitoring/track
   * Track explanation usage
   */
  if (explanationMonitoringService) {
    fastify.post<{
      Body: {
        tenantId: string;
        explanationId: string;
        userId: string;
        action: 'viewed' | 'dismissed' | 'feedback';
        feedback?: any;
      };
    }>(
      '/cais/explanation-monitoring/track',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 3'],
          summary: 'Track explanation usage',
          description: 'Tracks how users interact with AI explanations',
          body: {
            type: 'object',
            required: ['tenantId', 'explanationId', 'userId', 'action'],
            properties: {
              tenantId: { type: 'string' },
              explanationId: { type: 'string' },
              userId: { type: 'string' },
              action: { type: 'string', enum: ['viewed', 'dismissed', 'feedback'] },
              feedback: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, explanationId, userId, action, feedback } = request.body;
          const result = await explanationMonitoringService.trackUsage(tenantId, explanationId, userId, action, feedback);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.explanation-monitoring.track' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 4: Collaboration & Forecasting Services
  // ============================================

  /**
   * POST /cais/collaborative/learn-pattern
   * Learn team pattern
   */
  if (collaborativeIntelligenceService) {
    fastify.post<{
      Body: {
        tenantId: string;
        teamId: string;
        patternType: string;
        pattern: any;
      };
    }>(
      '/cais/collaborative/learn-pattern',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 4'],
          summary: 'Learn team pattern',
          description: 'Learns patterns from team behavior',
          body: {
            type: 'object',
            required: ['tenantId', 'teamId', 'patternType', 'pattern'],
            properties: {
              tenantId: { type: 'string' },
              teamId: { type: 'string' },
              patternType: { type: 'string' },
              pattern: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, teamId, patternType, pattern } = request.body;
          const result = await collaborativeIntelligenceService.learnTeamPattern(tenantId, teamId, patternType, pattern);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.collaborative.learn-pattern' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/forecast/decompose
   * Decompose forecast
   */
  if (forecastDecompositionService) {
    fastify.post<{
      Body: {
        tenantId: string;
        forecast: any;
      };
    }>(
      '/cais/forecast/decompose',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 4'],
          summary: 'Decompose forecast',
          description: 'Decomposes a forecast into time, source, confidence, and driver components',
          body: {
            type: 'object',
            required: ['tenantId', 'forecast'],
            properties: {
              tenantId: { type: 'string' },
              forecast: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, forecast } = request.body;
          const result = await forecastDecompositionService.decomposeForecast(tenantId, forecast);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.forecast.decompose' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/forecast/consensus
   * Generate consensus forecast
   */
  if (consensusForecastingService) {
    fastify.post<{
      Body: {
        tenantId: string;
        period: string;
        sources: Array<{
          source: string;
          forecast: number;
          confidence: number;
          timestamp: Date;
        }>;
      };
    }>(
      '/cais/forecast/consensus',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 4'],
          summary: 'Generate consensus forecast',
          description: 'Generates a consensus forecast from multiple sources',
          body: {
            type: 'object',
            required: ['tenantId', 'period', 'sources'],
            properties: {
              tenantId: { type: 'string' },
              period: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    forecast: { type: 'number' },
                    confidence: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, period, sources } = request.body;
          const result = await consensusForecastingService.generateConsensus(tenantId, period, sources);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.forecast.consensus' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/forecast/commitment/analyze
   * Analyze forecast commitment
   */
  if (forecastCommitmentService) {
    fastify.post<{
      Body: {
        tenantId: string;
        period: string;
        forecast: {
          commit: number;
          bestCase: number;
          upside: number;
          risk: number;
          total: number;
        };
        userId: string;
      };
    }>(
      '/cais/forecast/commitment/analyze',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 4'],
          summary: 'Analyze forecast commitment',
          description: 'Analyzes forecast commitment levels and detects sandbagging/happy ears',
          body: {
            type: 'object',
            required: ['tenantId', 'period', 'forecast', 'userId'],
            properties: {
              tenantId: { type: 'string' },
              period: { type: 'string' },
              forecast: {
                type: 'object',
                required: ['commit', 'bestCase', 'upside', 'risk', 'total'],
                properties: {
                  commit: { type: 'number' },
                  bestCase: { type: 'number' },
                  upside: { type: 'number' },
                  risk: { type: 'number' },
                  total: { type: 'number' },
                },
              },
              userId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, period, forecast, userId } = request.body;
          const result = await forecastCommitmentService.analyzeCommitment(tenantId, period, forecast, userId);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.forecast.commitment.analyze' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 5: Pipeline Services
  // ============================================

  /**
   * GET /cais/pipeline-health/:tenantId/:userId
   * Calculate pipeline health
   */
  if (pipelineHealthService) {
    fastify.get<{
      Params: { tenantId: string; userId: string };
    }>(
      '/cais/pipeline-health/:tenantId/:userId',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 5'],
          summary: 'Calculate pipeline health',
          description: 'Calculates comprehensive health score for sales pipeline',
          params: {
            type: 'object',
            required: ['tenantId', 'userId'],
            properties: {
              tenantId: { type: 'string' },
              userId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, userId } = request.params;
          const result = await pipelineHealthService.calculateHealth(tenantId, userId);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.pipeline-health.calculate' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 6: Execution & Intelligence Services
  // ============================================

  /**
   * POST /cais/playbook/execute
   * Execute playbook
   */
  if (playbookExecutionService) {
    fastify.post<{
      Body: {
        tenantId: string;
        playbookId: string;
        context: Record<string, any>;
      };
    }>(
      '/cais/playbook/execute',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 6'],
          summary: 'Execute playbook',
          description: 'Executes a sales playbook with given context',
          body: {
            type: 'object',
            required: ['tenantId', 'playbookId', 'context'],
            properties: {
              tenantId: { type: 'string' },
              playbookId: { type: 'string' },
              context: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, playbookId, context } = request.body;
          const result = await playbookExecutionService.executePlaybook(tenantId, playbookId, context);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.playbook.execute' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/negotiation/analyze
   * Analyze negotiation
   */
  if (negotiationIntelligenceService) {
    fastify.post<{
      Body: {
        tenantId: string;
        opportunityId: string;
        negotiationData: any;
      };
    }>(
      '/cais/negotiation/analyze',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 6'],
          summary: 'Analyze negotiation',
          description: 'Analyzes negotiation and provides strategy recommendations',
          body: {
            type: 'object',
            required: ['tenantId', 'opportunityId', 'negotiationData'],
            properties: {
              tenantId: { type: 'string' },
              opportunityId: { type: 'string' },
              negotiationData: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, opportunityId, negotiationData } = request.body;
          const result = await negotiationIntelligenceService.analyzeNegotiation(tenantId, opportunityId, negotiationData);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.negotiation.analyze' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/relationship/track
   * Track relationship evolution
   */
  if (relationshipEvolutionService) {
    fastify.post<{
      Body: {
        tenantId: string;
        sourceShardId: string;
        targetShardId: string;
        relationshipType: string;
      };
    }>(
      '/cais/relationship/track',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 6'],
          summary: 'Track relationship evolution',
          description: 'Tracks relationship evolution and health over time',
          body: {
            type: 'object',
            required: ['tenantId', 'sourceShardId', 'targetShardId', 'relationshipType'],
            properties: {
              tenantId: { type: 'string' },
              sourceShardId: { type: 'string' },
              targetShardId: { type: 'string' },
              relationshipType: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, sourceShardId, targetShardId, relationshipType } = request.body;
          const result = await relationshipEvolutionService.trackEvolution(tenantId, sourceShardId, targetShardId, relationshipType);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.relationship.track' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/competitive/analyze
   * Analyze competitive intelligence
   */
  if (competitiveIntelligenceService) {
    fastify.post<{
      Body: {
        tenantId: string;
        opportunityId: string;
        competitorData: any;
      };
    }>(
      '/cais/competitive/analyze',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 6'],
          summary: 'Analyze competitive intelligence',
          description: 'Analyzes competitive intelligence and provides threat detection',
          body: {
            type: 'object',
            required: ['tenantId', 'opportunityId', 'competitorData'],
            properties: {
              tenantId: { type: 'string' },
              opportunityId: { type: 'string' },
              competitorData: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, opportunityId, competitorData } = request.body;
          const result = await competitiveIntelligenceService.analyzeCompetition(tenantId, opportunityId, competitorData);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.competitive.analyze' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/customer-success/integrate
   * Integrate customer success data
   */
  if (customerSuccessIntegrationService) {
    fastify.post<{
      Body: {
        tenantId: string;
        accountId: string;
        csData: any;
      };
    }>(
      '/cais/customer-success/integrate',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 6'],
          summary: 'Integrate customer success data',
          description: 'Integrates customer success data with sales intelligence',
          body: {
            type: 'object',
            required: ['tenantId', 'accountId', 'csData'],
            properties: {
              tenantId: { type: 'string' },
              accountId: { type: 'string' },
              csData: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, accountId, csData } = request.body;
          const result = await customerSuccessIntegrationService.integrateCSData(tenantId, accountId, csData);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.customer-success.integrate' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  // ============================================
  // Phase 7: Advanced Services
  // ============================================

  /**
   * POST /cais/self-healing/detect-and-remediate
   * Detect and remediate issues
   */
  if (selfHealingService) {
    fastify.post<{
      Body: {
        tenantId: string;
        issueType: string;
        issueData: any;
      };
    }>(
      '/cais/self-healing/detect-and-remediate',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 7'],
          summary: 'Detect and remediate issues',
          description: 'Automatically detects and remediates issues',
          body: {
            type: 'object',
            required: ['tenantId', 'issueType', 'issueData'],
            properties: {
              tenantId: { type: 'string' },
              issueType: { type: 'string' },
              issueData: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, issueType, issueData } = request.body;
          const result = await selfHealingService.detectAndRemediate(tenantId, issueType, issueData);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.self-healing.detect-and-remediate' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  /**
   * POST /cais/federated-learning/start-round
   * Start federated learning round
   */
  if (federatedLearningService) {
    fastify.post<{
      Body: {
        tenantId: string;
        modelType: string;
        roundConfig: any;
      };
    }>(
      '/cais/federated-learning/start-round',
      {
        preHandler: [authenticate],
        schema: {
          tags: ['CAIS Services', 'Phase 7'],
          summary: 'Start federated learning round',
          description: 'Starts a new federated learning round',
          body: {
            type: 'object',
            required: ['tenantId', 'modelType', 'roundConfig'],
            properties: {
              tenantId: { type: 'string' },
              modelType: { type: 'string' },
              roundConfig: { type: 'object' },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { tenantId, modelType, roundConfig } = request.body;
          const result = await federatedLearningService.startRound(tenantId, modelType, roundConfig);
          return reply.code(200).send(result);
        } catch (error: any) {
          monitoring.trackException(error, { operation: 'cais.federated-learning.start-round' });
          return reply.code(500).send({ error: error.message });
        }
      }
    );
  }

  fastify.log.info('✅ CAIS Services routes registered');
}
