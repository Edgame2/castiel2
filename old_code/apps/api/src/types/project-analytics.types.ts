/**
 * Project Analytics Types
 * 
 * Types for advanced project analytics including:
 * - Health scoring
 * - Predictive completion
 * - Resource optimization
 */

export interface ProjectHealthScore {
  projectId: string;
  tenantId: string;
  overallScore: number; // 0-100
  scoreBreakdown: {
    timeline: number; // 0-100, based on progress vs target date
    budget: number; // 0-100, based on budget utilization
    milestones: number; // 0-100, based on milestone completion
    activity: number; // 0-100, based on recent activity
    risk: number; // 0-100, higher is better (lower risk)
  };
  status: 'healthy' | 'at_risk' | 'critical' | 'unknown';
  factors: HealthFactor[];
  calculatedAt: Date;
  trend?: 'improving' | 'stable' | 'declining';
  previousScore?: number;
}

export interface HealthFactor {
  type: 'timeline' | 'budget' | 'milestone' | 'activity' | 'risk' | 'team' | 'scope';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // Impact on overall score (-100 to +100)
  recommendation?: string;
}

export interface PredictiveCompletion {
  projectId: string;
  tenantId: string;
  predictedCompletionDate: Date;
  confidence: number; // 0-1
  confidenceRange: {
    earliest: Date;
    latest: Date;
  };
  factors: CompletionFactor[];
  scenarios: CompletionScenario[];
  calculatedAt: Date;
}

export interface CompletionFactor {
  type: 'velocity' | 'remaining_work' | 'team_capacity' | 'historical' | 'dependencies';
  weight: number; // 0-1, importance in prediction
  value: number;
  description: string;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface CompletionScenario {
  name: string; // e.g., 'optimistic', 'realistic', 'pessimistic'
  completionDate: Date;
  probability: number; // 0-1
  assumptions: string[];
}

export interface ResourceOptimization {
  projectId: string;
  tenantId: string;
  recommendations: OptimizationRecommendation[];
  currentState: ResourceState;
  optimizedState: ResourceState;
  potentialImprovement: {
    healthScoreIncrease: number;
    completionDateImprovement: number; // days
    costSavings?: number;
  };
  calculatedAt: Date;
}

export interface ResourceState {
  teamAllocation: TeamAllocation[];
  budgetAllocation: BudgetAllocation;
  timeline: TimelineAllocation;
  priority: string;
}

export interface TeamAllocation {
  userId: string;
  name: string;
  role: string;
  currentLoad: number; // 0-100, percentage of capacity
  recommendedLoad: number; // 0-100
  utilization: number; // 0-100, how effectively they're being used
  skills?: string[];
}

export interface BudgetAllocation {
  allocated: number;
  spent: number;
  remaining: number;
  utilization: number; // 0-100
  forecasted: number; // Predicted total spend
  variance: number; // Difference from allocated
}

export interface TimelineAllocation {
  startDate: Date;
  targetDate: Date;
  predictedDate: Date;
  buffer: number; // days
  criticalPath?: string[];
}

export interface OptimizationRecommendation {
  type: 'team' | 'budget' | 'timeline' | 'priority' | 'scope' | 'process';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    healthScore?: number; // Expected improvement
    completionDate?: number; // Days improvement
    cost?: number; // Cost impact
  };
  effort: 'low' | 'medium' | 'high';
  feasibility: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export interface ProjectAnalyticsRequest {
  projectId: string;
  tenantId: string;
  includeHistory?: boolean;
  includePredictions?: boolean;
  includeOptimization?: boolean;
}

export interface ProjectAnalyticsResponse {
  projectId: string;
  tenantId: string;
  healthScore?: ProjectHealthScore;
  predictiveCompletion?: PredictiveCompletion;
  resourceOptimization?: ResourceOptimization;
  generatedAt: Date;
}










