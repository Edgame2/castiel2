/**
 * Benchmarking Service
 * Calculates benchmarks for win rates, closing times, deal sizes, and renewal estimates
 */
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
export class BenchmarkingService {
    monitoring;
    shardRepository;
    shardTypeRepository;
    relationshipService;
    // Default period for benchmarks (last 12 months)
    DEFAULT_BENCHMARK_PERIOD_DAYS = 365;
    constructor(monitoring, shardRepository, shardTypeRepository, relationshipService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.relationshipService = relationshipService;
    }
    /**
     * Calculate win rates by stage, industry, or overall
     */
    async calculateWinRates(tenantId, options) {
        const startTime = Date.now();
        try {
            const endDate = options?.endDate || new Date();
            const startDate = options?.startDate || new Date(endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000);
            // Get opportunity shard type
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                // Return empty benchmark if shard type not found (not seeded yet)
                this.monitoring.trackEvent('benchmark.win-rates-skipped', {
                    tenantId,
                    reason: 'opportunity_shard_type_not_found',
                });
                return {
                    scope: options?.scope || 'tenant',
                    industryId: options?.industryId,
                    period: {
                        startDate,
                        endDate,
                    },
                    metrics: {
                        winRate: 0,
                        opportunityCount: 0,
                        wonCount: 0,
                        lostCount: 0,
                    },
                    calculatedAt: new Date(),
                };
            }
            // Query closed opportunities in the period
            const opportunities = await this.getClosedOpportunities(tenantId, shardType.id, startDate, endDate, options?.industryId);
            // Calculate win/loss counts
            let wonCount = 0;
            let lostCount = 0;
            const byStage = {};
            for (const opp of opportunities) {
                const data = opp.structuredData;
                const stage = data?.stage;
                if (stage === 'closed_won') {
                    wonCount++;
                }
                else if (stage === 'closed_lost') {
                    lostCount++;
                }
                // Track by stage
                if (stage && (stage === 'closed_won' || stage === 'closed_lost')) {
                    if (!byStage[stage]) {
                        byStage[stage] = { won: 0, lost: 0 };
                    }
                    if (stage === 'closed_won') {
                        byStage[stage].won++;
                    }
                    else {
                        byStage[stage].lost++;
                    }
                }
            }
            const totalCount = wonCount + lostCount;
            const winRate = totalCount > 0 ? wonCount / totalCount : 0;
            const benchmark = {
                scope: options?.scope || 'tenant',
                industryId: options?.industryId,
                period: {
                    startDate,
                    endDate,
                },
                metrics: {
                    winRate,
                    opportunityCount: totalCount,
                    wonCount,
                    lostCount,
                },
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('benchmark.win-rates-calculated', {
                tenantId,
                industryId: options?.industryId,
                winRate,
                totalOpportunities: totalCount,
                durationMs: Date.now() - startTime,
            });
            return benchmark;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'benchmarking.calculateWinRates',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Calculate closing times (average, median, percentiles)
     */
    async calculateClosingTimes(tenantId, options) {
        const startTime = Date.now();
        try {
            const endDate = options?.endDate || new Date();
            const startDate = options?.startDate || new Date(endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000);
            // Get opportunity shard type
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                // Return empty benchmark if shard type not found (not seeded yet)
                this.monitoring.trackEvent('benchmark.closing-times-skipped', {
                    tenantId,
                    reason: 'opportunity_shard_type_not_found',
                });
                return {
                    scope: options?.scope || 'tenant',
                    industryId: options?.industryId,
                    period: {
                        startDate,
                        endDate,
                    },
                    metrics: {
                        avgClosingTime: 0,
                        medianClosingTime: 0,
                        p25ClosingTime: 0,
                        p75ClosingTime: 0,
                        opportunityCount: 0,
                    },
                    calculatedAt: new Date(),
                };
            }
            // Query closed won opportunities in the period
            const opportunities = await this.getClosedOpportunities(tenantId, shardType.id, startDate, endDate, options?.industryId, 'closed_won' // Only closed won
            );
            // Calculate closing times (days from creation to close)
            const closingTimes = [];
            for (const opp of opportunities) {
                const data = opp.structuredData;
                const closeDate = data?.actualCloseDate || data?.closeDate;
                if (closeDate) {
                    const created = opp.createdAt;
                    const closed = new Date(closeDate);
                    const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                    if (days >= 0) { // Only include valid closing times
                        closingTimes.push(days);
                    }
                }
            }
            // Calculate statistics
            closingTimes.sort((a, b) => a - b);
            const count = closingTimes.length;
            let avgClosingTime = 0;
            let medianClosingTime = 0;
            let p25ClosingTime = 0;
            let p75ClosingTime = 0;
            if (count > 0) {
                avgClosingTime = closingTimes.reduce((sum, t) => sum + t, 0) / count;
                medianClosingTime = closingTimes[Math.floor(count / 2)];
                p25ClosingTime = closingTimes[Math.floor(count * 0.25)];
                p75ClosingTime = closingTimes[Math.floor(count * 0.75)];
            }
            const benchmark = {
                scope: options?.scope || 'tenant',
                industryId: options?.industryId,
                period: {
                    startDate,
                    endDate,
                },
                metrics: {
                    avgClosingTime,
                    medianClosingTime,
                    p25ClosingTime,
                    p75ClosingTime,
                    opportunityCount: count,
                },
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('benchmark.closing-times-calculated', {
                tenantId,
                industryId: options?.industryId,
                avgClosingTime,
                opportunityCount: count,
                durationMs: Date.now() - startTime,
            });
            return benchmark;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'benchmarking.calculateClosingTimes',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Calculate deal size distribution
     */
    async calculateDealSizeDistribution(tenantId, options) {
        const startTime = Date.now();
        try {
            const endDate = options?.endDate || new Date();
            const startDate = options?.startDate || new Date(endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000);
            // Get opportunity shard type
            const shardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.OPPORTUNITY, 'system');
            if (!shardType) {
                // Return empty benchmark if shard type not found (not seeded yet)
                this.monitoring.trackEvent('benchmark.deal-sizes-skipped', {
                    tenantId,
                    reason: 'opportunity_shard_type_not_found',
                });
                // Return empty deal size distribution
                return {
                    scope: options?.scope || 'tenant',
                    industryId: options?.industryId,
                    period: {
                        startDate,
                        endDate,
                    },
                    metrics: {
                        dealSizeDistribution: {
                            min: 0,
                            p25: 0,
                            median: 0,
                            p75: 0,
                            max: 0,
                        },
                        avgDealSize: 0,
                        opportunityCount: 0,
                    },
                    calculatedAt: new Date(),
                };
            }
            // Query closed won opportunities in the period
            const opportunities = await this.getClosedOpportunities(tenantId, shardType.id, startDate, endDate, options?.industryId, 'closed_won' // Only closed won
            );
            // Extract deal sizes
            const dealSizes = [];
            for (const opp of opportunities) {
                const data = opp.structuredData;
                const value = data?.value;
                if (value && typeof value === 'number' && value > 0) {
                    dealSizes.push(value);
                }
            }
            // Calculate statistics
            dealSizes.sort((a, b) => a - b);
            const count = dealSizes.length;
            let min = 0;
            let p25 = 0;
            let median = 0;
            let p75 = 0;
            let max = 0;
            let avgDealSize = 0;
            if (count > 0) {
                min = dealSizes[0];
                max = dealSizes[count - 1];
                median = dealSizes[Math.floor(count / 2)];
                p25 = dealSizes[Math.floor(count * 0.25)];
                p75 = dealSizes[Math.floor(count * 0.75)];
                avgDealSize = dealSizes.reduce((sum, s) => sum + s, 0) / count;
            }
            const benchmark = {
                scope: options?.scope || 'tenant',
                industryId: options?.industryId,
                period: {
                    startDate,
                    endDate,
                },
                metrics: {
                    dealSizeDistribution: {
                        min,
                        p25,
                        median,
                        p75,
                        max,
                    },
                    avgDealSize,
                    opportunityCount: count,
                },
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('benchmark.deal-size-calculated', {
                tenantId,
                industryId: options?.industryId,
                avgDealSize,
                opportunityCount: count,
                durationMs: Date.now() - startTime,
            });
            return benchmark;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'benchmarking.calculateDealSizeDistribution',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Estimate renewal probability for a contract
     * Note: This is a simplified implementation. In a real system, contracts would be
     * stored as separate shards (e.g., c_contract). For now, we'll use opportunities
     * with a specific relationship or metadata to identify contracts.
     */
    async estimateRenewal(contractId, tenantId) {
        const startTime = Date.now();
        try {
            // Try to find the contract as an opportunity or related shard
            // In a full implementation, this would query a c_contract shard type
            const contract = await this.shardRepository.findById(contractId, tenantId);
            if (!contract) {
                throw new Error(`Contract not found: ${contractId}`);
            }
            const contractData = contract.structuredData;
            // Get related opportunities (renewal opportunities)
            const relatedOpportunities = await this.relationshipService.getRelatedShards(tenantId, contractId, 'both', {
                relationshipType: 'opportunity_for', // or similar
                limit: 10,
            });
            // Calculate renewal probability based on factors
            const factors = [];
            let renewalProbability = 0.5; // Base probability
            // Factor 1: Contract age (older contracts more likely to renew)
            const contractAge = contractData?.contractStartDate
                ? Math.floor((Date.now() - new Date(contractData.contractStartDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                : 0;
            if (contractAge > 2) {
                renewalProbability += 0.15;
                factors.push({
                    factor: 'Contract Age',
                    impact: 'positive',
                    weight: 0.15,
                });
            }
            else if (contractAge < 1) {
                renewalProbability -= 0.1;
                factors.push({
                    factor: 'Contract Age',
                    impact: 'negative',
                    weight: 0.1,
                });
            }
            // Factor 2: Related opportunities (active renewal discussions)
            if (relatedOpportunities.length > 0) {
                const activeRenewalOpps = relatedOpportunities.filter(rel => {
                    const oppData = rel.shard.structuredData;
                    return oppData?.stage &&
                        oppData.stage !== 'closed_won' &&
                        oppData.stage !== 'closed_lost';
                });
                if (activeRenewalOpps.length > 0) {
                    renewalProbability += 0.2;
                    factors.push({
                        factor: 'Active Renewal Discussions',
                        impact: 'positive',
                        weight: 0.2,
                    });
                }
            }
            // Factor 3: Contract value (higher value = more likely to renew)
            const contractValue = contractData?.value || contractData?.annualValue || 0;
            if (contractValue > 100000) {
                renewalProbability += 0.1;
                factors.push({
                    factor: 'High Contract Value',
                    impact: 'positive',
                    weight: 0.1,
                });
            }
            // Factor 4: Usage/engagement (if available)
            // This would typically come from usage analytics
            const usageScore = contractData?.usageScore || contractData?.engagementScore || 0.5;
            if (usageScore > 0.7) {
                renewalProbability += 0.15;
                factors.push({
                    factor: 'High Usage/Engagement',
                    impact: 'positive',
                    weight: 0.15,
                });
            }
            else if (usageScore < 0.3) {
                renewalProbability -= 0.2;
                factors.push({
                    factor: 'Low Usage/Engagement',
                    impact: 'negative',
                    weight: 0.2,
                });
            }
            // Clamp probability between 0 and 1
            renewalProbability = Math.max(0, Math.min(1, renewalProbability));
            // Generate recommended actions
            const recommendedActions = [];
            if (renewalProbability < 0.5) {
                recommendedActions.push('Schedule renewal discussion');
                recommendedActions.push('Review contract terms and pricing');
                recommendedActions.push('Identify key stakeholders');
            }
            else if (renewalProbability < 0.7) {
                recommendedActions.push('Engage with decision makers');
                recommendedActions.push('Highlight value delivered');
            }
            else {
                recommendedActions.push('Prepare renewal proposal');
                recommendedActions.push('Schedule contract review');
            }
            const estimate = {
                contractId,
                renewalProbability,
                factors,
                recommendedActions,
                estimatedRenewalValue: contractValue,
                calculatedAt: new Date(),
            };
            this.monitoring.trackEvent('benchmark.renewal-estimated', {
                tenantId,
                contractId,
                renewalProbability,
                durationMs: Date.now() - startTime,
            });
            return estimate;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'benchmarking.estimateRenewal',
                tenantId,
                contractId,
            });
            throw error;
        }
    }
    /**
     * Helper: Get closed opportunities in a period
     */
    async getClosedOpportunities(tenantId, shardTypeId, startDate, endDate, industryId, stageFilter) {
        // Query all opportunities in the period
        // Note: ShardRepository.list doesn't support complex filtering on structuredData
        // We'll need to fetch and filter in memory
        const result = await this.shardRepository.list({
            tenantId,
            shardTypeId,
            limit: 10000, // Large limit to get all opportunities
        });
        // Filter opportunities
        const filtered = result.shards.filter(shard => {
            const data = shard.structuredData;
            const stage = data?.stage;
            const closeDate = data?.actualCloseDate || data?.closeDate;
            // Filter by stage
            if (stageFilter) {
                if (stage !== stageFilter) {
                    return false;
                }
            }
            else {
                // Include both closed_won and closed_lost if no filter
                if (stage !== 'closed_won' && stage !== 'closed_lost') {
                    return false;
                }
            }
            // Filter by close date
            if (closeDate) {
                const date = new Date(closeDate);
                if (date < startDate || date > endDate) {
                    return false;
                }
            }
            else {
                // If no close date, use created date as fallback
                const created = shard.createdAt;
                if (created < startDate || created > endDate) {
                    return false;
                }
            }
            // Filter by industry if specified
            if (industryId && data?.industryId !== industryId) {
                return false;
            }
            return true;
        });
        return filtered;
    }
}
//# sourceMappingURL=benchmarking.service.js.map