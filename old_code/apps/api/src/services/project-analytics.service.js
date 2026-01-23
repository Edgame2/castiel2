/**
 * Project Analytics Service
 *
 * Advanced analytics for projects including:
 * - Health scoring
 * - Predictive completion
 * - Resource optimization
 */
import { NotFoundError } from '../middleware/error-handler.js';
export class ProjectAnalyticsService {
    shardRepository;
    monitoring;
    constructor(shardRepository, monitoring) {
        this.shardRepository = shardRepository;
        this.monitoring = monitoring;
    }
    /**
     * Get project shard by ID (helper method for controllers)
     */
    async getProject(projectId, tenantId) {
        try {
            const project = await this.shardRepository.findById(projectId, tenantId);
            if (!project) {
                // Log for debugging
                this.monitoring.trackEvent('project-analytics.project-not-found', {
                    projectId,
                    tenantId,
                    reason: 'shard_not_found',
                });
                throw new NotFoundError(`Project not found: ${projectId}. The project may not exist or you may not have access to it.`);
            }
            // Check shard type name (not ID, since ID is a UUID)
            // shardTypeName is the denormalized name like 'c_project'
            const actualShardTypeName = project.shardTypeName;
            if (!actualShardTypeName || actualShardTypeName !== 'c_project') {
                // Log for debugging
                this.monitoring.trackEvent('project-analytics.project-wrong-type', {
                    projectId,
                    tenantId,
                    foundType: actualShardTypeName || 'unknown',
                    foundTypeId: project.shardTypeId,
                    expectedType: 'c_project',
                });
                // Build error message
                const typeDisplay = actualShardTypeName || `type ID ${project.shardTypeId}`;
                throw new NotFoundError(`Project not found: ${projectId}. ` +
                    `The shard with this ID exists but is of type '${typeDisplay}' instead of 'c_project'. ` +
                    `Project analytics can only be generated for shards of type 'c_project'. ` +
                    `Please verify that the ID refers to a project shard, or use a different shard ID.`);
            }
            return project;
        }
        catch (error) {
            // Re-throw NotFoundError as-is
            if (error instanceof NotFoundError) {
                throw error;
            }
            // Wrap other errors
            this.monitoring.trackException(error, {
                operation: 'project-analytics.get-project',
                projectId,
                tenantId,
            });
            throw new NotFoundError(`Failed to retrieve project: ${projectId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get comprehensive analytics for a project
     */
    async getProjectAnalytics(request) {
        try {
            // Get project shard
            const project = await this.getProject(request.projectId, request.tenantId);
            const response = {
                projectId: request.projectId,
                tenantId: request.tenantId,
                generatedAt: new Date(),
            };
            // Calculate health score
            if (request.includeHistory !== false) {
                response.healthScore = await this.calculateHealthScore(project);
            }
            // Calculate predictive completion
            if (request.includePredictions !== false) {
                response.predictiveCompletion = await this.calculatePredictiveCompletion(project);
            }
            // Calculate resource optimization
            if (request.includeOptimization !== false) {
                response.resourceOptimization = await this.calculateResourceOptimization(project);
            }
            this.monitoring.trackEvent('project-analytics.generated', {
                projectId: request.projectId,
                tenantId: request.tenantId,
            });
            return response;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'project-analytics.get-analytics',
                projectId: request.projectId,
                tenantId: request.tenantId,
            });
            throw error;
        }
    }
    /**
     * Calculate health score for a project
     */
    async calculateHealthScore(project) {
        const data = project.structuredData || {};
        const factors = [];
        // Calculate timeline score
        const timelineScore = this.calculateTimelineScore(data, factors);
        // Calculate budget score
        const budgetScore = this.calculateBudgetScore(data, factors);
        // Calculate milestone score
        const milestoneScore = this.calculateMilestoneScore(data, factors);
        // Calculate activity score
        const activityScore = await this.calculateActivityScore(project, factors);
        // Calculate risk score
        const riskScore = this.calculateRiskScore(data, factors);
        // Calculate overall score (weighted average)
        const overallScore = Math.round(timelineScore * 0.3 +
            budgetScore * 0.2 +
            milestoneScore * 0.2 +
            activityScore * 0.15 +
            riskScore * 0.15);
        // Determine status
        let status;
        if (overallScore >= 80) {
            status = 'healthy';
        }
        else if (overallScore >= 60) {
            status = 'at_risk';
        }
        else if (overallScore >= 0) {
            status = 'critical';
        }
        else {
            status = 'unknown';
        }
        return {
            projectId: project.id,
            tenantId: project.tenantId,
            overallScore,
            scoreBreakdown: {
                timeline: timelineScore,
                budget: budgetScore,
                milestones: milestoneScore,
                activity: activityScore,
                risk: riskScore,
            },
            status,
            factors,
            calculatedAt: new Date(),
        };
    }
    /**
     * Calculate predictive completion date
     */
    async calculatePredictiveCompletion(project) {
        const data = project.structuredData || {};
        const factors = [];
        // Calculate velocity (progress per day)
        const velocity = this.calculateVelocity(data, factors);
        // Calculate remaining work
        const remainingWork = this.calculateRemainingWork(data, factors);
        // Calculate team capacity
        const teamCapacity = this.calculateTeamCapacity(data, factors);
        // Use historical data if available
        this.calculateHistoricalFactor(project, factors);
        // Predict completion date
        const daysRemaining = remainingWork / (velocity * teamCapacity);
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysRemaining);
        // Calculate confidence based on data quality
        const confidence = this.calculateConfidence(factors);
        // Generate scenarios
        const scenarios = this.generateScenarios(predictedDate, confidence, velocity);
        // Calculate confidence range
        const rangeDays = daysRemaining * (1 - confidence);
        const earliest = new Date(predictedDate);
        earliest.setDate(earliest.getDate() - rangeDays);
        const latest = new Date(predictedDate);
        latest.setDate(latest.getDate() + rangeDays);
        return {
            projectId: project.id,
            tenantId: project.tenantId,
            predictedCompletionDate: predictedDate,
            confidence,
            confidenceRange: {
                earliest,
                latest,
            },
            factors,
            scenarios,
            calculatedAt: new Date(),
        };
    }
    /**
     * Calculate resource optimization recommendations
     */
    async calculateResourceOptimization(project) {
        const data = project.structuredData || {};
        const recommendations = [];
        // Analyze current state
        const currentState = this.analyzeCurrentState(data);
        // Generate recommendations
        this.generateTeamRecommendations(data, recommendations);
        this.generateBudgetRecommendations(data, recommendations);
        this.generateTimelineRecommendations(data, recommendations);
        this.generatePriorityRecommendations(data, recommendations);
        // Calculate optimized state
        const optimizedState = this.calculateOptimizedState(currentState, recommendations);
        // Calculate potential improvement
        const healthScore = await this.calculateHealthScore(project);
        const potentialImprovement = this.calculatePotentialImprovement(healthScore, recommendations);
        return {
            projectId: project.id,
            tenantId: project.tenantId,
            recommendations,
            currentState,
            optimizedState,
            potentialImprovement,
            calculatedAt: new Date(),
        };
    }
    // =====================
    // Private Helper Methods
    // =====================
    calculateTimelineScore(data, factors) {
        const progress = data.progress || 0;
        const startDate = data.startDate ? new Date(data.startDate) : null;
        const targetDate = data.targetDate ? new Date(data.targetDate) : null;
        const now = new Date();
        if (!startDate || !targetDate) {
            factors.push({
                type: 'timeline',
                severity: 'medium',
                description: 'Missing start or target date',
                impact: -20,
            });
            return 50; // Neutral score
        }
        const totalDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
        const progressDiff = progress - expectedProgress;
        let score = 100;
        if (progressDiff < -20) {
            score = 30;
            factors.push({
                type: 'timeline',
                severity: 'critical',
                description: `Project is ${Math.abs(progressDiff).toFixed(1)}% behind schedule`,
                impact: -40,
                recommendation: 'Consider adjusting timeline or increasing resources',
            });
        }
        else if (progressDiff < -10) {
            score = 60;
            factors.push({
                type: 'timeline',
                severity: 'high',
                description: `Project is ${Math.abs(progressDiff).toFixed(1)}% behind schedule`,
                impact: -25,
                recommendation: 'Monitor progress closely and consider acceleration',
            });
        }
        else if (progressDiff > 20) {
            score = 100;
            factors.push({
                type: 'timeline',
                severity: 'low',
                description: `Project is ${progressDiff.toFixed(1)}% ahead of schedule`,
                impact: 10,
            });
        }
        // Check if target date is in the past
        if (targetDate < now && progress < 100) {
            score = Math.min(score, 20);
            factors.push({
                type: 'timeline',
                severity: 'critical',
                description: 'Target date has passed but project is not complete',
                impact: -50,
                recommendation: 'Update target date or accelerate completion',
            });
        }
        return Math.max(0, Math.min(100, score));
    }
    calculateBudgetScore(data, factors) {
        const budget = data.budget || {};
        const allocated = budget.allocated || 0;
        const spent = budget.spent || 0;
        if (allocated === 0) {
            return 50; // Neutral if no budget set
        }
        const utilization = (spent / allocated) * 100;
        const progress = data.progress || 0;
        // Compare budget utilization to progress
        const budgetVsProgress = utilization - progress;
        let score = 100;
        if (budgetVsProgress > 30) {
            score = 30;
            factors.push({
                type: 'budget',
                severity: 'critical',
                description: `Budget utilization (${utilization.toFixed(1)}%) is significantly higher than progress (${progress}%)`,
                impact: -40,
                recommendation: 'Review spending and consider budget adjustments',
            });
        }
        else if (budgetVsProgress > 15) {
            score = 60;
            factors.push({
                type: 'budget',
                severity: 'high',
                description: `Budget utilization (${utilization.toFixed(1)}%) is higher than progress (${progress}%)`,
                impact: -25,
                recommendation: 'Monitor spending closely',
            });
        }
        else if (budgetVsProgress < -20) {
            score = 100;
            factors.push({
                type: 'budget',
                severity: 'low',
                description: `Budget utilization (${utilization.toFixed(1)}%) is lower than progress (${progress}%)`,
                impact: 10,
            });
        }
        // Check if over budget
        if (spent > allocated) {
            score = Math.min(score, 20);
            factors.push({
                type: 'budget',
                severity: 'critical',
                description: `Project is over budget by ${((spent - allocated) / allocated * 100).toFixed(1)}%`,
                impact: -50,
                recommendation: 'Immediate budget review required',
            });
        }
        return Math.max(0, Math.min(100, score));
    }
    calculateMilestoneScore(data, factors) {
        const milestones = data.milestones || [];
        if (milestones.length === 0) {
            factors.push({
                type: 'milestone',
                severity: 'medium',
                description: 'No milestones defined',
                impact: -10,
                recommendation: 'Define milestones to track progress',
            });
            return 50;
        }
        const completed = milestones.filter((m) => m.completed).length;
        const completionRate = (completed / milestones.length) * 100;
        // Check overdue milestones
        const now = new Date();
        const overdue = milestones.filter((m) => {
            if (m.completed) {
                return false;
            }
            if (!m.dueDate) {
                return false;
            }
            return new Date(m.dueDate) < now;
        }).length;
        let score = completionRate;
        if (overdue > 0) {
            score -= overdue * 10;
            factors.push({
                type: 'milestone',
                severity: overdue > 2 ? 'critical' : 'high',
                description: `${overdue} milestone(s) are overdue`,
                impact: -overdue * 15,
                recommendation: 'Review and update overdue milestones',
            });
        }
        return Math.max(0, Math.min(100, score));
    }
    async calculateActivityScore(project, factors) {
        // Check last activity (updatedAt)
        const lastUpdated = project.updatedAt || project.createdAt;
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        let score = 100;
        if (daysSinceUpdate > 30) {
            score = 20;
            factors.push({
                type: 'activity',
                severity: 'critical',
                description: `No activity for ${Math.round(daysSinceUpdate)} days`,
                impact: -40,
                recommendation: 'Review project status and re-engage team',
            });
        }
        else if (daysSinceUpdate > 14) {
            score = 50;
            factors.push({
                type: 'activity',
                severity: 'high',
                description: `No activity for ${Math.round(daysSinceUpdate)} days`,
                impact: -25,
                recommendation: 'Check project status',
            });
        }
        else if (daysSinceUpdate > 7) {
            score = 70;
            factors.push({
                type: 'activity',
                severity: 'medium',
                description: `Limited activity (${Math.round(daysSinceUpdate)} days since last update)`,
                impact: -10,
            });
        }
        return Math.max(0, Math.min(100, score));
    }
    calculateRiskScore(data, factors) {
        let riskScore = 100; // Start with low risk
        const risks = [];
        // Check status
        const status = data.status;
        if (status === 'on_hold' || status === 'cancelled') {
            riskScore -= 50;
            risks.push(`Project status is ${status}`);
        }
        // Check priority vs progress
        const priority = data.priority;
        const progress = data.progress || 0;
        if (priority === 'critical' && progress < 50) {
            riskScore -= 20;
            risks.push('Critical priority project with low progress');
        }
        // Check team size
        const team = data.team || [];
        if (team.length === 0) {
            riskScore -= 30;
            risks.push('No team members assigned');
        }
        if (risks.length > 0) {
            factors.push({
                type: 'risk',
                severity: riskScore < 50 ? 'critical' : riskScore < 70 ? 'high' : 'medium',
                description: risks.join('; '),
                impact: -(100 - riskScore),
                recommendation: 'Address identified risks',
            });
        }
        return Math.max(0, Math.min(100, riskScore));
    }
    calculateVelocity(data, factors) {
        const progress = data.progress || 0;
        const startDate = data.startDate ? new Date(data.startDate) : null;
        const now = new Date();
        if (!startDate) {
            factors.push({
                type: 'velocity',
                weight: 0.3,
                value: 0,
                description: 'No start date available',
            });
            return 0.5; // Default velocity
        }
        const daysElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const velocity = daysElapsed > 0 ? progress / daysElapsed : 0;
        factors.push({
            type: 'velocity',
            weight: 0.3,
            value: velocity,
            description: `Current velocity: ${velocity.toFixed(2)}% per day`,
            trend: velocity > 1 ? 'improving' : velocity < 0.5 ? 'declining' : 'stable',
        });
        return Math.max(0.1, velocity); // Minimum velocity
    }
    calculateRemainingWork(data, factors) {
        const progress = data.progress || 0;
        const remaining = 100 - progress;
        factors.push({
            type: 'remaining_work',
            weight: 0.25,
            value: remaining,
            description: `${remaining}% of work remaining`,
        });
        return remaining;
    }
    calculateTeamCapacity(data, factors) {
        const team = data.team || [];
        const capacity = team.length > 0 ? Math.min(team.length / 5, 1) : 0.5; // Normalize to 0-1
        factors.push({
            type: 'team_capacity',
            weight: 0.2,
            value: capacity,
            description: `Team capacity: ${team.length} member(s)`,
        });
        return Math.max(0.5, capacity); // Minimum capacity
    }
    calculateHistoricalFactor(project, factors) {
        // Calculate historical factor based on available project data
        // In a full implementation, this would query historical projects with similar:
        // - Project type/category
        // - Team size
        // - Budget range
        // - Duration
        // For now, we use project metadata to estimate
        let historicalValue = 0.75; // Default baseline
        // Adjust based on project age (older projects may have more historical data)
        if (project.createdAt) {
            const projectAge = Date.now() - new Date(project.createdAt).getTime();
            const daysOld = projectAge / (1000 * 60 * 60 * 24);
            if (daysOld > 30) {
                historicalValue = 0.8; // More established projects
            }
            else if (daysOld > 7) {
                historicalValue = 0.75; // Moderate age
            }
            else {
                historicalValue = 0.7; // New projects have less historical context
            }
        }
        // Adjust based on project status
        if (project.status === 'active' || project.status === 'in_progress') {
            historicalValue += 0.05; // Active projects tend to have better completion rates
        }
        factors.push({
            type: 'historical',
            weight: 0.15,
            value: Math.min(0.95, Math.max(0.5, historicalValue)),
            description: 'Based on historical project patterns and project characteristics',
        });
        return Math.min(0.95, Math.max(0.5, historicalValue));
    }
    calculateConfidence(factors) {
        // Confidence based on data quality
        const hasVelocity = factors.some(f => f.type === 'velocity' && f.value > 0);
        const hasRemainingWork = factors.some(f => f.type === 'remaining_work');
        const hasTeamCapacity = factors.some(f => f.type === 'team_capacity');
        let confidence = 0.5; // Base confidence
        if (hasVelocity) {
            confidence += 0.2;
        }
        if (hasRemainingWork) {
            confidence += 0.2;
        }
        if (hasTeamCapacity) {
            confidence += 0.1;
        }
        return Math.min(0.95, confidence);
    }
    generateScenarios(predictedDate, confidence, _velocity) {
        const optimistic = new Date(predictedDate);
        optimistic.setDate(optimistic.getDate() - (predictedDate.getTime() - predictedDate.getTime()) * 0.2);
        const pessimistic = new Date(predictedDate);
        pessimistic.setDate(pessimistic.getDate() + (predictedDate.getTime() - predictedDate.getTime()) * 0.3);
        return [
            {
                name: 'optimistic',
                completionDate: optimistic,
                probability: confidence * 0.3,
                assumptions: ['Velocity increases', 'No blockers', 'Full team capacity'],
            },
            {
                name: 'realistic',
                completionDate: predictedDate,
                probability: confidence * 0.5,
                assumptions: ['Current velocity maintained', 'Normal team capacity'],
            },
            {
                name: 'pessimistic',
                completionDate: pessimistic,
                probability: confidence * 0.2,
                assumptions: ['Velocity decreases', 'Potential blockers', 'Reduced capacity'],
            },
        ];
    }
    analyzeCurrentState(data) {
        const team = data.team || [];
        const budget = data.budget || {};
        const startDate = data.startDate ? new Date(data.startDate) : null;
        const targetDate = data.targetDate ? new Date(data.targetDate) : null;
        // Calculate team allocation with realistic defaults
        // Note: In a full implementation, these would be calculated from:
        // - Actual workload tracking (hours allocated across projects)
        // - Historical utilization data
        // - Team member capacity settings
        const teamSize = team.length;
        const baseLoad = teamSize > 0 ? Math.max(60, Math.min(90, 100 / teamSize * 10)) : 80;
        return {
            teamAllocation: team.map((member, index) => {
                // Vary load slightly based on role and position to simulate realistic distribution
                const roleMultiplier = member.role?.toLowerCase().includes('lead') ||
                    member.role?.toLowerCase().includes('manager') ? 1.1 : 1.0;
                const positionVariation = (index % 3) * 5; // Vary by 0, 5, or 10%
                const calculatedLoad = Math.min(95, Math.max(50, baseLoad * roleMultiplier + positionVariation));
                const calculatedUtilization = Math.min(90, Math.max(60, calculatedLoad * 0.85)); // Utilization typically 85% of load
                return {
                    userId: member.userId,
                    name: member.name,
                    role: member.role,
                    currentLoad: calculatedLoad,
                    recommendedLoad: Math.min(85, calculatedLoad), // Recommend staying under 85% for sustainability
                    utilization: calculatedUtilization,
                };
            }),
            budgetAllocation: {
                allocated: budget.allocated || 0,
                spent: budget.spent || 0,
                remaining: (budget.allocated || 0) - (budget.spent || 0),
                utilization: budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0,
                forecasted: budget.spent || 0,
                variance: 0,
            },
            timeline: {
                startDate: startDate || new Date(),
                targetDate: targetDate || new Date(),
                predictedDate: targetDate || new Date(),
                buffer: 0,
            },
            priority: data.priority || 'medium',
        };
    }
    generateTeamRecommendations(data, recommendations) {
        const team = data.team || [];
        if (team.length === 0) {
            recommendations.push({
                type: 'team',
                priority: 'high',
                title: 'Assign Team Members',
                description: 'Project has no team members assigned',
                impact: { healthScore: 20 },
                effort: 'low',
                feasibility: 'high',
                actionItems: ['Identify required roles', 'Assign team members', 'Set up collaboration'],
            });
        }
    }
    generateBudgetRecommendations(data, recommendations) {
        const budget = data.budget || {};
        const spent = budget.spent || 0;
        const allocated = budget.allocated || 0;
        const progress = data.progress || 0;
        if (allocated > 0 && spent > allocated) {
            recommendations.push({
                type: 'budget',
                priority: 'critical',
                title: 'Budget Overrun',
                description: `Project has exceeded budget by ${((spent - allocated) / allocated * 100).toFixed(1)}%`,
                impact: { healthScore: -30, cost: -(spent - allocated) },
                effort: 'medium',
                feasibility: 'medium',
                actionItems: ['Review spending', 'Identify cost savings', 'Request budget increase if needed'],
            });
        }
        else if (allocated > 0 && (spent / allocated) > (progress / 100) + 0.2) {
            recommendations.push({
                type: 'budget',
                priority: 'high',
                title: 'Budget Utilization Ahead of Progress',
                description: 'Spending is ahead of project progress',
                impact: { healthScore: -15 },
                effort: 'low',
                feasibility: 'high',
                actionItems: ['Review spending patterns', 'Optimize resource allocation'],
            });
        }
    }
    generateTimelineRecommendations(data, recommendations) {
        const startDate = data.startDate ? new Date(data.startDate) : null;
        const targetDate = data.targetDate ? new Date(data.targetDate) : null;
        const progress = data.progress || 0;
        const now = new Date();
        if (!targetDate) {
            recommendations.push({
                type: 'timeline',
                priority: 'medium',
                title: 'Set Target Date',
                description: 'Project has no target completion date',
                impact: { healthScore: 10 },
                effort: 'low',
                feasibility: 'high',
                actionItems: ['Define target completion date', 'Set milestones'],
            });
            return;
        }
        if (targetDate < now && progress < 100) {
            recommendations.push({
                type: 'timeline',
                priority: 'critical',
                title: 'Target Date Passed',
                description: 'Target date has passed but project is not complete',
                impact: { healthScore: -40, completionDate: 0 },
                effort: 'high',
                feasibility: 'medium',
                actionItems: ['Update target date', 'Accelerate completion', 'Reduce scope if needed'],
            });
        }
        else if (startDate && targetDate) {
            const totalDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const expectedProgress = (elapsedDays / totalDays) * 100;
            if (progress < expectedProgress - 20) {
                recommendations.push({
                    type: 'timeline',
                    priority: 'high',
                    title: 'Behind Schedule',
                    description: `Project is ${(expectedProgress - progress).toFixed(1)}% behind schedule`,
                    impact: { healthScore: -25, completionDate: -((expectedProgress - progress) / 2) },
                    effort: 'medium',
                    feasibility: 'medium',
                    actionItems: ['Increase team capacity', 'Accelerate work', 'Consider scope reduction'],
                });
            }
        }
    }
    generatePriorityRecommendations(data, recommendations) {
        const priority = data.priority;
        const status = data.status;
        if (priority === 'critical' && status !== 'active') {
            recommendations.push({
                type: 'priority',
                priority: 'high',
                title: 'Priority Mismatch',
                description: 'Critical priority project is not active',
                impact: { healthScore: -15 },
                effort: 'low',
                feasibility: 'high',
                actionItems: ['Activate project', 'Ensure resources are allocated'],
            });
        }
    }
    calculateOptimizedState(currentState, _recommendations) {
        // Apply recommendations to calculate optimized state
        return {
            ...currentState,
            // Would apply optimizations here
        };
    }
    calculatePotentialImprovement(_healthScore, recommendations) {
        const healthScoreIncrease = recommendations.reduce((sum, rec) => {
            return sum + (rec.impact.healthScore || 0);
        }, 0);
        const completionDateImprovement = recommendations.reduce((sum, rec) => {
            return sum + (rec.impact.completionDate || 0);
        }, 0);
        return {
            healthScoreIncrease: Math.max(0, healthScoreIncrease),
            completionDateImprovement: Math.max(0, completionDateImprovement),
        };
    }
}
//# sourceMappingURL=project-analytics.service.js.map