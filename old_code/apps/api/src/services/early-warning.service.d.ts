/**
 * Early Warning Service
 * Detects early-warning signals for opportunities
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';
import type { EarlyWarningSignal } from '../types/risk-analysis.types.js';
import type { Shard } from '../types/shard.types.js';
export declare class EarlyWarningService {
    private monitoring;
    private shardRepository;
    private revisionRepository;
    private relationshipService;
    private riskEvaluationService;
    private readonly STAGE_STAGNATION_DAYS;
    private readonly ACTIVITY_DROP_THRESHOLD;
    private readonly RISK_ACCELERATION_THRESHOLD;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, revisionRepository: RevisionRepository, relationshipService: ShardRelationshipService, riskEvaluationService: RiskEvaluationService);
    /**
     * Detect all early-warning signals for an opportunity
     */
    detectSignals(opportunityId: string, tenantId: string, userId: string): Promise<EarlyWarningSignal[]>;
    /**
     * Check for stage stagnation
     */
    checkStageStagnation(opportunity: Shard, tenantId: string): Promise<EarlyWarningSignal | null>;
    /**
     * Check for activity drop
     */
    checkActivityDrop(opportunity: Shard, tenantId: string): Promise<EarlyWarningSignal | null>;
    /**
     * Check for stakeholder churn
     */
    checkStakeholderChurn(opportunity: Shard, tenantId: string): Promise<EarlyWarningSignal | null>;
    /**
     * Check for risk acceleration
     */
    checkRiskAcceleration(opportunityId: string, tenantId: string, userId: string): Promise<EarlyWarningSignal | null>;
}
//# sourceMappingURL=early-warning.service.d.ts.map