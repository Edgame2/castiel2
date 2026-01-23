/**
 * CAIS Services API Client
 * API client for all Compound AI System services (22 services, 23 endpoints)
 */

import apiClient from './client';

// ============================================
// Type Definitions
// ============================================

// Phase 1: Core Learning Services

export interface ConflictResolutionRequest {
  tenantId: string;
  contextKey: string;
  method1: string;
  method2: string;
  conflictType: string;
  conflictDescription?: string;
}

export interface ConflictResolution {
  resolutionId: string;
  strategy: string;
  confidence: number;
  reasoning: string;
}

export interface MemoryStoreRequest {
  tenantId: string;
  tier: 'immediate' | 'session' | 'temporal' | 'relational' | 'global';
  content: any;
  contextKey: string;
  tags?: string[];
}

export interface MemoryRecord {
  recordId: string;
  tenantId: string;
  tier: string;
  content: any;
  contextKey: string;
  tags?: string[];
  createdAt: Date;
}

export interface MemoryRetrieveParams {
  tenantId: string;
  contextKey?: string;
  tier?: string;
  limit?: number;
}

export interface MemoryRetrieveResult {
  records: MemoryRecord[];
  totalCount: number;
}

export interface AdversarialTestRequest {
  tenantId: string;
  testType: 'input_perturbation' | 'stress_test' | 'gaming_detection';
  target: string;
  parameters?: Record<string, any>;
}

export interface AdversarialTestResult {
  testId: string;
  passed: boolean;
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  metrics: Record<string, any>;
}

// Phase 2: Signal Intelligence Services

export interface CommunicationAnalysisRequest {
  tenantId: string;
  communicationType: 'email' | 'meeting' | 'call' | 'message';
  content: string;
  opportunityId?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationAnalysis {
  analysisId: string;
  tenantId: string;
  opportunityId?: string;
  communicationType: string;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative' | 'mixed';
    confidence: number;
    breakdown?: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  tone: {
    professional: number;
    friendly: number;
    urgent: number;
    formal: number;
    casual: number;
  };
  engagement: {
    depth: number;
    responseTime?: number;
    responseRate?: number;
    questionCount?: number;
    actionItemCount?: number;
  };
  language: {
    patterns: string[];
    keywords: string[];
    topics: string[];
    intent?: string;
  };
  insights: {
    summary: string;
    keyFindings: string[];
    recommendations?: string[];
    riskIndicators?: string[];
  };
  createdAt: string;
}

export interface CalendarAnalysisRequest {
  tenantId: string;
  opportunityId: string;
  events: Array<{
    startTime: string | Date;
    endTime: string | Date;
    attendees: string[];
    status: string;
    subject: string;
  }>;
}

export interface CalendarIntelligence {
  intelligenceId: string;
  tenantId: string;
  opportunityId: string;
  patterns: {
    meetingFrequency: number;
    averageAttendees: number;
    cancellationRate: number;
    optimalTiming?: {
      dayOfWeek: string;
      timeOfDay: string;
    };
  };
  insights: {
    summary: string;
    recommendations: string[];
  };
  createdAt: string;
}

export interface SocialSignalRequest {
  tenantId: string;
  source: string;
  signalType: string;
  content: any;
  opportunityId?: string;
}

export interface SocialSignal {
  signalId: string;
  tenantId: string;
  source: string;
  signalType: string;
  content: any;
  opportunityId?: string;
  processedAt: string;
}

export interface ProductUsageTrackRequest {
  tenantId: string;
  accountId: string;
  eventType: string;
  eventData: Record<string, any>;
  opportunityId?: string;
}

export interface ProductUsageIntelligence {
  intelligenceId: string;
  tenantId: string;
  accountId: string;
  patterns: Array<{
    patternType: string;
    pattern: any;
  }>;
  insights: {
    adoptionRate: number;
    featureUsageFrequency: Record<string, number>;
    churnRiskScore: number;
    expansionOpportunityScore: number;
  };
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
  }>;
  createdAt: string;
}

// Phase 3: Quality & Monitoring Services

export interface AnomalyDetectionRequest {
  tenantId: string;
  opportunityId: string;
  data: Record<string, any>;
}

export interface AnomalyDetection {
  detectionId: string;
  tenantId: string;
  opportunityId: string;
  anomalies: Array<{
    field: string;
    value: any;
    expectedRange: {
      min: any;
      max: any;
    };
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overallRisk: number;
  detectedAt: string;
}

export interface ExplanationQualityRequest {
  tenantId: string;
  explanation: any;
  explanationId: string;
}

export interface ExplanationQuality {
  qualityId: string;
  tenantId: string;
  explanationId: string;
  scores: {
    clarity: number;
    completeness: number;
    actionability: number;
    relevance: number;
    trustworthiness: number;
    overall: number;
  };
  style: string;
  createdAt: string;
}

export interface ExplanationMonitoringRequest {
  tenantId: string;
  explanationId: string;
  userId: string;
  action: 'viewed' | 'dismissed' | 'feedback';
  feedback?: any;
}

export interface ExplanationMonitoring {
  trackingId: string;
  tenantId: string;
  explanationId: string;
  userId: string;
  action: string;
  feedback?: any;
  trackedAt: string;
}

// Phase 4: Collaboration & Forecasting Services

export interface CollaborativeLearnPatternRequest {
  tenantId: string;
  teamId: string;
  patternType: string;
  pattern: any;
}

export interface CollaborativeIntelligence {
  insightId: string;
  tenantId: string;
  teamId: string;
  insightType: string;
  content: any;
  aggregation: {
    contributorCount: number;
    consensusScore: number;
    validationScore: number;
  };
  createdAt: string;
}

export interface ForecastDecompositionRequest {
  tenantId: string;
  forecast: any;
}

export interface ForecastDecomposition {
  decompositionId: string;
  tenantId: string;
  forecast: any;
  timeDecomposition: Array<{
    period: string;
    revenue: number;
    confidence: number;
  }>;
  sourceDecomposition: Array<{
    source: string;
    revenue: number;
    confidence: number;
  }>;
  confidenceDecomposition: Array<{
    confidenceLevel: string;
    revenue: number;
  }>;
  driverDecomposition: Array<{
    driver: string;
    impact: number;
    contribution: number;
  }>;
  createdAt: string;
}

export interface ConsensusForecastRequest {
  tenantId: string;
  period: string;
  sources: Array<{
    source: string;
    forecast: number;
    confidence: number;
    timestamp: string | Date;
    metadata?: Record<string, any>;
  }>;
}

export interface ConsensusForecast {
  consensusId: string;
  tenantId: string;
  period: string;
  consensusForecast: number;
  confidence: number;
  contributors: Array<{
    source: string;
    forecast: number;
    weight: number;
    confidence: number;
  }>;
  variance: number;
  agreement: number;
  createdAt: string;
}

export interface ForecastCommitmentRequest {
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
}

export interface ForecastCommitment {
  commitmentId: string;
  tenantId: string;
  period: string;
  userId: string;
  commitmentLevel: 'low' | 'medium' | 'high';
  sandbaggingRisk: number;
  happyEarsRisk: number;
  analysis: {
    historicalAccuracy: number;
    varianceFromHistory: number;
    confidence: number;
  };
  recommendations: string[];
  analyzedAt: string;
}

// Phase 5: Pipeline Services

export interface PipelineHealth {
  healthId: string;
  tenantId: string;
  userId?: string;
  teamId?: string;
  overallScore: number;
  status: 'healthy' | 'at_risk' | 'critical' | 'unknown';
  scoreBreakdown: {
    stage: number;
    velocity: number;
    coverage: number;
    quality: number;
    risk: number;
  };
  stageHealth: Array<{
    stage: string;
    score: number;
    opportunities: number;
    value: number;
    averageAge: number;
    issues: string[];
  }>;
  velocityHealth: {
    averageDaysInStage: Record<string, number>;
    bottlenecks: Array<{
      stage: string;
      averageDays: number;
      threshold: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    score: number;
  };
  coverageHealth: {
    coverageRatio: number;
    monthsCoverage: number;
    score: number;
    recommendations: string[];
  };
  qualityHealth: {
    averageQuality: number;
    highQualityPercentage: number;
    lowQualityPercentage: number;
    score: number;
  };
  riskHealth: {
    averageRisk: number;
    highRiskPercentage: number;
    totalRevenueAtRisk: number;
    score: number;
  };
  recommendations: Array<{
    type: 'stage' | 'velocity' | 'coverage' | 'quality' | 'risk';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  calculatedAt: string;
}

// Phase 6: Execution & Intelligence Services

export interface PlaybookExecutionRequest {
  tenantId: string;
  playbookId: string;
  context: Record<string, any>;
}

export interface PlaybookExecution {
  executionId: string;
  tenantId: string;
  playbookId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  steps: Array<{
    stepId: string;
    status: string;
    executedAt?: string;
    result?: {
      success: boolean;
      error?: string;
      data?: any;
    };
  }>;
  context: Record<string, any>;
  startedAt: string;
  completedAt?: string;
}

export interface NegotiationAnalysisRequest {
  tenantId: string;
  opportunityId: string;
  negotiationData: any;
}

export interface NegotiationIntelligence {
  intelligenceId: string;
  tenantId: string;
  opportunityId: string;
  strategy: {
    recommended: string;
    alternatives: string[];
    reasoning: string;
  };
  analysis: {
    winProbability: number;
    riskFactors: string[];
    opportunities: string[];
  };
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }>;
  createdAt: string;
}

export interface RelationshipTrackRequest {
  tenantId: string;
  sourceShardId: string;
  targetShardId: string;
  relationshipType: string;
}

export interface RelationshipEvolution {
  evolutionId: string;
  tenantId: string;
  sourceShardId: string;
  targetShardId: string;
  relationshipType: string;
  health: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    factors: string[];
  };
  evolution: {
    changes: Array<{
      timestamp: string;
      change: string;
      impact: number;
    }>;
    patterns: string[];
  };
  trackedAt: string;
}

export interface CompetitiveAnalysisRequest {
  tenantId: string;
  opportunityId: string;
  competitorData: any;
}

export interface CompetitiveIntelligence {
  intelligenceId: string;
  tenantId: string;
  opportunityId: string;
  threats: Array<{
    competitor: string;
    threatLevel: 'low' | 'medium' | 'high';
    description: string;
    evidence: string[];
  }>;
  positioning: {
    ourPosition: string;
    marketPosition: string;
    differentiators: string[];
  };
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
  analyzedAt: string;
}

export interface CustomerSuccessIntegrationRequest {
  tenantId: string;
  accountId: string;
  csData: any;
}

export interface CustomerSuccessIntegration {
  integrationId: string;
  tenantId: string;
  accountId: string;
  alignment: {
    level: 'aligned' | 'misaligned' | 'unknown';
    score: number;
    factors: string[];
  };
  health: {
    overall: number;
    salesActivity: 'high' | 'medium' | 'low';
    csActivity: 'high' | 'medium' | 'low';
  };
  insights: {
    summary: string;
    recommendations: string[];
  };
  integratedAt: string;
}

// Phase 7: Advanced Services

export interface SelfHealingRequest {
  tenantId: string;
  issueType: string;
  issueData: any;
}

export interface SelfHealing {
  remediationId: string;
  tenantId: string;
  issueType: string;
  detected: boolean;
  remediated: boolean;
  actions: Array<{
    action: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
  }>;
  detectedAt: string;
  remediatedAt?: string;
}

export interface FederatedLearningRequest {
  tenantId: string;
  modelType: string;
  roundConfig: any;
}

export interface FederatedLearning {
  roundId: string;
  tenantId: string;
  modelType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  contributors: number;
  aggregated: boolean;
  startedAt: string;
  completedAt?: string;
}

// ============================================
// API Client
// ============================================

/**
 * CAIS Services API endpoints
 */
export const caisServicesApi = {
  // ============================================
  // Phase 1: Core Learning Services
  // ============================================

  /**
   * Resolve conflict between detection methods
   */
  resolveConflict: async (
    data: ConflictResolutionRequest
  ): Promise<ConflictResolution> => {
    const response = await apiClient.post<ConflictResolution>(
      '/api/v1/cais/conflict-resolution/resolve',
      data
    );
    return response.data;
  },

  /**
   * Store memory record
   */
  storeMemory: async (data: MemoryStoreRequest): Promise<MemoryRecord> => {
    const response = await apiClient.post<MemoryRecord>(
      '/api/v1/cais/memory/store',
      data
    );
    return response.data;
  },

  /**
   * Retrieve memory records
   */
  retrieveMemory: async (
    params: MemoryRetrieveParams
  ): Promise<MemoryRetrieveResult> => {
    const { tenantId, ...queryParams } = params;
    const response = await apiClient.get<MemoryRetrieveResult>(
      `/api/v1/cais/memory/retrieve/${tenantId}`,
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Run adversarial test
   */
  runAdversarialTest: async (
    data: AdversarialTestRequest
  ): Promise<AdversarialTestResult> => {
    const response = await apiClient.post<AdversarialTestResult>(
      '/api/v1/cais/adversarial/test',
      data
    );
    return response.data;
  },

  // ============================================
  // Phase 2: Signal Intelligence Services
  // ============================================

  /**
   * Analyze communication
   */
  analyzeCommunication: async (
    data: CommunicationAnalysisRequest
  ): Promise<CommunicationAnalysis> => {
    const response = await apiClient.post<CommunicationAnalysis>(
      '/api/v1/cais/communication/analyze',
      data
    );
    return response.data;
  },

  /**
   * Analyze calendar patterns
   */
  analyzeCalendar: async (
    data: CalendarAnalysisRequest
  ): Promise<CalendarIntelligence> => {
    const response = await apiClient.post<CalendarIntelligence>(
      '/api/v1/cais/calendar/analyze',
      data
    );
    return response.data;
  },

  /**
   * Process social signal
   */
  processSocialSignal: async (
    data: SocialSignalRequest
  ): Promise<SocialSignal> => {
    const response = await apiClient.post<SocialSignal>(
      '/api/v1/cais/social-signals/process',
      data
    );
    return response.data;
  },

  /**
   * Track product usage event
   */
  trackProductUsage: async (
    data: ProductUsageTrackRequest
  ): Promise<ProductUsageIntelligence> => {
    const response = await apiClient.post<ProductUsageIntelligence>(
      '/api/v1/cais/product-usage/track',
      data
    );
    return response.data;
  },

  // ============================================
  // Phase 3: Quality & Monitoring Services
  // ============================================

  /**
   * Detect anomalies
   */
  detectAnomalies: async (
    data: AnomalyDetectionRequest
  ): Promise<AnomalyDetection> => {
    const response = await apiClient.post<AnomalyDetection>(
      '/api/v1/cais/anomaly/detect',
      data
    );
    return response.data;
  },

  /**
   * Assess explanation quality
   */
  assessExplanationQuality: async (
    data: ExplanationQualityRequest
  ): Promise<ExplanationQuality> => {
    const response = await apiClient.post<ExplanationQuality>(
      '/api/v1/cais/explanation-quality/assess',
      data
    );
    return response.data;
  },

  /**
   * Track explanation usage
   */
  trackExplanationUsage: async (
    data: ExplanationMonitoringRequest
  ): Promise<ExplanationMonitoring> => {
    const response = await apiClient.post<ExplanationMonitoring>(
      '/api/v1/cais/explanation-monitoring/track',
      data
    );
    return response.data;
  },

  // ============================================
  // Phase 4: Collaboration & Forecasting Services
  // ============================================

  /**
   * Learn team pattern
   */
  learnTeamPattern: async (
    data: CollaborativeLearnPatternRequest
  ): Promise<CollaborativeIntelligence> => {
    const response = await apiClient.post<CollaborativeIntelligence>(
      '/api/v1/cais/collaborative/learn-pattern',
      data
    );
    return response.data;
  },

  /**
   * Decompose forecast
   */
  decomposeForecast: async (
    data: ForecastDecompositionRequest
  ): Promise<ForecastDecomposition> => {
    const response = await apiClient.post<ForecastDecomposition>(
      '/api/v1/cais/forecast/decompose',
      data
    );
    return response.data;
  },

  /**
   * Generate consensus forecast
   */
  generateConsensusForecast: async (
    data: ConsensusForecastRequest
  ): Promise<ConsensusForecast> => {
    const response = await apiClient.post<ConsensusForecast>(
      '/api/v1/cais/forecast/consensus',
      data
    );
    return response.data;
  },

  /**
   * Analyze forecast commitment
   */
  analyzeForecastCommitment: async (
    data: ForecastCommitmentRequest
  ): Promise<ForecastCommitment> => {
    const response = await apiClient.post<ForecastCommitment>(
      '/api/v1/cais/forecast/commitment/analyze',
      data
    );
    return response.data;
  },

  // ============================================
  // Phase 5: Pipeline Services
  // ============================================

  /**
   * Calculate pipeline health
   */
  calculatePipelineHealth: async (
    tenantId: string,
    userId: string
  ): Promise<PipelineHealth> => {
    const response = await apiClient.get<PipelineHealth>(
      `/api/v1/cais/pipeline-health/${tenantId}/${userId}`
    );
    return response.data;
  },

  // ============================================
  // Phase 6: Execution & Intelligence Services
  // ============================================

  /**
   * Execute playbook
   */
  executePlaybook: async (
    data: PlaybookExecutionRequest
  ): Promise<PlaybookExecution> => {
    const response = await apiClient.post<PlaybookExecution>(
      '/api/v1/cais/playbook/execute',
      data
    );
    return response.data;
  },

  /**
   * Analyze negotiation
   */
  analyzeNegotiation: async (
    data: NegotiationAnalysisRequest
  ): Promise<NegotiationIntelligence> => {
    const response = await apiClient.post<NegotiationIntelligence>(
      '/api/v1/cais/negotiation/analyze',
      data
    );
    return response.data;
  },

  /**
   * Track relationship evolution
   */
  trackRelationshipEvolution: async (
    data: RelationshipTrackRequest
  ): Promise<RelationshipEvolution> => {
    const response = await apiClient.post<RelationshipEvolution>(
      '/api/v1/cais/relationship/track',
      data
    );
    return response.data;
  },

  /**
   * Analyze competitive intelligence
   */
  analyzeCompetition: async (
    data: CompetitiveAnalysisRequest
  ): Promise<CompetitiveIntelligence> => {
    const response = await apiClient.post<CompetitiveIntelligence>(
      '/api/v1/cais/competitive/analyze',
      data
    );
    return response.data;
  },

  /**
   * Integrate customer success data
   */
  integrateCustomerSuccess: async (
    data: CustomerSuccessIntegrationRequest
  ): Promise<CustomerSuccessIntegration> => {
    const response = await apiClient.post<CustomerSuccessIntegration>(
      '/api/v1/cais/customer-success/integrate',
      data
    );
    return response.data;
  },

  // ============================================
  // Phase 7: Advanced Services
  // ============================================

  /**
   * Detect and remediate issues
   */
  detectAndRemediate: async (
    data: SelfHealingRequest
  ): Promise<SelfHealing> => {
    const response = await apiClient.post<SelfHealing>(
      '/api/v1/cais/self-healing/detect-and-remediate',
      data
    );
    return response.data;
  },

  /**
   * Start federated learning round
   */
  startFederatedLearningRound: async (
    data: FederatedLearningRequest
  ): Promise<FederatedLearning> => {
    const response = await apiClient.post<FederatedLearning>(
      '/api/v1/cais/federated-learning/start-round',
      data
    );
    return response.data;
  },
};

/**
 * Alias for backward compatibility with existing components
 */
export const caisApi = caisServicesApi;
