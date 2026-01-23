/**
 * CAIS Services Hooks
 * React Query hooks for CAIS services data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caisServicesApi } from '@/lib/api/cais-services';
import type {
  ConflictResolutionRequest,
  ConflictResolution,
  MemoryStoreRequest,
  MemoryRecord,
  MemoryRetrieveParams,
  MemoryRetrieveResult,
  AdversarialTestRequest,
  AdversarialTestResult,
  CommunicationAnalysisRequest,
  CommunicationAnalysis,
  CalendarAnalysisRequest,
  CalendarIntelligence,
  SocialSignalRequest,
  SocialSignal,
  ProductUsageTrackRequest,
  ProductUsageIntelligence,
  AnomalyDetectionRequest,
  AnomalyDetection,
  ExplanationQualityRequest,
  ExplanationQuality,
  ExplanationMonitoringRequest,
  ExplanationMonitoring,
  CollaborativeLearnPatternRequest,
  CollaborativeIntelligence,
  ForecastDecompositionRequest,
  ForecastDecomposition,
  ConsensusForecastRequest,
  ConsensusForecast,
  ForecastCommitmentRequest,
  ForecastCommitment,
  PipelineHealth,
  PlaybookExecutionRequest,
  PlaybookExecution,
  NegotiationAnalysisRequest,
  NegotiationIntelligence,
  RelationshipTrackRequest,
  RelationshipEvolution,
  CompetitiveAnalysisRequest,
  CompetitiveIntelligence,
  CustomerSuccessIntegrationRequest,
  CustomerSuccessIntegration,
  SelfHealingRequest,
  SelfHealing,
  FederatedLearningRequest,
  FederatedLearning,
} from '@/lib/api/cais-services';

/**
 * Query keys for CAIS services
 */
export const caisServicesKeys = {
  all: ['cais-services'] as const,
  pipelineHealth: (tenantId: string, userId: string) =>
    [...caisServicesKeys.all, 'pipeline-health', tenantId, userId] as const,
  memory: (tenantId: string, contextKey?: string, tier?: string) =>
    [...caisServicesKeys.all, 'memory', tenantId, contextKey, tier] as const,
};

// ============================================
// Phase 1: Core Learning Services
// ============================================

/**
 * Hook to resolve conflict between detection methods
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConflictResolutionRequest) =>
      caisServicesApi.resolveConflict(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisServicesKeys.all });
    },
  });
}

/**
 * Hook to store memory record
 */
export function useStoreMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MemoryStoreRequest) => caisServicesApi.storeMemory(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: caisServicesKeys.memory(variables.tenantId, variables.contextKey, variables.tier),
      });
    },
  });
}

/**
 * Hook to retrieve memory records
 */
export function useRetrieveMemory(params: MemoryRetrieveParams) {
  return useQuery({
    queryKey: caisServicesKeys.memory(params.tenantId, params.contextKey, params.tier),
    queryFn: () => caisServicesApi.retrieveMemory(params),
    enabled: !!params.tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to run adversarial test
 */
export function useRunAdversarialTest() {
  return useMutation({
    mutationFn: (data: AdversarialTestRequest) =>
      caisServicesApi.runAdversarialTest(data),
  });
}

// ============================================
// Phase 2: Signal Intelligence Services
// ============================================

/**
 * Hook to analyze communication
 */
export function useAnalyzeCommunication() {
  return useMutation({
    mutationFn: (data: CommunicationAnalysisRequest) =>
      caisServicesApi.analyzeCommunication(data),
  });
}

/**
 * Hook to analyze calendar patterns
 */
export function useAnalyzeCalendar() {
  return useMutation({
    mutationFn: (data: CalendarAnalysisRequest) =>
      caisServicesApi.analyzeCalendar(data),
  });
}

/**
 * Hook to process social signal
 */
export function useProcessSocialSignal() {
  return useMutation({
    mutationFn: (data: SocialSignalRequest) =>
      caisServicesApi.processSocialSignal(data),
  });
}

/**
 * Hook to track product usage
 */
export function useTrackProductUsage() {
  return useMutation({
    mutationFn: (data: ProductUsageTrackRequest) =>
      caisServicesApi.trackProductUsage(data),
  });
}

// ============================================
// Phase 3: Quality & Monitoring Services
// ============================================

/**
 * Hook to detect anomalies
 */
export function useDetectAnomalies() {
  return useMutation({
    mutationFn: (data: AnomalyDetectionRequest) =>
      caisServicesApi.detectAnomalies(data),
  });
}

/**
 * Hook to assess explanation quality
 */
export function useAssessExplanationQuality() {
  return useMutation({
    mutationFn: (data: ExplanationQualityRequest) =>
      caisServicesApi.assessExplanationQuality(data),
  });
}

/**
 * Hook to track explanation usage
 */
export function useTrackExplanationUsage() {
  return useMutation({
    mutationFn: (data: ExplanationMonitoringRequest) =>
      caisServicesApi.trackExplanationUsage(data),
  });
}

// ============================================
// Phase 4: Collaboration & Forecasting Services
// ============================================

/**
 * Hook to learn team pattern
 */
export function useLearnTeamPattern() {
  return useMutation({
    mutationFn: (data: CollaborativeLearnPatternRequest) =>
      caisServicesApi.learnTeamPattern(data),
  });
}

/**
 * Hook to decompose forecast
 */
export function useDecomposeForecast() {
  return useMutation({
    mutationFn: (data: ForecastDecompositionRequest) =>
      caisServicesApi.decomposeForecast(data),
  });
}

/**
 * Hook to generate consensus forecast
 */
export function useGenerateConsensusForecast() {
  return useMutation({
    mutationFn: (data: ConsensusForecastRequest) =>
      caisServicesApi.generateConsensusForecast(data),
  });
}

/**
 * Hook to analyze forecast commitment
 */
export function useAnalyzeForecastCommitment() {
  return useMutation({
    mutationFn: (data: ForecastCommitmentRequest) =>
      caisServicesApi.analyzeForecastCommitment(data),
  });
}

// ============================================
// Phase 5: Pipeline Services
// ============================================

/**
 * Hook to calculate pipeline health
 */
export function usePipelineHealth(tenantId: string, userId: string) {
  return useQuery({
    queryKey: caisServicesKeys.pipelineHealth(tenantId, userId),
    queryFn: () => caisServicesApi.calculatePipelineHealth(tenantId, userId),
    enabled: !!tenantId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - pipeline health changes relatively slowly
    refetchOnWindowFocus: false,
  });
}

// ============================================
// Phase 6: Execution & Intelligence Services
// ============================================

/**
 * Hook to execute playbook
 */
export function useExecutePlaybook() {
  return useMutation({
    mutationFn: (data: PlaybookExecutionRequest) =>
      caisServicesApi.executePlaybook(data),
  });
}

/**
 * Hook to analyze negotiation
 */
export function useAnalyzeNegotiation() {
  return useMutation({
    mutationFn: (data: NegotiationAnalysisRequest) =>
      caisServicesApi.analyzeNegotiation(data),
  });
}

/**
 * Hook to track relationship evolution
 */
export function useTrackRelationshipEvolution() {
  return useMutation({
    mutationFn: (data: RelationshipTrackRequest) =>
      caisServicesApi.trackRelationshipEvolution(data),
  });
}

/**
 * Hook to analyze competitive intelligence
 */
export function useAnalyzeCompetition() {
  return useMutation({
    mutationFn: (data: CompetitiveAnalysisRequest) =>
      caisServicesApi.analyzeCompetition(data),
  });
}

/**
 * Hook to integrate customer success data
 */
export function useIntegrateCustomerSuccess() {
  return useMutation({
    mutationFn: (data: CustomerSuccessIntegrationRequest) =>
      caisServicesApi.integrateCustomerSuccess(data),
  });
}

// ============================================
// Phase 7: Advanced Services
// ============================================

/**
 * Hook to detect and remediate issues
 */
export function useDetectAndRemediate() {
  return useMutation({
    mutationFn: (data: SelfHealingRequest) =>
      caisServicesApi.detectAndRemediate(data),
  });
}

/**
 * Hook to start federated learning round
 */
export function useStartFederatedLearningRound() {
  return useMutation({
    mutationFn: (data: FederatedLearningRequest) =>
      caisServicesApi.startFederatedLearningRound(data),
  });
}
