import { SearchOperator, resolveRelativeDate, } from '../types/advanced-search.types.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Advanced Search Service
 * Complex querying with facets, filters, and saved searches
 */
export class AdvancedSearchService {
    monitoring;
    shardContainer;
    shardRepository;
    shardEdgeRepository;
    redis;
    // Saved searches cache
    savedSearchesContainer;
    constructor(options) {
        this.monitoring = options.monitoring;
        this.shardContainer = options.shardContainer;
        this.shardRepository = options.shardRepository;
        this.shardEdgeRepository = options.shardEdgeRepository;
        this.redis = options.redis;
    }
    /**
     * Execute advanced search query
     */
    async search(query) {
        const startTime = Date.now();
        try {
            // Build the Cosmos DB query
            const cosmosQuery = this.buildCosmosQuery(query);
            // Execute query
            const { resources } = await this.shardContainer.items
                .query(cosmosQuery)
                .fetchAll();
            // Process results
            const items = resources.map(item => ({
                id: item.id,
                shardTypeId: item.shardTypeId,
                score: item._score,
                data: query.idsOnly ? undefined : item,
                highlights: query.highlight ? this.extractHighlights(item, query) : undefined,
            }));
            // Calculate facets if requested
            const facets = query.facets
                ? await this.calculateFacets(query, resources)
                : undefined;
            // Get total count if requested
            let total;
            if (query.includeTotal) {
                total = await this.getTotalCount(query);
            }
            const took = Date.now() - startTime;
            // Track analytics
            await this.trackSearchEvent({
                timestamp: new Date(),
                tenantId: query.tenantId,
                userId: query.createdBy || 'anonymous',
                query: query.query || '',
                filters: this.countFilters(query),
                resultCount: items.length,
                took,
            });
            this.monitoring.trackEvent('advancedSearch.executed', {
                tenantId: query.tenantId,
                resultCount: items.length,
                took,
                hasFacets: !!query.facets,
                hasFilters: !!query.filters,
            });
            return {
                items,
                total,
                maxScore: items.length > 0 ? Math.max(...items.map(i => i.score || 0)) : undefined,
                facets,
                took,
                query: query.explain ? query : undefined,
            };
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'advancedSearch.search',
                tenantId: query.tenantId,
            });
            throw error;
        }
    }
    /**
     * Build Cosmos DB query from advanced search query
     */
    buildCosmosQuery(query) {
        const conditions = [];
        const parameters = [];
        let paramIndex = 0;
        const addParam = (value) => {
            const name = `@p${paramIndex++}`;
            parameters.push({ name, value });
            return name;
        };
        // Tenant filter (required)
        conditions.push(`c.tenantId = ${addParam(query.tenantId)}`);
        // Shard type filter
        if (query.shardTypeIds && query.shardTypeIds.length > 0) {
            conditions.push(`c.shardTypeId IN (${query.shardTypeIds.map(id => addParam(id)).join(', ')})`);
        }
        // Status filter
        if (query.statuses && query.statuses.length > 0) {
            conditions.push(`c.status IN (${query.statuses.map(s => addParam(s)).join(', ')})`);
        }
        // Tags filter
        if (query.tags && query.tags.length > 0) {
            for (const tag of query.tags) {
                conditions.push(`ARRAY_CONTAINS(c.tags, ${addParam(tag)})`);
            }
        }
        // Created by filter
        if (query.createdBy) {
            conditions.push(`c.createdBy = ${addParam(query.createdBy)}`);
        }
        // Date filters
        if (query.createdAfter) {
            conditions.push(`c.createdAt >= ${addParam(query.createdAfter.toISOString())}`);
        }
        if (query.createdBefore) {
            conditions.push(`c.createdAt <= ${addParam(query.createdBefore.toISOString())}`);
        }
        if (query.updatedAfter) {
            conditions.push(`c.updatedAt >= ${addParam(query.updatedAfter.toISOString())}`);
        }
        if (query.updatedBefore) {
            conditions.push(`c.updatedAt <= ${addParam(query.updatedBefore.toISOString())}`);
        }
        // Free text search
        if (query.query) {
            const searchFields = query.queryFields || ['structuredData.name', 'structuredData.description', 'content'];
            // Validate field names to prevent injection - only allow alphanumeric, dots, underscores
            const validFields = searchFields.filter(field => {
                if (typeof field !== 'string') {
                    return false;
                }
                // Allow field names with dots for nested fields (e.g., structuredData.name)
                return /^[a-zA-Z0-9_.]+$/.test(field);
            });
            if (validFields.length > 0) {
                const textConditions = validFields.map(field => `CONTAINS(LOWER(c.${field}), ${addParam(query.query.toLowerCase())})`);
                conditions.push(`(${textConditions.join(' OR ')})`);
            }
        }
        // Structured filters
        if (query.filters && query.filters.conditions.length > 0) {
            const filterSql = this.buildConditionGroupSql(query.filters, addParam);
            if (filterSql) {
                conditions.push(filterSql);
            }
        }
        // Build SELECT clause
        let selectClause = 'c';
        if (query.idsOnly) {
            selectClause = 'c.id, c.shardTypeId';
        }
        else if (query.fields && query.fields.length > 0) {
            // Validate field names to prevent SQL injection
            const validFields = query.fields.filter(f => {
                if (typeof f !== 'string') {
                    return false;
                }
                return /^[a-zA-Z0-9_.]+$/.test(f);
            });
            if (validFields.length > 0) {
                selectClause = ['c.id', 'c.shardTypeId', ...validFields.map(f => `c.${f}`)].join(', ');
            }
        }
        // Build ORDER BY clause
        let orderByClause = '';
        if (query.sort && query.sort.length > 0) {
            // Validate sort field names to prevent SQL injection
            const validSorts = query.sort.filter(s => {
                if (!s || typeof s.field !== 'string') {
                    return false;
                }
                return /^[a-zA-Z0-9_.]+$/.test(s.field);
            });
            if (validSorts.length > 0) {
                const sortClauses = validSorts.map(s => `c.${s.field} ${s.order.toUpperCase()}`);
                orderByClause = ` ORDER BY ${sortClauses.join(', ')}`;
            }
        }
        else {
            orderByClause = ' ORDER BY c.createdAt DESC';
        }
        // Build OFFSET/LIMIT clause
        const offset = query.offset || 0;
        const limit = Math.min(query.limit || 50, 1000);
        const paginationClause = ` OFFSET ${offset} LIMIT ${limit}`;
        const sql = `SELECT ${selectClause} FROM c WHERE ${conditions.join(' AND ')}${orderByClause}${paginationClause}`;
        return {
            query: sql,
            parameters,
        };
    }
    /**
     * Build SQL for condition group
     */
    buildConditionGroupSql(group, addParam) {
        const parts = [];
        for (const condition of group.conditions) {
            if ('logic' in condition) {
                // Nested group
                const nestedSql = this.buildConditionGroupSql(condition, addParam);
                if (nestedSql) {
                    parts.push(`(${nestedSql})`);
                }
            }
            else {
                // Single condition
                const conditionSql = this.buildConditionSql(condition, addParam);
                if (conditionSql) {
                    parts.push(conditionSql);
                }
            }
        }
        if (parts.length === 0) {
            return '';
        }
        const operator = group.logic === 'NOT' ? 'AND NOT' : group.logic;
        return parts.join(` ${operator} `);
    }
    /**
     * Build SQL for single condition
     */
    buildConditionSql(condition, addParam) {
        const field = `c.structuredData.${condition.field}`;
        const value = condition.value;
        switch (condition.operator) {
            case SearchOperator.EQUALS:
                return `${field} = ${addParam(value)}`;
            case SearchOperator.NOT_EQUALS:
                return `${field} != ${addParam(value)}`;
            case SearchOperator.GREATER_THAN:
                return `${field} > ${addParam(value)}`;
            case SearchOperator.GREATER_OR_EQUAL:
                return `${field} >= ${addParam(value)}`;
            case SearchOperator.LESS_THAN:
                return `${field} < ${addParam(value)}`;
            case SearchOperator.LESS_OR_EQUAL:
                return `${field} <= ${addParam(value)}`;
            case SearchOperator.BETWEEN:
                if (Array.isArray(value) && value.length === 2) {
                    return `${field} >= ${addParam(value[0])} AND ${field} <= ${addParam(value[1])}`;
                }
                return '';
            case SearchOperator.CONTAINS:
                return condition.caseSensitive
                    ? `CONTAINS(${field}, ${addParam(value)})`
                    : `CONTAINS(LOWER(${field}), ${addParam(String(value).toLowerCase())})`;
            case SearchOperator.NOT_CONTAINS:
                return condition.caseSensitive
                    ? `NOT CONTAINS(${field}, ${addParam(value)})`
                    : `NOT CONTAINS(LOWER(${field}), ${addParam(String(value).toLowerCase())})`;
            case SearchOperator.STARTS_WITH:
                return condition.caseSensitive
                    ? `STARTSWITH(${field}, ${addParam(value)})`
                    : `STARTSWITH(LOWER(${field}), ${addParam(String(value).toLowerCase())})`;
            case SearchOperator.ENDS_WITH:
                return condition.caseSensitive
                    ? `ENDSWITH(${field}, ${addParam(value)})`
                    : `ENDSWITH(LOWER(${field}), ${addParam(String(value).toLowerCase())})`;
            case SearchOperator.IN:
                if (Array.isArray(value)) {
                    return `${field} IN (${value.map(v => addParam(v)).join(', ')})`;
                }
                return '';
            case SearchOperator.NOT_IN:
                if (Array.isArray(value)) {
                    return `${field} NOT IN (${value.map(v => addParam(v)).join(', ')})`;
                }
                return '';
            case SearchOperator.EXISTS:
                return `IS_DEFINED(${field})`;
            case SearchOperator.NOT_EXISTS:
                return `NOT IS_DEFINED(${field})`;
            case SearchOperator.IS_NULL:
                return `${field} = null`;
            case SearchOperator.IS_NOT_NULL:
                return `${field} != null`;
            case SearchOperator.IS_EMPTY:
                return `(${field} = '' OR ${field} = null OR ARRAY_LENGTH(${field}) = 0)`;
            case SearchOperator.IS_NOT_EMPTY:
                return `(${field} != '' AND ${field} != null)`;
            case SearchOperator.DATE_BEFORE:
                return `${field} < ${addParam(new Date(value).toISOString())}`;
            case SearchOperator.DATE_AFTER:
                return `${field} > ${addParam(new Date(value).toISOString())}`;
            case SearchOperator.DATE_RANGE:
                if (Array.isArray(value) && value.length === 2) {
                    return `${field} >= ${addParam(new Date(value[0]).toISOString())} AND ${field} <= ${addParam(new Date(value[1]).toISOString())}`;
                }
                return '';
            case SearchOperator.DATE_RELATIVE:
                const { from, to } = resolveRelativeDate(value);
                return `${field} >= ${addParam(from.toISOString())} AND ${field} <= ${addParam(to.toISOString())}`;
            default:
                return '';
        }
    }
    /**
     * Calculate facets from results
     */
    async calculateFacets(query, results) {
        if (!query.facets) {
            return [];
        }
        if (!Array.isArray(results)) {
            return [];
        }
        return query.facets.map(facetReq => this.calculateFacet(facetReq, results));
    }
    /**
     * Calculate a single facet
     */
    calculateFacet(facetReq, results) {
        const bucketMap = new Map();
        let missingCount = 0;
        // Extract values and count
        for (const item of results) {
            const value = this.getNestedValue(item.structuredData || {}, facetReq.field);
            if (value === undefined || value === null) {
                missingCount++;
                if (facetReq.includeMissing) {
                    bucketMap.set(null, (bucketMap.get(null) || 0) + 1);
                }
            }
            else if (Array.isArray(value)) {
                // Handle array values
                for (const v of value) {
                    bucketMap.set(v, (bucketMap.get(v) || 0) + 1);
                }
            }
            else {
                bucketMap.set(value, (bucketMap.get(value) || 0) + 1);
            }
        }
        // Convert to buckets
        let buckets = Array.from(bucketMap.entries()).map(([key, count]) => ({
            key,
            count,
            label: key === null ? 'Missing' : String(key),
        }));
        // Sort buckets
        switch (facetReq.sort) {
            case 'count':
                buckets.sort((a, b) => b.count - a.count);
                break;
            case 'alpha':
                buckets.sort((a, b) => String(a.key).localeCompare(String(b.key)));
                break;
            case 'value':
            default:
                buckets.sort((a, b) => {
                    if (typeof a.key === 'number' && typeof b.key === 'number') {
                        return a.key - b.key;
                    }
                    return String(a.key).localeCompare(String(b.key));
                });
        }
        // Limit buckets
        const totalBuckets = buckets.length;
        let otherCount = 0;
        if (facetReq.size && buckets.length > facetReq.size) {
            const removed = buckets.slice(facetReq.size);
            otherCount = removed.reduce((sum, b) => sum + b.count, 0);
            buckets = buckets.slice(0, facetReq.size);
        }
        return {
            field: facetReq.field,
            type: facetReq.type,
            buckets,
            totalBuckets,
            otherCount: otherCount > 0 ? otherCount : undefined,
            missingCount: missingCount > 0 ? missingCount : undefined,
        };
    }
    /**
     * Get total count for query
     */
    async getTotalCount(query) {
        const countQuery = this.buildCosmosQuery({
            ...query,
            offset: 0,
            limit: 1,
            idsOnly: true,
            sort: undefined,
        });
        // Modify query to get count
        const countSql = countQuery.query
            .replace(/SELECT.*?FROM/, 'SELECT VALUE COUNT(1) FROM')
            .replace(/ORDER BY.*$/, '')
            .replace(/OFFSET.*$/, '');
        const { resources } = await this.shardContainer.items
            .query({ query: countSql, parameters: countQuery.parameters })
            .fetchAll();
        return resources[0] || 0;
    }
    /**
     * Extract highlights from result
     */
    extractHighlights(item, query) {
        if (!query.highlight || !query.query) {
            return undefined;
        }
        const highlights = [];
        const searchTerm = query.query.toLowerCase();
        const preTag = query.highlight.preTag || '<mark>';
        const postTag = query.highlight.postTag || '</mark>';
        const fragmentSize = query.highlight.fragmentSize || 150;
        for (const field of query.highlight.fields) {
            const value = this.getNestedValue(item, field);
            if (!value || typeof value !== 'string') {
                continue;
            }
            const lowerValue = value.toLowerCase();
            const index = lowerValue.indexOf(searchTerm);
            if (index === -1) {
                continue;
            }
            // Extract fragment around match
            const start = Math.max(0, index - fragmentSize / 2);
            const end = Math.min(value.length, index + searchTerm.length + fragmentSize / 2);
            let fragment = value.substring(start, end);
            // Add ellipsis if truncated
            if (start > 0) {
                fragment = '...' + fragment;
            }
            if (end < value.length) {
                fragment = fragment + '...';
            }
            // Highlight match
            fragment = fragment.replace(new RegExp(searchTerm, 'gi'), match => `${preTag}${match}${postTag}`);
            highlights.push({ field, fragments: [fragment] });
        }
        return highlights.length > 0 ? highlights : undefined;
    }
    /**
     * Count filters in query
     */
    countFilters(query) {
        let count = 0;
        if (query.shardTypeIds?.length) {
            count++;
        }
        if (query.statuses?.length) {
            count++;
        }
        if (query.tags?.length) {
            count++;
        }
        if (query.createdBy) {
            count++;
        }
        if (query.createdAfter) {
            count++;
        }
        if (query.createdBefore) {
            count++;
        }
        if (query.filters) {
            count += this.countConditions(query.filters);
        }
        return count;
    }
    /**
     * Count conditions in group
     */
    countConditions(group) {
        let count = 0;
        for (const condition of group.conditions) {
            if ('logic' in condition) {
                count += this.countConditions(condition);
            }
            else {
                count++;
            }
        }
        return count;
    }
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    // =====================
    // Saved Searches
    // =====================
    /**
     * Create a saved search
     */
    async createSavedSearch(input) {
        const savedSearch = {
            id: uuidv4(),
            ...input,
            visibility: input.visibility || 'private',
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
        };
        // Store in cache for now (would be stored in DB)
        if (this.redis) {
            await this.redis.hset(`savedSearches:${input.tenantId}`, savedSearch.id, JSON.stringify(savedSearch));
        }
        return savedSearch;
    }
    /**
     * Update a saved search
     */
    async updateSavedSearch(id, tenantId, input) {
        const existing = await this.getSavedSearch(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
        };
        if (this.redis) {
            await this.redis.hset(`savedSearches:${tenantId}`, id, JSON.stringify(updated));
        }
        return updated;
    }
    /**
     * Get a saved search
     */
    async getSavedSearch(id, tenantId) {
        if (this.redis) {
            const data = await this.redis.hget(`savedSearches:${tenantId}`, id);
            if (data) {
                return JSON.parse(data);
            }
        }
        return null;
    }
    /**
     * List saved searches
     */
    async listSavedSearches(tenantId, userId, options = {}) {
        const searches = [];
        if (this.redis) {
            const all = await this.redis.hgetall(`savedSearches:${tenantId}`);
            for (const data of Object.values(all)) {
                const search = JSON.parse(data);
                // Filter by visibility
                if (search.visibility === 'private' && search.createdBy !== userId) {
                    continue;
                }
                if (search.visibility === 'team' && !search.sharedWith?.includes(userId)) {
                    continue;
                }
                if (options.visibility && search.visibility !== options.visibility) {
                    continue;
                }
                searches.push(search);
            }
        }
        // Sort by last used
        searches.sort((a, b) => {
            if (a.isPinned && !b.isPinned) {
                return -1;
            }
            if (!a.isPinned && b.isPinned) {
                return 1;
            }
            return (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0);
        });
        return searches.slice(0, options.limit || 50);
    }
    /**
     * Delete a saved search
     */
    async deleteSavedSearch(id, tenantId) {
        if (this.redis) {
            const deleted = await this.redis.hdel(`savedSearches:${tenantId}`, id);
            return deleted > 0;
        }
        return false;
    }
    /**
     * Execute a saved search
     */
    async executeSavedSearch(id, tenantId, overrides) {
        const savedSearch = await this.getSavedSearch(id, tenantId);
        if (!savedSearch) {
            throw new Error(`Saved search not found: ${id}`);
        }
        // Update usage stats
        savedSearch.usageCount++;
        savedSearch.lastUsedAt = new Date();
        await this.updateSavedSearch(id, tenantId, {
            usageCount: savedSearch.usageCount,
        });
        // Execute with overrides
        return this.search({
            ...savedSearch.query,
            ...overrides,
            tenantId,
        });
    }
    // =====================
    // Analytics
    // =====================
    /**
     * Track search event
     */
    async trackSearchEvent(event) {
        if (this.redis) {
            // Store in Redis sorted set by timestamp
            const key = `searchAnalytics:${event.tenantId}`;
            await this.redis.zadd(key, event.timestamp.getTime(), JSON.stringify(event));
            // Trim to last 10000 events
            await this.redis.zremrangebyrank(key, 0, -10001);
            // Track popular terms
            if (event.query) {
                await this.redis.zincrby(`popularTerms:${event.tenantId}`, 1, event.query.toLowerCase());
            }
        }
    }
    /**
     * Get popular search terms
     */
    async getPopularSearchTerms(tenantId, limit = 10) {
        if (!this.redis) {
            return [];
        }
        const terms = await this.redis.zrevrange(`popularTerms:${tenantId}`, 0, limit - 1, 'WITHSCORES');
        const result = [];
        for (let i = 0; i < terms.length; i += 2) {
            result.push({
                term: terms[i],
                count: parseInt(terms[i + 1], 10),
                avgResults: 0, // Would need to track this separately
                lastSearched: new Date(),
            });
        }
        return result;
    }
}
//# sourceMappingURL=advanced-search.service.js.map