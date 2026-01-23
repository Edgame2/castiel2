/**
 * Search Analytics Service
 *
 * Comprehensive analytics for vector search including:
 * - Query analytics
 * - Zero-result detection
 * - Satisfaction metrics
 * - Popular terms dashboard
 */
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
const SEARCH_ANALYTICS_CONTAINER = 'search-analytics';
const SEARCH_INTERACTIONS_CONTAINER = 'search-interactions';
export class SearchAnalyticsService {
    redis;
    monitoring;
    analyticsContainer;
    interactionsContainer;
    RETENTION_DAYS = 90; // Keep analytics for 90 days
    constructor(database, redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
        this.analyticsContainer = database.container(SEARCH_ANALYTICS_CONTAINER);
        this.interactionsContainer = database.container(SEARCH_INTERACTIONS_CONTAINER);
    }
    /**
     * Hash a query string for deduplication
     */
    hashQuery(query, filters) {
        const normalized = query.toLowerCase().trim();
        const filterStr = filters ? JSON.stringify(filters) : '';
        return createHash('sha256').update(`${normalized}:${filterStr}`).digest('hex');
    }
    /**
     * Record a search query event
     */
    async recordSearchEvent(event) {
        const queryHash = this.hashQuery(event.query, event.filters);
        const searchEvent = {
            ...event,
            id: uuidv4(),
            queryHash,
        };
        try {
            // Store in Cosmos DB
            await this.analyticsContainer.items.upsert(searchEvent);
            // Also store in Redis for fast analytics
            if (this.redis) {
                const dateKey = this.getDateKey(event.timestamp);
                // Store event
                const eventKey = `search:event:${event.tenantId}:${dateKey}:${searchEvent.id}`;
                await this.redis.setex(eventKey, this.RETENTION_DAYS * 24 * 60 * 60, JSON.stringify(searchEvent));
                // Update query counter
                const queryKey = `search:query:${event.tenantId}:${queryHash}`;
                await this.redis.hincrby(queryKey, 'count', 1);
                await this.redis.hset(queryKey, 'query', event.query);
                await this.redis.hset(queryKey, 'lastSearched', event.timestamp.toISOString());
                if (!(await this.redis.hexists(queryKey, 'firstSearched'))) {
                    await this.redis.hset(queryKey, 'firstSearched', event.timestamp.toISOString());
                }
                await this.redis.expire(queryKey, this.RETENTION_DAYS * 24 * 60 * 60);
                // Track zero-result queries
                if (!event.hasResults) {
                    const zeroResultKey = `search:zero:${event.tenantId}:${queryHash}`;
                    await this.redis.zincrby(zeroResultKey, 1, event.query);
                    await this.redis.expire(zeroResultKey, this.RETENTION_DAYS * 24 * 60 * 60);
                }
                // Track popular terms
                const popularKey = `search:popular:${event.tenantId}${event.shardTypeId ? `:${event.shardTypeId}` : ''}`;
                await this.redis.zincrby(popularKey, 1, event.query.toLowerCase());
                await this.redis.expire(popularKey, this.RETENTION_DAYS * 24 * 60 * 60);
                // Track daily stats
                const dailyKey = `search:daily:${event.tenantId}:${dateKey}`;
                await this.redis.hincrby(dailyKey, 'totalSearches', 1);
                if (!event.hasResults) {
                    await this.redis.hincrby(dailyKey, 'zeroResults', 1);
                }
                await this.redis.expire(dailyKey, this.RETENTION_DAYS * 24 * 60 * 60);
            }
            this.monitoring.trackEvent('search-analytics.event-recorded', {
                tenantId: event.tenantId,
                userId: event.userId,
                hasResults: event.hasResults,
                resultCount: event.resultCount,
            });
            return searchEvent;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.record-event',
                tenantId: event.tenantId,
            });
            // Don't throw - analytics recording is non-critical
            return searchEvent;
        }
    }
    /**
     * Record a user interaction with search results
     */
    async recordInteraction(event) {
        const queryHash = this.hashQuery(event.query, event.filters);
        const interaction = {
            ...event,
            queryHash,
        };
        try {
            // Store in Cosmos DB
            await this.interactionsContainer.items.upsert(interaction);
            // Update Redis metrics
            if (this.redis) {
                const interactionKey = `search:interaction:${event.tenantId}:${queryHash}`;
                if (event.interactionType === 'click') {
                    await this.redis.hincrby(interactionKey, 'clicks', 1);
                }
                else if (event.interactionType === 'view') {
                    await this.redis.hincrby(interactionKey, 'views', 1);
                }
                else if (event.interactionType === 'satisfaction' && event.satisfactionScore) {
                    await this.redis.hincrby(interactionKey, 'satisfactionTotal', event.satisfactionScore);
                    await this.redis.hincrby(interactionKey, 'satisfactionCount', 1);
                    await this.redis.hincrby(interactionKey, `satisfactionScore${event.satisfactionScore}`, 1);
                }
                await this.redis.hset(interactionKey, 'query', event.query);
                await this.redis.hset(interactionKey, 'lastInteraction', event.timestamp.toISOString());
                await this.redis.expire(interactionKey, this.RETENTION_DAYS * 24 * 60 * 60);
            }
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.record-interaction',
                tenantId: event.tenantId,
            });
            // Don't throw - interaction recording is non-critical
        }
    }
    /**
     * Get analytics for a specific query
     */
    async getQueryAnalytics(tenantId, query, filters) {
        const queryHash = this.hashQuery(query, filters);
        try {
            // Try Redis first
            if (this.redis) {
                const queryKey = `search:query:${tenantId}:${queryHash}`;
                const exists = await this.redis.exists(queryKey);
                if (exists) {
                    const data = await this.redis.hgetall(queryKey);
                    const count = parseInt(data.count || '0', 10);
                    if (count > 0) {
                        // Get zero result count
                        const zeroResultKey = `search:zero:${tenantId}:${queryHash}`;
                        const zeroCountRaw = await this.redis.zscore(zeroResultKey, query);
                        const zeroCount = zeroCountRaw ? parseFloat(zeroCountRaw.toString()) : 0;
                        return {
                            query: data.query || query,
                            queryHash,
                            totalSearches: count,
                            uniqueUsers: 0, // Would need separate tracking
                            averageResultCount: 0, // Would need aggregation
                            averageExecutionTime: 0, // Would need aggregation
                            zeroResultCount: Math.round(zeroCount),
                            zeroResultRate: count > 0 ? (Math.round(zeroCount) / count) * 100 : 0,
                            cacheHitRate: 0, // Would need separate tracking
                            lastSearched: new Date(data.lastSearched || Date.now()),
                            firstSearched: new Date(data.firstSearched || Date.now()),
                        };
                    }
                }
            }
            // Fallback to Cosmos DB
            const cosmosQuery = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.queryHash = @queryHash ORDER BY c.timestamp DESC',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@queryHash', value: queryHash },
                ],
            };
            const { resources } = await this.analyticsContainer.items.query(cosmosQuery).fetchAll();
            if (resources.length === 0) {
                return null;
            }
            const totalSearches = resources.length;
            const zeroResults = resources.filter(r => !r.hasResults).length;
            const totalResultCount = resources.reduce((sum, r) => sum + r.resultCount, 0);
            const totalExecutionTime = resources.reduce((sum, r) => sum + r.executionTimeMs, 0);
            const cacheHits = resources.filter(r => r.fromCache).length;
            return {
                query,
                queryHash,
                totalSearches,
                uniqueUsers: new Set(resources.map(r => r.userId)).size,
                averageResultCount: totalSearches > 0 ? totalResultCount / totalSearches : 0,
                averageExecutionTime: totalSearches > 0 ? totalExecutionTime / totalSearches : 0,
                zeroResultCount: zeroResults,
                zeroResultRate: totalSearches > 0 ? (zeroResults / totalSearches) * 100 : 0,
                cacheHitRate: totalSearches > 0 ? (cacheHits / totalSearches) * 100 : 0,
                lastSearched: resources[0].timestamp,
                firstSearched: resources[resources.length - 1].timestamp,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.get-query-analytics',
                tenantId,
                query,
            });
            return null;
        }
    }
    /**
     * Get zero-result queries
     */
    async getZeroResultQueries(request) {
        try {
            const startDate = request.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = request.endDate || new Date();
            const limit = request.limit || 50;
            const query = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.hasResults = false AND c.timestamp >= @startDate AND c.timestamp <= @endDate ORDER BY c.timestamp DESC',
                parameters: [
                    { name: '@tenantId', value: request.tenantId },
                    { name: '@startDate', value: startDate },
                    { name: '@endDate', value: endDate },
                ],
            };
            if (request.shardTypeId) {
                query.query = query.query.replace('ORDER BY', 'AND c.shardTypeId = @shardTypeId ORDER BY');
                query.parameters.push({ name: '@shardTypeId', value: request.shardTypeId });
            }
            const { resources } = await this.analyticsContainer.items.query(query).fetchAll();
            // Group by query hash
            const grouped = new Map();
            for (const event of resources) {
                const existing = grouped.get(event.queryHash) || [];
                existing.push(event);
                grouped.set(event.queryHash, existing);
            }
            // Convert to ZeroResultQuery
            const zeroResultQueries = Array.from(grouped.entries()).map(([queryHash, events]) => {
                const firstEvent = events[events.length - 1];
                const lastEvent = events[0];
                return {
                    query: firstEvent.query,
                    queryHash,
                    count: events.length,
                    lastSearched: lastEvent.timestamp,
                    firstSearched: firstEvent.timestamp,
                    uniqueUsers: new Set(events.map(e => e.userId)).size,
                    filters: firstEvent.filters,
                    shardTypeId: firstEvent.shardTypeId,
                    suggestedActions: this.generateSuggestions(firstEvent),
                };
            });
            // Sort by count descending
            zeroResultQueries.sort((a, b) => b.count - a.count);
            return zeroResultQueries.slice(0, limit);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.get-zero-result-queries',
                tenantId: request.tenantId,
            });
            return [];
        }
    }
    /**
     * Get satisfaction metrics
     */
    async getSatisfactionMetrics(tenantId, queryHash) {
        try {
            const query = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.interactionType IN (@satisfaction, @click, @view)',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@satisfaction', value: 'satisfaction' },
                    { name: '@click', value: 'click' },
                    { name: '@view', value: 'view' },
                ],
            };
            if (queryHash) {
                query.query += ' AND c.queryHash = @queryHash';
                query.parameters.push({ name: '@queryHash', value: queryHash });
            }
            const { resources } = await this.interactionsContainer.items.query(query).fetchAll();
            // Group by query hash
            const grouped = new Map();
            for (const event of resources) {
                const existing = grouped.get(event.queryHash) || [];
                existing.push(event);
                grouped.set(event.queryHash, existing);
            }
            // Convert to SatisfactionMetric
            const metrics = Array.from(grouped.entries()).map(([hash, events]) => {
                const clicks = events.filter(e => e.interactionType === 'click').length;
                const views = events.filter(e => e.interactionType === 'view').length;
                const satisfactionEvents = events.filter(e => e.interactionType === 'satisfaction' && e.satisfactionScore);
                const satisfactionScores = satisfactionEvents.map(e => e.satisfactionScore);
                const avgSatisfaction = satisfactionScores.length > 0
                    ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length
                    : 0;
                const distribution = {
                    score1: satisfactionScores.filter(s => s === 1).length,
                    score2: satisfactionScores.filter(s => s === 2).length,
                    score3: satisfactionScores.filter(s => s === 3).length,
                    score4: satisfactionScores.filter(s => s === 4).length,
                    score5: satisfactionScores.filter(s => s === 5).length,
                };
                const totalInteractions = clicks + views + satisfactionEvents.length;
                const clickThroughRate = views > 0 ? (clicks / views) * 100 : 0;
                // Get query from first event or fetch from analytics
                const firstEvent = events[0];
                const query = firstEvent?.query || '';
                return {
                    queryHash: hash,
                    query,
                    totalInteractions,
                    clicks,
                    views,
                    averageSatisfactionScore: avgSatisfaction,
                    clickThroughRate,
                    satisfactionDistribution: distribution,
                    lastInteraction: events[0].timestamp,
                };
            });
            return metrics;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.get-satisfaction-metrics',
                tenantId,
            });
            return [];
        }
    }
    /**
     * Get popular terms dashboard
     */
    async getPopularTermsDashboard(request) {
        const period = request.period || 'week';
        const endDate = request.endDate || new Date();
        const startDate = request.startDate || this.getStartDateForPeriod(endDate, period);
        try {
            // Get top queries from Redis or Cosmos DB
            const topQueries = await this.getTopQueries(request.tenantId, startDate, endDate, request.limit || 20);
            const topZeroResultQueries = await this.getTopZeroResultQueries(request.tenantId, startDate, endDate, request.limit || 10);
            const searchVolumeTrend = await this.getSearchVolumeTrend(request.tenantId, startDate, endDate);
            // Calculate aggregate metrics
            const metrics = await this.getAggregateMetrics(request.tenantId, startDate, endDate);
            return {
                period,
                startDate,
                endDate,
                topQueries,
                topZeroResultQueries,
                searchVolumeTrend,
                averageExecutionTime: metrics.averageExecutionTime,
                cacheHitRate: metrics.cacheHitRate,
                averageResultCount: metrics.averageResultCount,
                averageSatisfactionScore: metrics.averageSatisfactionScore,
                clickThroughRate: metrics.clickThroughRate,
                topFilters: metrics.topFilters,
                searchesByShardType: metrics.searchesByShardType,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'search-analytics.get-popular-terms-dashboard',
                tenantId: request.tenantId,
            });
            throw error;
        }
    }
    // =====================
    // Private Helper Methods
    // =====================
    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }
    getStartDateForPeriod(endDate, period) {
        const now = new Date(endDate);
        switch (period) {
            case 'day':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'month':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case 'all':
                return new Date(0);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    }
    generateSuggestions(event) {
        const suggestions = [];
        if (event.query.length < 3) {
            suggestions.push('Try using a longer, more specific query');
        }
        if (event.filters && Object.keys(event.filters).length > 0) {
            suggestions.push('Try removing some filters to broaden the search');
        }
        if (event.minScore && event.minScore > 0.5) {
            suggestions.push('Try lowering the minimum score threshold');
        }
        suggestions.push('Check spelling and try alternative keywords');
        suggestions.push('Try searching in a different shard type');
        return suggestions;
    }
    async getTopQueries(_tenantId, _startDate, _endDate, _limit) {
        // Implementation would query Cosmos DB or Redis
        // For now, return empty array
        return [];
    }
    async getTopZeroResultQueries(_tenantId, _startDate, _endDate, _limit) {
        // Implementation would query Cosmos DB or Redis
        // For now, return empty array
        return [];
    }
    async getSearchVolumeTrend(_tenantId, _startDate, _endDate) {
        // Implementation would query Cosmos DB or Redis
        // For now, return empty array
        return [];
    }
    async getAggregateMetrics(_tenantId, _startDate, _endDate) {
        // Implementation would aggregate from Cosmos DB
        // For now, return defaults
        return {
            averageExecutionTime: 0,
            cacheHitRate: 0,
            averageResultCount: 0,
        };
    }
}
//# sourceMappingURL=search-analytics.service.js.map