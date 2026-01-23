/**
 * Pipeline View Service
 * Manages different pipeline views (all, active, stage, kanban)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { OpportunityService } from './opportunity.service.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { PipelineView, PipelineFilters, PipelineViewType } from '../types/opportunity.types.js';
export declare class PipelineViewService {
    private monitoring;
    private opportunityService;
    private revenueAtRiskService;
    constructor(monitoring: IMonitoringProvider, opportunityService: OpportunityService, revenueAtRiskService: RevenueAtRiskService);
    /**
     * Get pipeline view
     */
    getPipelineView(userId: string, tenantId: string, viewType?: PipelineViewType, filters?: PipelineFilters): Promise<PipelineView>;
    /**
     * Build "all" view (flat list)
     */
    private buildAllView;
    /**
     * Build "stage" view (grouped by stage)
     */
    private buildStageView;
    /**
     * Build kanban view
     */
    private buildKanbanView;
    /**
     * Calculate pipeline summary
     */
    private calculateSummary;
}
//# sourceMappingURL=pipeline-view.service.d.ts.map