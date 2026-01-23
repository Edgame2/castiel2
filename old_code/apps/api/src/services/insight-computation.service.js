/**
 * Insight Computation Service (Phase 2)
 *
 * Computes KPI insights from CRM data and maintains provenance links.
 *
 * Responsibilities:
 * 1. Recompute KPI shards on CRM changes (via Change Feed subscription)
 * 2. Nightly batch recomputation
 * 3. Create provenance shards linking to source shards via internal_relationships[]
 */
import { ChangeFeedStartFrom } from '@azure/cosmos';
export class InsightComputationService {
    shardRepository;
    monitoring;
    shardsContainer;
    changeFeedIterator = null;
    isRunning = false;
    config;
    constructor(monitoring, shardRepository, shardsContainer, config = {}) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardsContainer = shardsContainer;
        this.config = {
            enableChangeFeed: config.enableChangeFeed ?? true,
            enableNightlyBatch: config.enableNightlyBatch ?? true,
            batchSize: config.batchSize ?? 100,
            pollIntervalMs: config.pollIntervalMs ?? 5000,
        };
    }
    /**
     * Start change feed listener for CRM changes
     */
    async startChangeFeedListener() {
        if (!this.config.enableChangeFeed) {
            this.monitoring.trackEvent('insight-computation.change-feed-disabled');
            return;
        }
        if (this.isRunning) {
            this.monitoring.trackEvent('insight-computation.already-running');
            return;
        }
        try {
            this.monitoring.trackEvent('insight-computation.change-feed-starting');
            // Create change feed iterator for CRM shard types
            this.changeFeedIterator = this.shardsContainer.items.getChangeFeedIterator({
                startFrom: ChangeFeedStartFrom.Now(),
                maxItemCount: this.config.batchSize,
            });
            this.isRunning = true;
            // Start processing loop
            this.processChangeFeedLoop().catch((error) => {
                this.monitoring.trackException(error, {
                    component: 'InsightComputationService',
                    operation: 'change-feed-loop',
                });
            });
            this.monitoring.trackEvent('insight-computation.change-feed-started');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'InsightComputationService',
                operation: 'start-change-feed',
            });
            throw error;
        }
    }
    /**
     * Process change feed loop
     */
    async processChangeFeedLoop() {
        while (this.isRunning && this.changeFeedIterator) {
            try {
                const { hasMoreResults, continuationToken } = await this.changeFeedIterator.readNext();
                if (hasMoreResults && this.changeFeedIterator.getFeedResponse()) {
                    const changes = this.changeFeedIterator.getFeedResponse().getResources();
                    for (const change of changes) {
                        // Only process CRM shard types (c_opportunity, c_account)
                        if (change.shardTypeId === 'c_opportunity' || change.shardTypeId === 'c_account') {
                            await this.recomputeKPIsForShard(change);
                        }
                    }
                }
                if (!hasMoreResults) {
                    // Wait before next poll
                    await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs));
                }
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    component: 'InsightComputationService',
                    operation: 'change-feed-process',
                });
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs));
            }
        }
    }
    /**
     * Recompute KPIs for a specific shard
     */
    async recomputeKPIsForShard(shard) {
        try {
            const tenantId = shard.tenantId;
            const shardTypeId = shard.shardTypeId;
            // Compute KPIs based on shard type
            let kpis = [];
            if (shardTypeId === 'c_opportunity') {
                kpis = await this.computeOpportunityKPIs(shard, tenantId);
            }
            else if (shardTypeId === 'c_account') {
                kpis = await this.computeAccountKPIs(shard, tenantId);
            }
            // Create or update KPI shards with provenance
            for (const kpi of kpis) {
                await this.createOrUpdateKPIShard(tenantId, kpi, shard.id);
            }
            this.monitoring.trackEvent('insight-computation.kpis-recomputed', {
                tenantId,
                shardId: shard.id,
                shardTypeId,
                kpiCount: kpis.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'InsightComputationService',
                operation: 'recompute-kpis',
                shardId: shard.id,
            });
        }
    }
    /**
     * Compute KPIs for an opportunity shard
     */
    async computeOpportunityKPIs(opportunity, tenantId) {
        const data = opportunity.structuredData || {};
        const kpis = [];
        // Total pipeline value
        const totalValue = data.value || 0;
        kpis.push({
            name: 'Total Pipeline Value',
            value: totalValue,
            trend: 'stable', // Would compute from historical data
            period: 'monthly',
            unit: data.currency || 'USD',
            description: 'Total value of all opportunities',
            sources: [opportunity.id],
        });
        // Win rate (would aggregate across opportunities)
        // For now, compute per-opportunity probability
        const probability = data.probability || 0;
        kpis.push({
            name: 'Opportunity Win Probability',
            value: probability,
            trend: 'stable',
            period: 'monthly',
            unit: '%',
            description: `Win probability for ${data.name || 'opportunity'}`,
            sources: [opportunity.id],
        });
        return kpis;
    }
    /**
     * Compute KPIs for an account shard
     */
    async computeAccountKPIs(account, tenantId) {
        const data = account.structuredData || {};
        const kpis = [];
        // Account revenue
        const revenue = data.revenue || 0;
        kpis.push({
            name: 'Account Annual Revenue',
            value: revenue,
            trend: 'stable',
            period: 'yearly',
            unit: 'USD',
            description: `Annual revenue for ${data.name || 'account'}`,
            sources: [account.id],
        });
        return kpis;
    }
    /**
     * Create or update KPI shard with provenance
     */
    async createOrUpdateKPIShard(tenantId, kpi, sourceShardId) {
        try {
            // Build KPI shard structured data
            const structuredData = {
                name: kpi.name,
                value: kpi.value,
                trend: kpi.trend,
                period: kpi.period,
                unit: kpi.unit,
                description: kpi.description,
            };
            // Build provenance relationships
            const provenanceRelationships = kpi.sources.map(shardId => ({
                shardId,
                shardTypeId: 'c_opportunity', // Would determine from source shard
                shardName: 'Source',
                createdAt: new Date(),
                metadata: {
                    confidence: 1.0,
                    source: 'computation',
                    extractionMethod: 'kpi-computation',
                    extractedAt: new Date(),
                },
            }));
            // Check if KPI shard already exists
            const existingKPIs = await this.shardRepository.findByType(tenantId, 'c_insight_kpi', {
                status: 'active',
            });
            // Find existing KPI by name and period
            const existingKPI = existingKPIs.find(s => {
                const sd = s.structuredData || {};
                return sd.name === kpi.name && sd.period === kpi.period;
            });
            if (existingKPI) {
                // Update existing KPI shard
                await this.shardRepository.update(existingKPI.id, tenantId, {
                    structuredData,
                    internal_relationships: provenanceRelationships,
                });
            }
            else {
                // Create new KPI shard
                await this.shardRepository.create({
                    tenantId,
                    userId: 'system',
                    shardTypeId: 'c_insight_kpi',
                    structuredData,
                    internal_relationships: provenanceRelationships,
                    acl: [],
                    status: 'active',
                    source: 'system',
                    sourceDetails: {
                        integrationName: 'insight-computation',
                        syncedAt: new Date(),
                    },
                });
            }
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'InsightComputationService',
                operation: 'create-kpi-shard',
                kpiName: kpi.name,
            });
            throw error;
        }
    }
    /**
     * Run nightly batch recomputation
     */
    async runNightlyBatchRecomputation(tenantId) {
        if (!this.config.enableNightlyBatch) {
            this.monitoring.trackEvent('insight-computation.nightly-batch-disabled');
            return;
        }
        try {
            this.monitoring.trackEvent('insight-computation.nightly-batch-starting', { tenantId });
            // Get all CRM shards for recomputation
            const opportunityShards = await this.shardRepository.findByType(tenantId || '', 'c_opportunity', { status: 'active' });
            const accountShards = await this.shardRepository.findByType(tenantId || '', 'c_account', { status: 'active' });
            // Recompute KPIs for all shards
            for (const shard of [...opportunityShards, ...accountShards]) {
                await this.recomputeKPIsForShard(shard);
            }
            this.monitoring.trackEvent('insight-computation.nightly-batch-completed', {
                tenantId,
                opportunityCount: opportunityShards.length,
                accountCount: accountShards.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'InsightComputationService',
                operation: 'nightly-batch',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Stop change feed listener
     */
    async stopChangeFeedListener() {
        this.isRunning = false;
        this.changeFeedIterator = null;
        this.monitoring.trackEvent('insight-computation.change-feed-stopped');
    }
}
//# sourceMappingURL=insight-computation.service.js.map