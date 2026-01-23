/**
 * Project Analytics Service
 *
 * Advanced analytics for projects including:
 * - Health scoring
 * - Predictive completion
 * - Resource optimization
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard } from '../types/shard.types.js';
import type { ProjectHealthScore, PredictiveCompletion, ResourceOptimization, ProjectAnalyticsRequest, ProjectAnalyticsResponse } from '../types/project-analytics.types.js';
export declare class ProjectAnalyticsService {
    private readonly shardRepository;
    private readonly monitoring;
    constructor(shardRepository: ShardRepository, monitoring: IMonitoringProvider);
    /**
     * Get project shard by ID (helper method for controllers)
     */
    getProject(projectId: string, tenantId: string): Promise<Shard>;
    /**
     * Get comprehensive analytics for a project
     */
    getProjectAnalytics(request: ProjectAnalyticsRequest): Promise<ProjectAnalyticsResponse>;
    /**
     * Calculate health score for a project
     */
    calculateHealthScore(project: Shard): Promise<ProjectHealthScore>;
    /**
     * Calculate predictive completion date
     */
    calculatePredictiveCompletion(project: Shard): Promise<PredictiveCompletion>;
    /**
     * Calculate resource optimization recommendations
     */
    calculateResourceOptimization(project: Shard): Promise<ResourceOptimization>;
    private calculateTimelineScore;
    private calculateBudgetScore;
    private calculateMilestoneScore;
    private calculateActivityScore;
    private calculateRiskScore;
    private calculateVelocity;
    private calculateRemainingWork;
    private calculateTeamCapacity;
    private calculateHistoricalFactor;
    private calculateConfidence;
    private generateScenarios;
    private analyzeCurrentState;
    private generateTeamRecommendations;
    private generateBudgetRecommendations;
    private generateTimelineRecommendations;
    private generatePriorityRecommendations;
    private calculateOptimizedState;
    private calculatePotentialImprovement;
}
//# sourceMappingURL=project-analytics.service.d.ts.map