/**
 * Revenue at Risk Service
 * Calculates revenue at risk for opportunities, portfolios, teams, and tenants
 */
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
export class RevenueAtRiskService {
    monitoring;
    shardRepository;
    shardTypeRepository;
    riskEvaluationService;
    // Risk score thresholds
    HIGH_RISK_THRESHOLD = 0.7;
    MEDIUM_RISK_THRESHOLD = 0.4;
    constructor(monitoring, shardRepository, shardTypeRepository, riskEvaluationService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.riskEvaluationService = riskEvaluationService;
    }
    /**
     * Calculate revenue at risk for a single opportunity
     */
    async calculateForOpportunity(opportunityId, tenantId, userId) {
        const startTime = Date.now();
        try {
            // Get opportunity
            const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
            if (!opportunity) {
                throw new Error(`Opportunity not found: ${opportunityId}`);
            }
            // Get or evaluate risk
            const opportunityData = opportunity.structuredData;
            let riskEvaluation = opportunityData.riskEvaluation;
            // If no evaluation or stale, evaluate now
            if (!riskEvaluation) {
                riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(opportunityId, tenantId, userId, { includeHistorical: true, includeAI: false } // Fast evaluation
                );
            }
            // Extract values
            const dealValue = opportunityData.value || 0;
            const currency = opportunityData.currency || 'USD';
            const riskScore = riskEvaluation.riskScore;
            const revenueAtRisk = riskEvaluation.revenueAtRisk;
            const riskAdjustedValue = dealValue - revenueAtRisk;
            const result = {
                opportunityId,
                dealValue,
                currency,
                riskScore,
                revenueAtRisk,
                riskAdjustedValue,
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('revenue-at-risk.opportunity-calculated', {
                tenantId,
                opportunityId,
                dealValue,
                revenueAtRisk,
                riskScore,
                durationMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'revenue-at-risk.calculateForOpportunity',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
    /**
     * Calculate revenue at risk for a user's portfolio
     */
    async calculateForPortfolio(userId, tenantId) {
        const startTime = Date.now();
        try {
            // Get shard type for opportunities
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                throw new Error('Opportunity shard type not found');
            }
            // Query opportunities owned by user
            // Note: ownerId field in opportunity structuredData
            const opportunitiesResult = await this.shardRepository.list({
                tenantId,
                shardTypeId: shardType.id,
                filter: {
                // Filter by ownerId in structuredData
                // Note: ShardRepository.list doesn't directly support structuredData filtering
                // We'll need to filter in memory or use a custom query
                },
                limit: 1000,
            });
            // Filter opportunities by ownerId in memory
            const userOpportunities = opportunitiesResult.shards.filter(shard => {
                const data = shard.structuredData;
                return data?.ownerId === userId &&
                    data?.stage !== 'closed_won' &&
                    data?.stage !== 'closed_lost';
            });
            // Calculate revenue at risk for each opportunity
            const opportunityRisks = [];
            let totalDealValue = 0;
            let totalRevenueAtRisk = 0;
            let highRiskCount = 0;
            let mediumRiskCount = 0;
            let lowRiskCount = 0;
            for (const opportunity of userOpportunities) {
                try {
                    const risk = await this.calculateForOpportunity(opportunity.id, tenantId, userId);
                    opportunityRisks.push(risk);
                    totalDealValue += risk.dealValue;
                    totalRevenueAtRisk += risk.revenueAtRisk;
                    // Categorize by risk score
                    if (risk.riskScore >= this.HIGH_RISK_THRESHOLD) {
                        highRiskCount++;
                    }
                    else if (risk.riskScore >= this.MEDIUM_RISK_THRESHOLD) {
                        mediumRiskCount++;
                    }
                    else {
                        lowRiskCount++;
                    }
                }
                catch (error) {
                    // Log but continue with other opportunities
                    this.monitoring.trackException(error, {
                        operation: 'revenue-at-risk.portfolio-opportunity',
                        tenantId,
                        userId,
                        opportunityId: opportunity.id,
                    });
                }
            }
            const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;
            const result = {
                userId,
                totalDealValue,
                totalRevenueAtRisk,
                riskAdjustedValue,
                opportunityCount: opportunityRisks.length,
                highRiskCount,
                mediumRiskCount,
                lowRiskCount,
                opportunities: opportunityRisks,
            };
            this.monitoring.trackEvent('revenue-at-risk.portfolio-calculated', {
                tenantId,
                userId,
                opportunityCount: opportunityRisks.length,
                totalDealValue,
                totalRevenueAtRisk,
                durationMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'revenue-at-risk.calculateForPortfolio',
                tenantId,
                userId,
            });
            throw error;
        }
    }
    /**
     * Calculate revenue at risk for a team
     * Note: Team membership is typically stored in relationships or user metadata
     * This is a simplified implementation - may need enhancement based on team structure
     */
    async calculateForTeam(teamId, tenantId) {
        const startTime = Date.now();
        try {
            // TODO: Get team members - this depends on how teams are structured
            // For now, we'll need to query users by teamId or use relationships
            // This is a placeholder implementation
            // Get shard type for opportunities
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                throw new Error('Opportunity shard type not found');
            }
            // Query all opportunities in tenant (we'll filter by team later)
            const opportunitiesResult = await this.shardRepository.list({
                tenantId,
                shardTypeId: shardType.id,
                limit: 1000,
            });
            // Filter opportunities by teamId
            // Note: This assumes teamId is stored in opportunity structuredData or relationships
            // This is a simplified approach - may need enhancement
            const teamOpportunities = opportunitiesResult.shards.filter(shard => {
                const data = shard.structuredData;
                // Check if opportunity belongs to team (simplified - may need relationship lookup)
                return data?.teamId === teamId &&
                    data?.stage !== 'closed_won' &&
                    data?.stage !== 'closed_lost';
            });
            // Group by owner and calculate portfolio for each member
            const memberMap = new Map();
            for (const opportunity of teamOpportunities) {
                const data = opportunity.structuredData;
                const ownerId = data?.ownerId;
                if (ownerId) {
                    if (!memberMap.has(ownerId)) {
                        memberMap.set(ownerId, []);
                    }
                    memberMap.get(ownerId).push(opportunity);
                }
            }
            // Calculate portfolio for each team member
            const members = [];
            for (const [memberUserId, opportunities] of memberMap.entries()) {
                try {
                    const memberPortfolio = await this.calculateForPortfolio(memberUserId, tenantId);
                    members.push(memberPortfolio);
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'revenue-at-risk.team-member',
                        tenantId,
                        teamId,
                        userId: memberUserId,
                    });
                }
            }
            // Aggregate team totals
            const totalDealValue = members.reduce((sum, m) => sum + m.totalDealValue, 0);
            const totalRevenueAtRisk = members.reduce((sum, m) => sum + m.totalRevenueAtRisk, 0);
            const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;
            const opportunityCount = members.reduce((sum, m) => sum + m.opportunityCount, 0);
            const result = {
                teamId,
                totalDealValue,
                totalRevenueAtRisk,
                riskAdjustedValue,
                opportunityCount,
                memberCount: members.length,
                members,
            };
            this.monitoring.trackEvent('revenue-at-risk.team-calculated', {
                tenantId,
                teamId,
                memberCount: members.length,
                opportunityCount,
                totalDealValue,
                totalRevenueAtRisk,
                durationMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'revenue-at-risk.calculateForTeam',
                tenantId,
                teamId,
            });
            throw error;
        }
    }
    /**
     * Calculate revenue at risk for entire tenant
     */
    async calculateForTenant(tenantId) {
        const startTime = Date.now();
        try {
            // Get shard type for opportunities
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                throw new Error('Opportunity shard type not found');
            }
            // Query all opportunities in tenant
            // Use large limit for tenant-wide calculation, but add performance monitoring
            const MAX_OPPORTUNITIES_FOR_TENANT_CALC = 10000;
            const opportunitiesResult = await this.shardRepository.list({
                tenantId,
                shardTypeId: shardType.id,
                limit: MAX_OPPORTUNITIES_FOR_TENANT_CALC,
            });
            if (opportunitiesResult.shards.length >= MAX_OPPORTUNITIES_FOR_TENANT_CALC) {
                this.monitoring.trackEvent('revenue-at-risk.tenant.large_dataset', {
                    tenantId,
                    opportunityCount: opportunitiesResult.shards.length,
                    warning: 'Calculation may be incomplete for very large datasets',
                });
            }
            // Filter active opportunities
            const activeOpportunities = opportunitiesResult.shards.filter(shard => {
                const data = shard.structuredData;
                return data?.stage !== 'closed_won' && data?.stage !== 'closed_lost';
            });
            // Group by owner
            const ownerMap = new Map();
            for (const opportunity of activeOpportunities) {
                const data = opportunity.structuredData;
                const ownerId = data?.ownerId;
                if (ownerId) {
                    if (!ownerMap.has(ownerId)) {
                        ownerMap.set(ownerId, []);
                    }
                    ownerMap.get(ownerId).push(opportunity);
                }
            }
            // Group owners by team (simplified - assumes teamId in user metadata)
            // For now, we'll calculate portfolios and group them
            const portfolios = [];
            for (const [userId, opportunities] of ownerMap.entries()) {
                try {
                    const portfolio = await this.calculateForPortfolio(userId, tenantId);
                    portfolios.push(portfolio);
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'revenue-at-risk.tenant-owner',
                        tenantId,
                        userId,
                    });
                }
            }
            // Aggregate tenant totals
            const totalDealValue = portfolios.reduce((sum, p) => sum + p.totalDealValue, 0);
            const totalRevenueAtRisk = portfolios.reduce((sum, p) => sum + p.totalRevenueAtRisk, 0);
            const riskAdjustedValue = totalDealValue - totalRevenueAtRisk;
            const opportunityCount = portfolios.reduce((sum, p) => sum + p.opportunityCount, 0);
            // Group portfolios by team (simplified - would need team lookup)
            // For now, create a single team per user (placeholder)
            const teams = [];
            // TODO: Properly group by team when team structure is available
            const result = {
                tenantId,
                totalDealValue,
                totalRevenueAtRisk,
                riskAdjustedValue,
                opportunityCount,
                teamCount: teams.length,
                teams, // Empty for now - needs team structure
            };
            this.monitoring.trackEvent('revenue-at-risk.tenant-calculated', {
                tenantId,
                opportunityCount,
                totalDealValue,
                totalRevenueAtRisk,
                durationMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'revenue-at-risk.calculateForTenant',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Categorize risk score
     */
    categorizeRisk(riskScore) {
        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
            return 'high';
        }
        else if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
}
//# sourceMappingURL=revenue-at-risk.service.js.map