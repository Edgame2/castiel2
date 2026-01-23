/**
 * Pipeline View Service
 * Manages different pipeline views (all, active, stage, kanban)
 */
export class PipelineViewService {
    monitoring;
    opportunityService;
    revenueAtRiskService;
    constructor(monitoring, opportunityService, revenueAtRiskService) {
        this.monitoring = monitoring;
        this.opportunityService = opportunityService;
        this.revenueAtRiskService = revenueAtRiskService;
    }
    /**
     * Get pipeline view
     */
    async getPipelineView(userId, tenantId, viewType = 'all', filters) {
        const startTime = Date.now();
        try {
            // Get opportunities
            const result = await this.opportunityService.listOwnedOpportunities(userId, tenantId, {
                ...filters,
                status: filters?.includeClosed ? undefined : ['open'],
            }, {
                limit: 1000, // Large limit for pipeline view
            });
            let opportunities = result.opportunities;
            // Filter by view type
            if (viewType === 'active') {
                const now = new Date();
                opportunities = opportunities.filter((opp) => {
                    const data = opp.structuredData;
                    const closeDate = data?.closeDate ? new Date(data.closeDate) : null;
                    return closeDate && closeDate >= now;
                });
            }
            // Build view based on type
            if (viewType === 'kanban') {
                return this.buildKanbanView(opportunities, tenantId, userId);
            }
            else if (viewType === 'stage') {
                return this.buildStageView(opportunities, tenantId, userId);
            }
            else {
                return this.buildAllView(opportunities, tenantId, userId);
            }
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'pipeline-view.getPipelineView',
                tenantId,
                userId,
                viewType,
            });
            throw error;
        }
    }
    /**
     * Build "all" view (flat list)
     */
    async buildAllView(opportunities, tenantId, userId) {
        const summary = await this.calculateSummary(opportunities, tenantId, userId);
        return {
            viewType: 'all',
            opportunities,
            summary,
        };
    }
    /**
     * Build "stage" view (grouped by stage)
     */
    async buildStageView(opportunities, tenantId, userId) {
        // Group by stage
        const stageMap = new Map();
        for (const opp of opportunities) {
            const data = opp.structuredData;
            const stage = data?.stage || 'Unknown';
            if (!stageMap.has(stage)) {
                stageMap.set(stage, []);
            }
            stageMap.get(stage).push(opp);
        }
        // Build stages array
        const stages = await Promise.all(Array.from(stageMap.entries()).map(async ([stage, opps]) => {
            let totalValue = 0;
            let totalExpectedRevenue = 0;
            for (const opp of opps) {
                const data = opp.structuredData;
                totalValue += data?.value || 0;
                totalExpectedRevenue += data?.expectedRevenue || data?.value || 0;
            }
            return {
                stage,
                opportunities: opps,
                totalValue,
                totalExpectedRevenue,
                count: opps.length,
            };
        }));
        // Sort stages by typical sales process order (if known)
        stages.sort((a, b) => {
            const stageOrder = [
                'prospecting',
                'qualification',
                'needs-analysis',
                'value-proposition',
                'id-decision-makers',
                'perception-analysis',
                'proposal/price-quote',
                'negotiation/review',
                'closed-won',
                'closed-lost',
            ];
            const aIndex = stageOrder.indexOf(a.stage.toLowerCase());
            const bIndex = stageOrder.indexOf(b.stage.toLowerCase());
            if (aIndex === -1 && bIndex === -1) {
                return a.stage.localeCompare(b.stage);
            }
            if (aIndex === -1) {
                return 1;
            }
            if (bIndex === -1) {
                return -1;
            }
            return aIndex - bIndex;
        });
        const summary = await this.calculateSummary(opportunities, tenantId, userId);
        return {
            viewType: 'stage',
            opportunities,
            stages,
            summary,
        };
    }
    /**
     * Build kanban view
     */
    async buildKanbanView(opportunities, tenantId, userId) {
        const kanbanView = await this.buildStageView(opportunities, tenantId, userId);
        return {
            ...kanbanView,
            viewType: 'kanban',
        };
    }
    /**
     * Calculate pipeline summary
     */
    async calculateSummary(opportunities, tenantId, userId) {
        let totalValue = 0;
        let totalExpectedRevenue = 0;
        let totalRevenueAtRisk = 0;
        // Calculate totals
        for (const opp of opportunities) {
            const data = opp.structuredData;
            const value = data?.value || 0;
            const expectedRevenue = data?.expectedRevenue || value;
            totalValue += value;
            totalExpectedRevenue += expectedRevenue;
            // Get revenue at risk if available
            const riskEvaluation = data?.riskEvaluation;
            if (riskEvaluation?.revenueAtRisk) {
                totalRevenueAtRisk += riskEvaluation.revenueAtRisk;
            }
        }
        const riskAdjustedValue = totalExpectedRevenue - totalRevenueAtRisk;
        return {
            totalValue,
            totalExpectedRevenue,
            totalRevenueAtRisk,
            riskAdjustedValue,
            opportunityCount: opportunities.length,
        };
    }
}
//# sourceMappingURL=pipeline-view.service.js.map