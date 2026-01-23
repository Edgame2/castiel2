/**
 * Pipeline Summary Service
 * Provides high-level summary dashboard with key metrics and risk distribution
 */
export class PipelineSummaryService {
    monitoring;
    pipelineAnalytics;
    revenueAtRiskService;
    constructor(monitoring, pipelineAnalytics, revenueAtRiskService) {
        this.monitoring = monitoring;
        this.pipelineAnalytics = pipelineAnalytics;
        this.revenueAtRiskService = revenueAtRiskService;
    }
    /**
     * Get comprehensive pipeline summary
     */
    async getSummary(userId, tenantId) {
        const startTime = Date.now();
        try {
            // Get metrics and risk organization in parallel
            const [metrics, riskOrganization] = await Promise.all([
                this.pipelineAnalytics.calculatePipelineMetrics(userId, tenantId),
                this.pipelineAnalytics.organizeByRiskLevel(userId, tenantId),
            ]);
            // Calculate risk distribution percentages
            const totalCount = metrics.opportunityCount;
            const riskDistribution = {
                high: {
                    count: riskOrganization.high.count,
                    percentage: totalCount > 0 ? (riskOrganization.high.count / totalCount) * 100 : 0,
                    value: riskOrganization.high.totalValue,
                },
                medium: {
                    count: riskOrganization.medium.count,
                    percentage: totalCount > 0 ? (riskOrganization.medium.count / totalCount) * 100 : 0,
                    value: riskOrganization.medium.totalValue,
                },
                low: {
                    count: riskOrganization.low.count,
                    percentage: totalCount > 0 ? (riskOrganization.low.count / totalCount) * 100 : 0,
                    value: riskOrganization.low.totalValue,
                },
            };
            // Get top risks (highest revenue at risk)
            const topRisks = [
                ...riskOrganization.high.opportunities,
                ...riskOrganization.medium.opportunities,
            ]
                .map((opp) => {
                const data = opp.structuredData;
                const riskEvaluation = data?.riskEvaluation;
                return {
                    opportunityId: opp.id,
                    opportunityName: data?.name || 'Unnamed Opportunity',
                    riskScore: riskEvaluation?.riskScore || 0,
                    revenueAtRisk: riskEvaluation?.revenueAtRisk || 0,
                };
            })
                .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
                .slice(0, 10); // Top 10
            const summary = {
                metrics,
                riskOrganization,
                riskDistribution,
                topRisks,
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('pipeline-summary.calculated', {
                tenantId,
                userId,
                opportunityCount: metrics.opportunityCount,
                durationMs: Date.now() - startTime,
            });
            return summary;
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'pipeline-summary.getSummary',
                tenantId,
                userId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=pipeline-summary.service.js.map