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
    overallScore: number;
    scoreBreakdown: {
        timeline: number;
        budget: number;
        milestones: number;
        activity: number;
        risk: number;
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
    impact: number;
    recommendation?: string;
}
export interface PredictiveCompletion {
    projectId: string;
    tenantId: string;
    predictedCompletionDate: Date;
    confidence: number;
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
    weight: number;
    value: number;
    description: string;
    trend?: 'improving' | 'stable' | 'declining';
}
export interface CompletionScenario {
    name: string;
    completionDate: Date;
    probability: number;
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
        completionDateImprovement: number;
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
    currentLoad: number;
    recommendedLoad: number;
    utilization: number;
    skills?: string[];
}
export interface BudgetAllocation {
    allocated: number;
    spent: number;
    remaining: number;
    utilization: number;
    forecasted: number;
    variance: number;
}
export interface TimelineAllocation {
    startDate: Date;
    targetDate: Date;
    predictedDate: Date;
    buffer: number;
    criticalPath?: string[];
}
export interface OptimizationRecommendation {
    type: 'team' | 'budget' | 'timeline' | 'priority' | 'scope' | 'process';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: {
        healthScore?: number;
        completionDate?: number;
        cost?: number;
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
//# sourceMappingURL=project-analytics.types.d.ts.map