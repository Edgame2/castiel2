/**
 * Adaptive Learning Services Initialization
 * Initializes adaptive learning services for zero-hardcoding philosophy
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { AdaptiveWeightLearningService } from '../adaptive-weight-learning.service.js';
import { AdaptiveModelSelectionService } from '../adaptive-model-selection.service.js';
import { SignalWeightingService } from '../signal-weighting.service.js';
import { AdaptiveFeatureEngineeringService } from '../adaptive-feature-engineering.service.js';
import { OutcomeCollectorService } from '../outcome-collector.service.js';
import { PerformanceTrackerService } from '../performance-tracker.service.js';
import { AdaptiveLearningValidationService } from '../adaptive-learning-validation.service.js';
import { AdaptiveLearningRolloutService } from '../adaptive-learning-rollout.service.js';
import { MetaLearningService } from '../meta-learning.service.js';
import { ActiveLearningService } from '../active-learning.service.js';
import { FeedbackQualityService } from '../feedback-quality.service.js';
import { EpisodicMemoryService } from '../episodic-memory.service.js';
import { CounterfactualService } from '../counterfactual.service.js';
import { CausalInferenceService } from '../causal-inference.service.js';
import { MultiModalIntelligenceService } from '../multimodal-intelligence.service.js';
import { PrescriptiveAnalyticsService } from '../prescriptive-analytics.service.js';
import { ReinforcementLearningService } from '../reinforcement-learning.service.js';
import { GraphNeuralNetworkService } from '../graph-neural-network.service.js';
import { NeuroSymbolicService } from '../neuro-symbolic.service.js';
import { ConflictResolutionLearningService } from '../conflict-resolution-learning.service.js';
import { HierarchicalMemoryService } from '../hierarchical-memory.service.js';
import { AdversarialTestingService } from '../adversarial-testing.service.js';
import { CommunicationAnalysisService } from '../communication-analysis.service.js';
import { CalendarIntelligenceService } from '../calendar-intelligence.service.js';
import { SocialSignalService } from '../social-signal.service.js';
import { ProductUsageService } from '../product-usage.service.js';
import { AnomalyDetectionService } from '../anomaly-detection.service.js';
import { ExplanationQualityService } from '../explanation-quality.service.js';
import { ExplanationMonitoringService } from '../explanation-monitoring.service.js';
import { CollaborativeIntelligenceService } from '../collaborative-intelligence.service.js';
import { ForecastDecompositionService } from '../forecast-decomposition.service.js';
import { ConsensusForecastingService } from '../consensus-forecasting.service.js';
import { ForecastCommitmentService } from '../forecast-commitment.service.js';
import { PipelineHealthService } from '../pipeline-health.service.js';
import { PlaybookExecutionService } from '../playbook-execution.service.js';
import { NegotiationIntelligenceService } from '../negotiation-intelligence.service.js';
import { RelationshipEvolutionService } from '../relationship-evolution.service.js';
import { CompetitiveIntelligenceService } from '../competitive-intelligence.service.js';
import { CustomerSuccessIntegrationService } from '../customer-success-integration.service.js';
import { SelfHealingService } from '../self-healing.service.js';
import { FederatedLearningService } from '../federated-learning.service.js';
import { FeatureFlagService } from '../feature-flag.service.js';
import { FeedbackLearningService } from '../feedback-learning.service.js';
import { ServiceInitializationRegistry } from './service-registry.init.js';

export interface AdaptiveLearningServicesResult {
  adaptiveWeightLearningService?: AdaptiveWeightLearningService;
  adaptiveModelSelectionService?: AdaptiveModelSelectionService;
  signalWeightingService?: SignalWeightingService;
  adaptiveFeatureEngineeringService?: AdaptiveFeatureEngineeringService;
  outcomeCollectorService?: OutcomeCollectorService;
  performanceTrackerService?: PerformanceTrackerService;
  validationService?: AdaptiveLearningValidationService;
  rolloutService?: AdaptiveLearningRolloutService;
  metaLearningService?: MetaLearningService;
  activeLearningService?: ActiveLearningService;
  feedbackQualityService?: FeedbackQualityService;
  episodicMemoryService?: EpisodicMemoryService;
  counterfactualService?: CounterfactualService;
  causalInferenceService?: CausalInferenceService;
  multimodalIntelligenceService?: MultiModalIntelligenceService;
  prescriptiveAnalyticsService?: PrescriptiveAnalyticsService;
  reinforcementLearningService?: ReinforcementLearningService;
  graphNeuralNetworkService?: GraphNeuralNetworkService;
  neuroSymbolicService?: NeuroSymbolicService;
  conflictResolutionLearningService?: ConflictResolutionLearningService;
  hierarchicalMemoryService?: HierarchicalMemoryService;
  adversarialTestingService?: AdversarialTestingService;
  communicationAnalysisService?: CommunicationAnalysisService;
  calendarIntelligenceService?: CalendarIntelligenceService;
  socialSignalService?: SocialSignalService;
  productUsageService?: ProductUsageService;
  anomalyDetectionService?: AnomalyDetectionService;
  explanationQualityService?: ExplanationQualityService;
  explanationMonitoringService?: ExplanationMonitoringService;
  collaborativeIntelligenceService?: CollaborativeIntelligenceService;
  forecastDecompositionService?: ForecastDecompositionService;
  consensusForecastingService?: ConsensusForecastingService;
  forecastCommitmentService?: ForecastCommitmentService;
  pipelineHealthService?: PipelineHealthService;
  playbookExecutionService?: PlaybookExecutionService;
  negotiationIntelligenceService?: NegotiationIntelligenceService;
  relationshipEvolutionService?: RelationshipEvolutionService;
  competitiveIntelligenceService?: CompetitiveIntelligenceService;
  customerSuccessIntegrationService?: CustomerSuccessIntegrationService;
  selfHealingService?: SelfHealingService;
  federatedLearningService?: FederatedLearningService;
}

/**
 * Initialize adaptive learning services
 * 
 * Dependencies:
 * - Core services (Cosmos DB, Redis)
 * - AI services (for integration)
 */
export async function initializeAdaptiveLearningServices(
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  cosmosClient?: CosmosClient,
  redis?: Redis,
  serviceRegistry?: ServiceInitializationRegistry
): Promise<AdaptiveLearningServicesResult> {
  const result: AdaptiveLearningServicesResult = {};

  try {
    // Get Cosmos client from server or use provided
    const cosmos = cosmosClient || (server as any).cosmosClient;
    if (!cosmos) {
      server.log.warn('⚠️ Cosmos DB client not available for adaptive learning services');
      return result;
    }

    // Get Redis from server or use provided
    const cache = redis || (server as any).redis;

      // Initialize Adaptive Learning Services
      if (cosmos) {
        // 1. AdaptiveWeightLearningService
        result.adaptiveWeightLearningService = new AdaptiveWeightLearningService(
          cosmos,
          cache,
          monitoring
        );

        // 2. AdaptiveModelSelectionService
        result.adaptiveModelSelectionService = new AdaptiveModelSelectionService(
          cosmos,
          cache,
          monitoring
        );

        // 3. SignalWeightingService
        result.signalWeightingService = new SignalWeightingService(
          cosmos,
          cache,
          monitoring
        );

        // 4. AdaptiveFeatureEngineeringService
        result.adaptiveFeatureEngineeringService = new AdaptiveFeatureEngineeringService(
          cosmos,
          cache,
          monitoring
        );

        // 5. OutcomeCollectorService
        result.outcomeCollectorService = new OutcomeCollectorService(
          cosmos,
          cache,
          monitoring
        );

        // 6. PerformanceTrackerService
        result.performanceTrackerService = new PerformanceTrackerService(
          cosmos,
          cache,
          monitoring
        );

        // 7. AdaptiveLearningValidationService
        result.validationService = new AdaptiveLearningValidationService(
          cosmos,
          cache,
          monitoring
        );

        // 8. AdaptiveLearningRolloutService
        const featureFlagService = (server as any).featureFlagService as FeatureFlagService | undefined;
        result.rolloutService = new AdaptiveLearningRolloutService(
          cosmos,
          cache,
          monitoring,
          featureFlagService
        );

        // 9. MetaLearningService
        result.metaLearningService = new MetaLearningService(
          cosmos,
          cache,
          monitoring
        );

        // 10. ActiveLearningService
        const feedbackService = (server as any).feedbackLearningService as FeedbackLearningService | undefined;
        result.activeLearningService = new ActiveLearningService(
          cosmos,
          cache,
          monitoring,
          feedbackService
        );

        // 11. FeedbackQualityService
        result.feedbackQualityService = new FeedbackQualityService(
          cosmos,
          cache,
          monitoring,
          feedbackService
        );

        // 12. EpisodicMemoryService
        result.episodicMemoryService = new EpisodicMemoryService(
          cosmos,
          cache,
          monitoring
        );

        // 13. CounterfactualService
        const riskEvaluationService = (server as any).riskEvaluationService;
        result.counterfactualService = new CounterfactualService(
          cosmos,
          cache,
          monitoring,
          riskEvaluationService
        );

        // 14. CausalInferenceService
        const causalOpportunityService = (server as any).opportunityService;
        result.causalInferenceService = new CausalInferenceService(
          cosmos,
          cache,
          monitoring,
          causalOpportunityService,
          riskEvaluationService
        );

        // 15. MultiModalIntelligenceService
        const multimodalAssetService = (server as any).multimodalAssetService;
        const insightService = (server as any).insightService;
        const vectorSearchService = (server as any).vectorSearchService;
        result.multimodalIntelligenceService = new MultiModalIntelligenceService(
          cosmos,
          cache,
          monitoring,
          multimodalAssetService,
          insightService,
          vectorSearchService
        );

        // 16. PrescriptiveAnalyticsService
        const prescriptiveRecommendationsService = (server as any).recommendationsService;
        const prescriptiveOpportunityService = (server as any).opportunityService;
        result.prescriptiveAnalyticsService = new PrescriptiveAnalyticsService(
          cosmos,
          cache,
          monitoring,
          riskEvaluationService,
          result.causalInferenceService,
          prescriptiveRecommendationsService,
          prescriptiveOpportunityService
        );

        // 17. ConflictResolutionLearningService
        result.conflictResolutionLearningService = new ConflictResolutionLearningService(
          cosmos,
          cache,
          monitoring
        );

        // 18. HierarchicalMemoryService
        result.hierarchicalMemoryService = new HierarchicalMemoryService(
          cosmos,
          cache,
          monitoring
        );

        // 19. AdversarialTestingService
        result.adversarialTestingService = new AdversarialTestingService(
          cosmos,
          cache,
          monitoring,
          result.outcomeCollectorService,
          result.performanceTrackerService
        );

        // 20. CommunicationAnalysisService
        const multimodalIntelligence = (server as any).multimodalIntelligenceService;
        const vectorSearch = (server as any).vectorSearchService;
        result.communicationAnalysisService = new CommunicationAnalysisService(
          cosmos,
          cache,
          monitoring,
          multimodalIntelligence,
          vectorSearch
        );

        // 21. CalendarIntelligenceService
        result.calendarIntelligenceService = new CalendarIntelligenceService(
          cosmos,
          cache,
          monitoring,
          result.communicationAnalysisService
        );

        // 22. SocialSignalService
        result.socialSignalService = new SocialSignalService(
          cosmos,
          cache,
          monitoring,
          result.multimodalIntelligenceService
        );

        // 23. ProductUsageService
        result.productUsageService = new ProductUsageService(
          cosmos,
          cache,
          monitoring,
          result.multimodalIntelligenceService
        );

        // 24. AnomalyDetectionService
        const earlyWarningService = (server as any).earlyWarningService;
        const dataQualityService = (server as any).dataQualityService;
        result.anomalyDetectionService = new AnomalyDetectionService(
          cosmos,
          cache,
          monitoring,
          earlyWarningService,
          dataQualityService
        );

        // 25. ExplanationQualityService
        const explainableAIService = (server as any).explainableAIService;
        const feedbackLearningService = (server as any).feedbackLearningService;
        result.explanationQualityService = new ExplanationQualityService(
          cosmos,
          cache,
          monitoring,
          explainableAIService,
          feedbackLearningService
        );

        // 26. ExplanationMonitoringService
        result.explanationMonitoringService = new ExplanationMonitoringService(
          cosmos,
          cache,
          monitoring,
          result.explanationQualityService,
          explainableAIService
        );

        // 27. CollaborativeIntelligenceService
        result.collaborativeIntelligenceService = new CollaborativeIntelligenceService(
          cosmos,
          cache,
          monitoring,
          feedbackLearningService,
          result.metaLearningService
        );

        // 28. ForecastDecompositionService
        const revenueForecastService = (server as any).revenueForecastService;
        const quotaService = (server as any).quotaService;
        result.forecastDecompositionService = new ForecastDecompositionService(
          cosmos,
          cache,
          monitoring,
          revenueForecastService,
          quotaService
        );

        // 29. ConsensusForecastingService
        result.consensusForecastingService = new ConsensusForecastingService(
          cosmos,
          cache,
          monitoring,
          result.forecastDecompositionService,
          revenueForecastService
        );

        // 30. ForecastCommitmentService
        result.forecastCommitmentService = new ForecastCommitmentService(
          cosmos,
          cache,
          monitoring,
          result.consensusForecastingService,
          (server as any).riskEvaluationService
        );

        // 31. PipelineHealthService
        const pipelineAnalyticsService = (server as any).pipelineAnalyticsService;
        const opportunityService = (server as any).opportunityService;
        result.pipelineHealthService = new PipelineHealthService(
          cosmos,
          cache,
          monitoring,
          pipelineAnalyticsService,
          (server as any).riskEvaluationService,
          opportunityService
        );

        // 32. PlaybookExecutionService
        const workflowAutomationService = (server as any).workflowAutomationService;
        const playbookRecommendationsService = (server as any).recommendationsService;
        result.playbookExecutionService = new PlaybookExecutionService(
          cosmos,
          cache,
          monitoring,
          workflowAutomationService,
          playbookRecommendationsService
        );

        // 33. NegotiationIntelligenceService
        result.negotiationIntelligenceService = new NegotiationIntelligenceService(
          cosmos,
          cache,
          monitoring,
          (server as any).riskEvaluationService,
          result.communicationAnalysisService
        );

        // 34. RelationshipEvolutionService
        const shardRelationshipService = (server as any).shardRelationshipService;
        result.relationshipEvolutionService = new RelationshipEvolutionService(
          cosmos,
          cache,
          monitoring,
          shardRelationshipService,
          result.communicationAnalysisService,
          result.calendarIntelligenceService
        );

        // 35. CompetitiveIntelligenceService
        result.competitiveIntelligenceService = new CompetitiveIntelligenceService(
          cosmos,
          cache,
          monitoring,
          result.socialSignalService,
          (server as any).riskEvaluationService
        );

        // 36. CustomerSuccessIntegrationService
        result.customerSuccessIntegrationService = new CustomerSuccessIntegrationService(
          cosmos,
          cache,
          monitoring,
          result.productUsageService,
          result.relationshipEvolutionService
        );

        // 37. SelfHealingService
        result.selfHealingService = new SelfHealingService(
          cosmos,
          cache,
          monitoring,
          result.anomalyDetectionService,
          result.playbookExecutionService,
          workflowAutomationService
        );

        // 38. FederatedLearningService
        result.federatedLearningService = new FederatedLearningService(
          cosmos,
          cache,
          monitoring,
          result.adaptiveWeightLearningService,
          result.metaLearningService
        );

        // Register with service registry if available
        if (serviceRegistry) {
          serviceRegistry.register(
            'AdaptiveWeightLearningService',
            result.adaptiveWeightLearningService,
            {
              name: 'AdaptiveWeightLearningService',
              category: 'adaptive-learning',
              required: false,
              dependencies: ['CosmosClient'],
              optionalDependencies: ['Redis'],
              initializationPhase: 3,
              description: 'Learns optimal component weights using Thompson Sampling',
            }
          );

          serviceRegistry.register(
            'AdaptiveModelSelectionService',
            result.adaptiveModelSelectionService,
            {
              name: 'AdaptiveModelSelectionService',
              category: 'adaptive-learning',
              required: false,
              dependencies: ['CosmosClient'],
              optionalDependencies: ['Redis'],
              initializationPhase: 3,
              description: 'Learns optimal model selection criteria and auto-graduates models',
            }
          );

          serviceRegistry.register(
            'SignalWeightingService',
            result.signalWeightingService,
            {
              name: 'SignalWeightingService',
              category: 'adaptive-learning',
              required: false,
              dependencies: ['CosmosClient'],
              optionalDependencies: ['Redis'],
              initializationPhase: 3,
              description: 'Learns optimal weights for different feedback signals',
            }
          );

          serviceRegistry.register(
            'AdaptiveFeatureEngineeringService',
            result.adaptiveFeatureEngineeringService,
            {
              name: 'AdaptiveFeatureEngineeringService',
              category: 'adaptive-learning',
              required: false,
              dependencies: ['CosmosClient'],
              optionalDependencies: ['Redis'],
              initializationPhase: 3,
              description: 'Context-aware feature engineering with learned importance',
            }
          );
        }

        // Store on server instance for access
        (server as any).adaptiveWeightLearningService = result.adaptiveWeightLearningService;
        (server as any).adaptiveModelSelectionService = result.adaptiveModelSelectionService;
        (server as any).signalWeightingService = result.signalWeightingService;
        (server as any).adaptiveFeatureEngineeringService = result.adaptiveFeatureEngineeringService;
        (server as any).outcomeCollectorService = result.outcomeCollectorService;
        (server as any).performanceTrackerService = result.performanceTrackerService;
        (server as any).adaptiveLearningValidationService = result.validationService;
        (server as any).adaptiveLearningRolloutService = result.rolloutService;
        (server as any).metaLearningService = result.metaLearningService;
        (server as any).activeLearningService = result.activeLearningService;
        (server as any).feedbackQualityService = result.feedbackQualityService;
        (server as any).episodicMemoryService = result.episodicMemoryService;
        (server as any).counterfactualService = result.counterfactualService;
        (server as any).causalInferenceService = result.causalInferenceService;
        (server as any).multimodalIntelligenceService = result.multimodalIntelligenceService;
        (server as any).prescriptiveAnalyticsService = result.prescriptiveAnalyticsService;
        (server as any).reinforcementLearningService = result.reinforcementLearningService;
        (server as any).graphNeuralNetworkService = result.graphNeuralNetworkService;
        (server as any).neuroSymbolicService = result.neuroSymbolicService;
        (server as any).conflictResolutionLearningService = result.conflictResolutionLearningService;
        (server as any).hierarchicalMemoryService = result.hierarchicalMemoryService;
        (server as any).adversarialTestingService = result.adversarialTestingService;
        (server as any).communicationAnalysisService = result.communicationAnalysisService;
        (server as any).calendarIntelligenceService = result.calendarIntelligenceService;
        (server as any).socialSignalService = result.socialSignalService;
        (server as any).productUsageService = result.productUsageService;
        (server as any).anomalyDetectionService = result.anomalyDetectionService;
        (server as any).explanationQualityService = result.explanationQualityService;
        (server as any).explanationMonitoringService = result.explanationMonitoringService;
        (server as any).collaborativeIntelligenceService = result.collaborativeIntelligenceService;
        (server as any).forecastDecompositionService = result.forecastDecompositionService;
        (server as any).consensusForecastingService = result.consensusForecastingService;
        (server as any).forecastCommitmentService = result.forecastCommitmentService;
        (server as any).pipelineHealthService = result.pipelineHealthService;
        (server as any).playbookExecutionService = result.playbookExecutionService;
        (server as any).negotiationIntelligenceService = result.negotiationIntelligenceService;
        (server as any).relationshipEvolutionService = result.relationshipEvolutionService;
        (server as any).competitiveIntelligenceService = result.competitiveIntelligenceService;
        (server as any).customerSuccessIntegrationService = result.customerSuccessIntegrationService;
        (server as any).selfHealingService = result.selfHealingService;
        (server as any).federatedLearningService = result.federatedLearningService;

        server.log.info('✅ Adaptive Learning Services initialized');
      } else {
        server.log.warn('⚠️ Adaptive Learning Services not fully initialized (missing Cosmos DB)');
      }
  } catch (err) {
    server.log.error({ err }, '❌ Adaptive Learning Services initialization failed');
    monitoring.trackException(err as Error, { operation: 'initializeAdaptiveLearningServices' });
  }

  return result;
}
