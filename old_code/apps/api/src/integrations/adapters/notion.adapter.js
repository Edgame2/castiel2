/**
 * Notion Integration Adapter
 * Connects to Notion API for syncing databases, pages, and blocks
 */
import { BaseIntegrationAdapter, adapterRegistry, } from '../base-adapter.js';
import { IntegrationCategory, } from '../../types/integration.types.js';
// ============================================
// Notion API Types
// ============================================
/**
 * Notion API version header
 */
const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
// ============================================
// Notion Adapter Implementation
// ============================================
/**
 * Notion Integration Adapter
 */
export class NotionAdapter extends BaseIntegrationAdapter {
    constructor(monitoring, connectionService, tenantId, connectionId) {
        super(monitoring, connectionService, 'notion', tenantId, connectionId);
    }
    /**
     * Get Notion integration definition
     */
    getDefinition() {
        return NOTION_DEFINITION;
    }
    /**
     * Make Notion API request with proper headers
     */
    async makeNotionRequest(endpoint, options = {}) {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            return { error: 'No access token available', status: 401 };
        }
        const url = endpoint.startsWith('http') ? endpoint : `${NOTION_API_BASE}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': NOTION_API_VERSION,
                    ...options.headers,
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || `HTTP ${response.status}`;
                this.monitoring.trackEvent('notion.request.failed', {
                    integrationId: this.integrationId,
                    status: response.status,
                    endpoint,
                    error: errorMessage,
                });
                return { error: errorMessage, status: response.status };
            }
            // Handle 204 No Content
            if (response.status === 204) {
                return { data: undefined, status: response.status };
            }
            const data = await response.json();
            return { data, status: response.status };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'notion.makeRequest',
                integrationId: this.integrationId,
                endpoint,
            });
            return { error: error.message, status: 500 };
        }
    }
    /**
     * Get current authenticated user's profile
     */
    async getUserProfile() {
        try {
            const result = await this.makeNotionRequest('/users/me');
            if (result.error || !result.data) {
                throw new Error(result.error || 'Failed to get user profile');
            }
            const user = result.data;
            return {
                id: user.id,
                email: user.person?.email,
                name: user.name,
                type: user.type,
                avatarUrl: user.avatar_url,
                isBot: user.type === 'bot',
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'notion.getUserProfile',
                tenantId: this.tenantId,
            });
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }
    /**
     * Test Notion connection
     */
    async testConnection() {
        const result = await this.makeNotionRequest('/users/me');
        if (result.error) {
            return { success: false, error: result.error };
        }
        const user = result.data;
        // Get workspace info via search
        const searchResult = await this.makeNotionRequest('/search', {
            method: 'POST',
            body: JSON.stringify({ page_size: 1 }),
        });
        return {
            success: true,
            details: {
                botId: user.id,
                botName: user.name,
                type: user.type,
                hasWorkspaceAccess: !searchResult.error,
            },
        };
    }
    /**
     * Fetch records from Notion
     */
    async fetch(options) {
        const { entity } = options;
        switch (entity) {
            case 'database':
                return this.fetchDatabases(options);
            case 'page':
                return this.fetchPages(options);
            case 'block':
                return this.fetchBlocks(options);
            default:
                // Assume it's a database ID - fetch pages from that database
                if (entity.match(/^[a-f0-9-]{32,36}$/i)) {
                    return this.fetchDatabasePages(entity, options);
                }
                return { records: [], hasMore: false };
        }
    }
    /**
     * Fetch all databases accessible to the integration
     */
    async fetchDatabases(options) {
        const { limit = 100 } = options;
        const cursor = options.filters?.cursor;
        const result = await this.makeNotionRequest('/search', {
            method: 'POST',
            body: JSON.stringify({
                filter: { property: 'object', value: 'database' },
                page_size: Math.min(limit, 100),
                start_cursor: cursor,
            }),
        });
        if (result.error) {
            this.monitoring.trackEvent('notion.fetch.databases.error', {
                error: result.error,
            });
            return { records: [], hasMore: false };
        }
        const data = result.data;
        const databases = data.results;
        return {
            records: databases.map(db => this.normalizeDatabaseRecord(db)),
            total: undefined, // Notion doesn't provide total count
            hasMore: data.has_more,
            cursor: data.next_cursor || undefined,
        };
    }
    /**
     * Fetch all pages accessible to the integration
     */
    async fetchPages(options) {
        const { limit = 100, filters } = options;
        const cursor = filters?.cursor;
        const searchBody = {
            filter: { property: 'object', value: 'page' },
            page_size: Math.min(limit, 100),
        };
        if (cursor) {
            searchBody.start_cursor = cursor;
        }
        // Add query if provided
        if (filters?.query) {
            searchBody.query = filters.query;
        }
        const result = await this.makeNotionRequest('/search', {
            method: 'POST',
            body: JSON.stringify(searchBody),
        });
        if (result.error) {
            this.monitoring.trackEvent('notion.fetch.pages.error', {
                error: result.error,
            });
            return { records: [], hasMore: false };
        }
        const data = result.data;
        const pages = data.results;
        return {
            records: pages.map(page => this.normalizePageRecord(page)),
            hasMore: data.has_more,
            cursor: data.next_cursor || undefined,
        };
    }
    /**
     * Fetch pages from a specific database
     */
    async fetchDatabasePages(databaseId, options) {
        const { limit = 100, filters, modifiedSince, orderBy, orderDirection } = options;
        const cursor = filters?.cursor;
        const queryBody = {
            page_size: Math.min(limit, 100),
        };
        if (cursor) {
            queryBody.start_cursor = cursor;
        }
        // Build filter
        if (filters || modifiedSince) {
            queryBody.filter = this.buildNotionFilter(filters, modifiedSince);
        }
        // Build sorts
        if (orderBy) {
            queryBody.sorts = [{
                    property: orderBy,
                    direction: orderDirection === 'desc' ? 'descending' : 'ascending',
                }];
        }
        const result = await this.makeNotionRequest(`/databases/${databaseId}/query`, {
            method: 'POST',
            body: JSON.stringify(queryBody),
        });
        if (result.error) {
            this.monitoring.trackEvent('notion.fetch.databasePages.error', {
                databaseId,
                error: result.error,
            });
            return { records: [], hasMore: false };
        }
        const data = result.data;
        return {
            records: data.results.map(page => this.normalizePageRecord(page)),
            hasMore: data.has_more,
            cursor: data.next_cursor || undefined,
        };
    }
    /**
     * Fetch blocks (children) of a page or block
     */
    async fetchBlocks(options) {
        const { filters, limit = 100 } = options;
        const parentId = filters?.parentId;
        const cursor = filters?.cursor;
        if (!parentId) {
            return { records: [], hasMore: false };
        }
        const params = new URLSearchParams();
        params.set('page_size', String(Math.min(limit, 100)));
        if (cursor) {
            params.set('start_cursor', cursor);
        }
        const result = await this.makeNotionRequest(`/blocks/${parentId}/children?${params.toString()}`);
        if (result.error) {
            this.monitoring.trackEvent('notion.fetch.blocks.error', {
                parentId,
                error: result.error,
            });
            return { records: [], hasMore: false };
        }
        const data = result.data;
        return {
            records: data.results.map(block => this.normalizeBlockRecord(block)),
            hasMore: data.has_more,
            cursor: data.next_cursor || undefined,
        };
    }
    /**
     * Push record to Notion
     */
    async push(data, options) {
        const { entity, operation } = options;
        switch (entity) {
            case 'page':
                return this.pushPage(data, operation);
            case 'block':
                return this.pushBlock(data, operation);
            case 'database':
                return this.pushDatabase(data, operation);
            default:
                // Assume entity is a database ID - create page in that database
                if (entity.match(/^[a-f0-9-]{32,36}$/i)) {
                    return this.pushPageToDatabase(entity, data, operation);
                }
                return { success: false, error: `Unknown entity: ${entity}` };
        }
    }
    /**
     * Create or update a page
     */
    async pushPage(data, operation) {
        if (operation === 'delete') {
            if (!data.id) {
                return { success: false, error: 'Page ID required for delete' };
            }
            return this.archivePage(data.id);
        }
        if (operation === 'update' || (operation === 'upsert' && data.id)) {
            if (!data.id) {
                return { success: false, error: 'Page ID required for update' };
            }
            return this.updatePage(data.id, data);
        }
        // Create new page
        return this.createPage(data);
    }
    /**
     * Create a new page
     */
    async createPage(data) {
        const { parentId, parentType, title, icon, cover, properties, children } = data;
        if (!parentId) {
            return { success: false, error: 'parentId required to create page' };
        }
        const body = {
            parent: parentType === 'database'
                ? { database_id: parentId }
                : { page_id: parentId },
        };
        // Set properties
        if (properties) {
            body.properties = this.convertToNotionProperties(properties);
        }
        else if (title) {
            body.properties = {
                title: {
                    title: [{ text: { content: title } }],
                },
            };
        }
        // Set icon
        if (icon) {
            body.icon = typeof icon === 'string'
                ? { type: 'emoji', emoji: icon }
                : icon;
        }
        // Set cover
        if (cover) {
            body.cover = typeof cover === 'string'
                ? { type: 'external', external: { url: cover } }
                : cover;
        }
        // Set initial content blocks
        if (children && Array.isArray(children)) {
            body.children = children.map(block => this.convertToNotionBlock(block));
        }
        const result = await this.makeNotionRequest('/pages', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            externalId: result.data.id,
        };
    }
    /**
     * Update an existing page
     */
    async updatePage(pageId, data) {
        const { properties, icon, cover, archived } = data;
        const body = {};
        if (properties) {
            body.properties = this.convertToNotionProperties(properties);
        }
        if (icon !== undefined) {
            body.icon = icon ? (typeof icon === 'string' ? { type: 'emoji', emoji: icon } : icon) : null;
        }
        if (cover !== undefined) {
            body.cover = cover ? (typeof cover === 'string' ? { type: 'external', external: { url: cover } } : cover) : null;
        }
        if (archived !== undefined) {
            body.archived = archived;
        }
        const result = await this.makeNotionRequest(`/pages/${pageId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            externalId: result.data.id,
        };
    }
    /**
     * Archive (soft delete) a page
     */
    async archivePage(pageId) {
        const result = await this.makeNotionRequest(`/pages/${pageId}`, {
            method: 'PATCH',
            body: JSON.stringify({ archived: true }),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return { success: true, externalId: pageId };
    }
    /**
     * Create a page in a specific database
     */
    async pushPageToDatabase(databaseId, data, operation) {
        if (operation === 'create') {
            return this.createPage({
                ...data,
                parentId: databaseId,
                parentType: 'database',
            });
        }
        if (operation === 'update' || operation === 'upsert') {
            if (data.id) {
                return this.updatePage(data.id, data);
            }
            // Upsert without ID = create
            return this.createPage({
                ...data,
                parentId: databaseId,
                parentType: 'database',
            });
        }
        if (operation === 'delete' && data.id) {
            return this.archivePage(data.id);
        }
        return { success: false, error: `Unsupported operation: ${operation}` };
    }
    /**
     * Push block operations
     */
    async pushBlock(data, operation) {
        const { parentId, id } = data;
        if (operation === 'delete') {
            if (!id) {
                return { success: false, error: 'Block ID required for delete' };
            }
            return this.deleteBlock(id);
        }
        if (operation === 'update') {
            if (!id) {
                return { success: false, error: 'Block ID required for update' };
            }
            return this.updateBlock(id, data);
        }
        // Create - append block to parent
        if (!parentId) {
            return { success: false, error: 'parentId required to create block' };
        }
        return this.appendBlocks(parentId, [data]);
    }
    /**
     * Append blocks to a page or block
     */
    async appendBlocks(parentId, blocks) {
        const result = await this.makeNotionRequest(`/blocks/${parentId}/children`, {
            method: 'PATCH',
            body: JSON.stringify({
                children: blocks.map(block => this.convertToNotionBlock(block)),
            }),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            externalId: result.data.results[0]?.id,
            details: { blockIds: result.data.results.map(b => b.id) },
        };
    }
    /**
     * Update a block
     */
    async updateBlock(blockId, data) {
        const block = this.convertToNotionBlock(data);
        const result = await this.makeNotionRequest(`/blocks/${blockId}`, {
            method: 'PATCH',
            body: JSON.stringify(block),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return { success: true, externalId: result.data.id };
    }
    /**
     * Delete a block
     */
    async deleteBlock(blockId) {
        const result = await this.makeNotionRequest(`/blocks/${blockId}`, {
            method: 'DELETE',
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return { success: true, externalId: blockId };
    }
    /**
     * Create or update a database
     */
    async pushDatabase(data, operation) {
        if (operation === 'update' && data.id) {
            return this.updateDatabase(data.id, data);
        }
        if (operation === 'create') {
            return this.createDatabase(data);
        }
        return { success: false, error: 'Database delete not supported via API' };
    }
    /**
     * Create a database
     */
    async createDatabase(data) {
        const { parentId, title, properties, icon, cover } = data;
        if (!parentId) {
            return { success: false, error: 'parentId required to create database' };
        }
        const body = {
            parent: { page_id: parentId },
            title: [{ text: { content: title || 'Untitled' } }],
            properties: this.convertToDatabaseProperties(properties || { Name: { title: {} } }),
        };
        if (icon) {
            body.icon = typeof icon === 'string' ? { type: 'emoji', emoji: icon } : icon;
        }
        if (cover) {
            body.cover = typeof cover === 'string' ? { type: 'external', external: { url: cover } } : cover;
        }
        const result = await this.makeNotionRequest('/databases', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return { success: true, externalId: result.data.id };
    }
    /**
     * Update a database
     */
    async updateDatabase(databaseId, data) {
        const { title, properties, icon, cover, archived } = data;
        const body = {};
        if (title) {
            body.title = [{ text: { content: title } }];
        }
        if (properties) {
            body.properties = this.convertToDatabaseProperties(properties);
        }
        if (icon !== undefined) {
            body.icon = icon ? (typeof icon === 'string' ? { type: 'emoji', emoji: icon } : icon) : null;
        }
        if (cover !== undefined) {
            body.cover = cover ? (typeof cover === 'string' ? { type: 'external', external: { url: cover } } : cover) : null;
        }
        if (archived !== undefined) {
            body.archived = archived;
        }
        const result = await this.makeNotionRequest(`/databases/${databaseId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        if (result.error) {
            return { success: false, error: result.error };
        }
        return { success: true, externalId: result.data.id };
    }
    /**
     * Get entity schema - for databases, fetch the actual schema
     */
    async getEntitySchema(entityName) {
        // Check if it's a known entity type
        const knownEntity = NOTION_ENTITIES.find(e => e.name === entityName);
        if (knownEntity) {
            return knownEntity;
        }
        // Check if it's a database ID - fetch its schema
        if (entityName.match(/^[a-f0-9-]{32,36}$/i)) {
            return this.getDatabaseSchema(entityName);
        }
        return null;
    }
    /**
     * Get database schema from Notion
     */
    async getDatabaseSchema(databaseId) {
        const result = await this.makeNotionRequest(`/databases/${databaseId}`);
        if (result.error) {
            return null;
        }
        const db = result.data;
        const fields = [];
        // Convert Notion properties to our field format
        for (const [name, prop] of Object.entries(db.properties)) {
            fields.push({
                name,
                displayName: name,
                type: this.mapNotionPropertyType(prop.type),
                required: prop.type === 'title', // Title is always required
                readOnly: false,
                description: `Notion ${prop.type} property`,
            });
        }
        return {
            name: databaseId,
            displayName: this.extractPlainText(db.title) || 'Untitled Database',
            description: this.extractPlainText(db.description) || undefined,
            fields,
            supportsPull: true,
            supportsPush: true,
            supportsDelete: true,
            supportsWebhook: false, // Notion doesn't have webhooks
            idField: 'id',
            modifiedField: 'last_edited_time',
        };
    }
    /**
     * Search across Notion pages and databases
     */
    async search(options) {
        const startTime = Date.now();
        const { query, limit = 20, offset = 0, filters, userId } = options;
        // Notion search API searches across pages and databases
        const searchBody = {
            query,
            page_size: limit,
            start_cursor: offset > 0 ? undefined : undefined, // Notion uses cursor-based pagination
        };
        // Apply filters if provided
        const entityTypes = filters?.customFilters?.entityTypes || filters?.entityTypes;
        if (entityTypes && Array.isArray(entityTypes) && entityTypes.length > 0) {
            searchBody.filter = {
                property: 'object',
                value: entityTypes[0], // Notion search supports one object type at a time
            };
        }
        else {
            // Default: search both pages and databases
            searchBody.filter = {
                property: 'object',
                or: [
                    { property: 'object', value: 'page' },
                    { property: 'object', value: 'database' },
                ],
            };
        }
        // Execute Notion search
        const result = await this.makeNotionRequest('/search', {
            method: 'POST',
            body: JSON.stringify(searchBody),
        });
        if (result.error || !result.data) {
            return {
                results: [],
                total: 0,
                took: Date.now() - startTime,
                hasMore: false,
            };
        }
        // Transform Notion results to SearchResultItem
        const searchResults = result.data.results
            .slice(0, limit)
            .map((item) => {
            const entityType = item.object; // 'page' or 'database'
            const title = this.extractNotionTitle(item);
            const description = this.extractNotionDescription(item);
            const url = item.url || `https://notion.so/${item.id.replace(/-/g, '')}`;
            // Calculate relevance score
            const score = this.calculateNotionRelevanceScore(query, item);
            // Extract highlights
            const highlights = this.extractNotionHighlights(query, item);
            return {
                id: item.id,
                entity: entityType,
                title,
                description,
                url,
                score,
                highlights,
                metadata: {
                    object: entityType,
                    created_time: item.created_time,
                    last_edited_time: item.last_edited_time,
                    parent: item.parent,
                },
                integrationId: this.integrationId,
                integrationName: '', // Will be set by search service
                providerName: 'notion',
            };
        });
        return {
            results: searchResults,
            total: result.data.results.length,
            took: Date.now() - startTime,
            hasMore: !!result.data.next_cursor,
        };
    }
    /**
     * Extract title from Notion object
     */
    extractNotionTitle(item) {
        if (item.object === 'page') {
            // Page title is in properties.title or properties.Name
            const titleProp = item.properties?.title || item.properties?.Name;
            if (titleProp?.title) {
                return titleProp.title.map((t) => t.plain_text).join('');
            }
            return 'Untitled';
        }
        else if (item.object === 'database') {
            // Database title is in title array
            if (item.title && Array.isArray(item.title)) {
                return item.title.map((t) => t.plain_text).join('');
            }
            return 'Untitled Database';
        }
        return 'Untitled';
    }
    /**
     * Extract description from Notion object
     */
    extractNotionDescription(item) {
        if (item.object === 'page') {
            // Try to get description from properties
            const descProp = item.properties?.Description || item.properties?.description;
            if (descProp?.rich_text) {
                return descProp.rich_text.map((t) => t.plain_text).join(' ');
            }
            return `Page last edited ${new Date(item.last_edited_time).toLocaleDateString()}`;
        }
        else if (item.object === 'database') {
            return `Database with ${item.properties ? Object.keys(item.properties).length : 0} properties`;
        }
        return '';
    }
    /**
     * Calculate relevance score for Notion search result
     */
    calculateNotionRelevanceScore(query, item) {
        const queryLower = query.toLowerCase();
        let score = 0.5; // Base score
        const title = this.extractNotionTitle(item).toLowerCase();
        if (title.includes(queryLower)) {
            score = 0.9;
        }
        const description = this.extractNotionDescription(item).toLowerCase();
        if (description.includes(queryLower)) {
            score = Math.max(score, 0.7);
        }
        return Math.min(score, 1.0);
    }
    /**
     * Extract highlighted text from Notion object
     */
    extractNotionHighlights(query, item) {
        const queryLower = query.toLowerCase();
        const highlights = [];
        const title = this.extractNotionTitle(item);
        if (title.toLowerCase().includes(queryLower)) {
            const index = title.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, index - 30);
            const end = Math.min(title.length, index + query.length + 30);
            highlights.push(title.substring(start, end));
        }
        const description = this.extractNotionDescription(item);
        if (description.toLowerCase().includes(queryLower)) {
            const index = description.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, index - 30);
            const end = Math.min(description.length, index + query.length + 30);
            highlights.push(description.substring(start, end));
        }
        return highlights.slice(0, 3);
    }
    /**
     * List available entities (databases accessible to the integration)
     */
    async listEntities() {
        // Start with built-in entities
        const entities = [...NOTION_ENTITIES];
        // Fetch accessible databases
        const result = await this.makeNotionRequest('/search', {
            method: 'POST',
            body: JSON.stringify({
                filter: { property: 'object', value: 'database' },
                page_size: 100,
            }),
        });
        if (!result.error && result.data) {
            for (const db of result.data.results) {
                const schema = await this.getDatabaseSchema(db.id);
                if (schema) {
                    entities.push(schema);
                }
            }
        }
        return entities;
    }
    /**
     * Parse Notion webhook (not natively supported, but could be via polling or third-party)
     */
    parseWebhook(payload, _headers) {
        // Notion doesn't have native webhooks, but this could be used with
        // third-party webhook services like Pipedream or Make
        if (!payload || !payload.type) {
            return null;
        }
        return {
            type: payload.type,
            entity: payload.object || 'page',
            externalId: payload.id || '',
            operation: payload.type === 'page.created' ? 'create' :
                payload.type === 'page.deleted' ? 'delete' : 'update',
            data: payload.data || payload,
            timestamp: new Date(payload.timestamp || Date.now()),
        };
    }
    // ============================================
    // Helper Methods
    // ============================================
    /**
     * Build Notion filter from our filter format
     */
    buildNotionFilter(filters, modifiedSince) {
        const conditions = [];
        if (modifiedSince) {
            conditions.push({
                timestamp: 'last_edited_time',
                last_edited_time: {
                    after: modifiedSince.toISOString(),
                },
            });
        }
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (key === 'cursor' || key === 'query') {
                    continue;
                }
                if (typeof value === 'string') {
                    conditions.push({
                        property: key,
                        rich_text: { contains: value },
                    });
                }
                else if (typeof value === 'boolean') {
                    conditions.push({
                        property: key,
                        checkbox: { equals: value },
                    });
                }
                else if (typeof value === 'number') {
                    conditions.push({
                        property: key,
                        number: { equals: value },
                    });
                }
            }
        }
        if (conditions.length === 0) {
            return undefined;
        }
        if (conditions.length === 1) {
            return conditions[0];
        }
        return { and: conditions };
    }
    /**
     * Convert our properties format to Notion properties
     */
    convertToNotionProperties(properties) {
        const notionProps = {};
        for (const [key, value] of Object.entries(properties)) {
            notionProps[key] = this.convertPropertyValue(value);
        }
        return notionProps;
    }
    /**
     * Convert a single property value to Notion format
     */
    convertPropertyValue(value) {
        if (value === null || value === undefined) {
            return {};
        }
        // Already in Notion format
        if (value && typeof value === 'object' && (value.title || value.rich_text || value.number !== undefined)) {
            return value;
        }
        // Simple string - assume rich_text or title
        if (typeof value === 'string') {
            return {
                rich_text: [{ text: { content: value } }],
            };
        }
        // Number
        if (typeof value === 'number') {
            return { number: value };
        }
        // Boolean - checkbox
        if (typeof value === 'boolean') {
            return { checkbox: value };
        }
        // Date
        if (value instanceof Date) {
            return { date: { start: value.toISOString() } };
        }
        // Array - could be multi-select
        if (Array.isArray(value)) {
            return {
                multi_select: value.map(v => ({ name: String(v) })),
            };
        }
        // Object with special handling
        if (typeof value === 'object') {
            return value;
        }
        return {};
    }
    /**
     * Convert database properties schema to Notion format
     */
    convertToDatabaseProperties(properties) {
        const notionProps = {};
        for (const [name, config] of Object.entries(properties)) {
            if (typeof config === 'string') {
                // Simple type name
                notionProps[name] = { [config]: {} };
            }
            else if (config && typeof config === 'object') {
                // Already in Notion format or our format
                notionProps[name] = config;
            }
        }
        return notionProps;
    }
    /**
     * Convert our block format to Notion block
     */
    convertToNotionBlock(block) {
        const { type, content, children, ...rest } = block;
        const blockType = type || 'paragraph';
        const notionBlock = {
            object: 'block',
            type: blockType,
        };
        // Handle text content
        if (content) {
            const richText = typeof content === 'string'
                ? [{ text: { content } }]
                : content;
            notionBlock[blockType] = {
                rich_text: richText,
                ...rest,
            };
        }
        else {
            notionBlock[blockType] = rest;
        }
        // Handle children
        if (children && Array.isArray(children)) {
            notionBlock[blockType].children = children.map(c => this.convertToNotionBlock(c));
        }
        return notionBlock;
    }
    /**
     * Normalize database record
     */
    normalizeDatabaseRecord(db) {
        return {
            id: db.id,
            object: 'database',
            title: this.extractPlainText(db.title),
            description: this.extractPlainText(db.description),
            icon: db.icon,
            cover: db.cover,
            url: db.url,
            archived: db.archived,
            is_inline: db.is_inline,
            parent: db.parent,
            properties: Object.keys(db.properties),
            propertySchema: db.properties,
            created_time: db.created_time,
            last_edited_time: db.last_edited_time,
            created_by: db.created_by?.id,
            last_edited_by: db.last_edited_by?.id,
        };
    }
    /**
     * Normalize page record
     */
    normalizePageRecord(page) {
        const normalized = {
            id: page.id,
            object: 'page',
            url: page.url,
            archived: page.archived,
            icon: page.icon,
            cover: page.cover,
            parent: page.parent,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            created_by: page.created_by?.id,
            last_edited_by: page.last_edited_by?.id,
        };
        // Extract property values
        for (const [name, prop] of Object.entries(page.properties)) {
            normalized[name] = this.extractPropertyValue(prop);
        }
        return normalized;
    }
    /**
     * Normalize block record
     */
    normalizeBlockRecord(block) {
        const { object, id, parent, created_time, last_edited_time, has_children, archived, type, ...content } = block;
        return {
            id,
            object: 'block',
            type,
            parent,
            has_children,
            archived,
            created_time,
            last_edited_time,
            content: content[type],
        };
    }
    /**
     * Extract plain text from rich text array
     */
    extractPlainText(richText) {
        if (!richText || !Array.isArray(richText)) {
            return '';
        }
        return richText.map(rt => rt.plain_text).join('');
    }
    /**
     * Extract value from Notion property
     */
    extractPropertyValue(prop) {
        switch (prop.type) {
            case 'title':
                return this.extractPlainText(prop.title);
            case 'rich_text':
                return this.extractPlainText(prop.rich_text);
            case 'number':
                return prop.number;
            case 'checkbox':
                return prop.checkbox;
            case 'select':
                return prop.select?.name || null;
            case 'multi_select':
                return prop.multi_select?.map((s) => s.name) || [];
            case 'date':
                return prop.date?.start || null;
            case 'email':
                return prop.email;
            case 'url':
                return prop.url;
            case 'phone_number':
                return prop.phone_number;
            case 'formula':
                return this.extractFormulaValue(prop.formula);
            case 'relation':
                return prop.relation?.map((r) => r.id) || [];
            case 'rollup':
                return this.extractRollupValue(prop.rollup);
            case 'people':
                return prop.people?.map((p) => p.id) || [];
            case 'files':
                return prop.files?.map((f) => f.file?.url || f.external?.url) || [];
            case 'created_time':
                return prop.created_time;
            case 'created_by':
                return prop.created_by?.id;
            case 'last_edited_time':
                return prop.last_edited_time;
            case 'last_edited_by':
                return prop.last_edited_by?.id;
            case 'status':
                return prop.status?.name || null;
            default:
                return null;
        }
    }
    /**
     * Extract formula result value
     */
    extractFormulaValue(formula) {
        if (!formula) {
            return null;
        }
        switch (formula.type) {
            case 'string':
                return formula.string;
            case 'number':
                return formula.number;
            case 'boolean':
                return formula.boolean;
            case 'date':
                return formula.date?.start;
            default:
                return null;
        }
    }
    /**
     * Extract rollup result value
     */
    extractRollupValue(rollup) {
        if (!rollup) {
            return null;
        }
        switch (rollup.type) {
            case 'number':
                return rollup.number;
            case 'date':
                return rollup.date?.start;
            case 'array':
                return rollup.array?.map((item) => this.extractPropertyValue(item));
            default:
                return null;
        }
    }
    /**
     * Map Notion property type to our type
     */
    mapNotionPropertyType(notionType) {
        switch (notionType) {
            case 'number':
                return 'number';
            case 'checkbox':
                return 'boolean';
            case 'date':
            case 'created_time':
            case 'last_edited_time':
                return 'datetime';
            case 'multi_select':
            case 'relation':
            case 'files':
            case 'people':
                return 'array';
            case 'rollup':
            case 'formula':
                return 'object';
            default:
                return 'string';
        }
    }
}
// ============================================
// Entity Definitions
// ============================================
/**
 * Notion database entity
 */
const NOTION_DATABASE_ENTITY = {
    name: 'database',
    displayName: 'Database',
    description: 'Notion databases (tables)',
    fields: [
        { name: 'id', displayName: 'ID', type: 'string', required: true, readOnly: true },
        { name: 'title', displayName: 'Title', type: 'string', required: true },
        { name: 'description', displayName: 'Description', type: 'string', required: false },
        { name: 'url', displayName: 'URL', type: 'string', required: false, readOnly: true },
        { name: 'icon', displayName: 'Icon', type: 'object', required: false },
        { name: 'cover', displayName: 'Cover', type: 'object', required: false },
        { name: 'archived', displayName: 'Archived', type: 'boolean', required: false },
        { name: 'is_inline', displayName: 'Inline', type: 'boolean', required: false, readOnly: true },
        { name: 'properties', displayName: 'Properties', type: 'array', required: false, readOnly: true },
        { name: 'created_time', displayName: 'Created', type: 'datetime', required: false, readOnly: true },
        { name: 'last_edited_time', displayName: 'Last Edited', type: 'datetime', required: false, readOnly: true },
    ],
    supportsPull: true,
    supportsPush: true,
    supportsDelete: false, // Can only archive via page
    supportsWebhook: false,
    idField: 'id',
    modifiedField: 'last_edited_time',
};
/**
 * Notion page entity
 */
const NOTION_PAGE_ENTITY = {
    name: 'page',
    displayName: 'Page',
    description: 'Notion pages',
    fields: [
        { name: 'id', displayName: 'ID', type: 'string', required: true, readOnly: true },
        { name: 'title', displayName: 'Title', type: 'string', required: false },
        { name: 'url', displayName: 'URL', type: 'string', required: false, readOnly: true },
        { name: 'icon', displayName: 'Icon', type: 'object', required: false },
        { name: 'cover', displayName: 'Cover', type: 'object', required: false },
        { name: 'archived', displayName: 'Archived', type: 'boolean', required: false },
        { name: 'parent', displayName: 'Parent', type: 'object', required: true, readOnly: true },
        { name: 'properties', displayName: 'Properties', type: 'object', required: false },
        { name: 'created_time', displayName: 'Created', type: 'datetime', required: false, readOnly: true },
        { name: 'last_edited_time', displayName: 'Last Edited', type: 'datetime', required: false, readOnly: true },
    ],
    supportsPull: true,
    supportsPush: true,
    supportsDelete: true, // Archives the page
    supportsWebhook: false,
    idField: 'id',
    modifiedField: 'last_edited_time',
};
/**
 * Notion block entity
 */
const NOTION_BLOCK_ENTITY = {
    name: 'block',
    displayName: 'Block',
    description: 'Notion content blocks (paragraphs, headings, lists, etc.)',
    fields: [
        { name: 'id', displayName: 'ID', type: 'string', required: true, readOnly: true },
        { name: 'type', displayName: 'Type', type: 'string', required: true },
        { name: 'content', displayName: 'Content', type: 'object', required: false },
        { name: 'has_children', displayName: 'Has Children', type: 'boolean', required: false, readOnly: true },
        { name: 'archived', displayName: 'Archived', type: 'boolean', required: false, readOnly: true },
        { name: 'parent', displayName: 'Parent', type: 'object', required: true, readOnly: true },
        { name: 'created_time', displayName: 'Created', type: 'datetime', required: false, readOnly: true },
        { name: 'last_edited_time', displayName: 'Last Edited', type: 'datetime', required: false, readOnly: true },
    ],
    supportsPull: true,
    supportsPush: true,
    supportsDelete: true,
    supportsWebhook: false,
    idField: 'id',
    modifiedField: 'last_edited_time',
};
/**
 * All Notion entities
 */
const NOTION_ENTITIES = [
    NOTION_DATABASE_ENTITY,
    NOTION_PAGE_ENTITY,
    NOTION_BLOCK_ENTITY,
];
// ============================================
// Integration Definition
// ============================================
/**
 * Notion integration definition
 *
 * Credential Architecture:
 * - System OAuth App: clientId/clientSecret stored in Key Vault as system secrets
 *   (referenced via clientIdEnvVar/clientSecretEnvVar for the OAuth flow)
 * - Per-Tenant Tokens: access_token/refresh_token stored in Key Vault per tenant
 *   Pattern: tenant-{tenantId}-notion-oauth
 *
 * The IntegrationConnectionService handles all credential management:
 * - OAuth flow uses system app credentials
 * - Per-tenant tokens are stored/retrieved via Key Vault
 * - Token refresh is handled automatically
 */
export const NOTION_DEFINITION = {
    id: 'notion',
    name: 'notion',
    displayName: 'Notion',
    description: 'Connect to Notion to sync databases, pages, and content blocks.',
    category: IntegrationCategory.DATA_SOURCE,
    icon: 'notion',
    color: '#000000',
    visibility: 'public',
    isPremium: false,
    capabilities: ['read', 'write', 'delete', 'search'],
    supportedSyncDirections: ['pull', 'push', 'bidirectional'],
    supportsRealtime: false, // Notion doesn't have native webhooks
    supportsWebhooks: false,
    authType: 'oauth2',
    oauthConfig: {
        authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        revokeUrl: undefined, // Notion doesn't have a revoke endpoint
        scopes: [], // Notion doesn't use scopes in the traditional sense
        // System-level OAuth app credentials (stored in Key Vault as system secrets)
        // These are used during the OAuth authorization flow
        clientIdEnvVar: 'NOTION_CLIENT_ID',
        clientSecretEnvVar: 'NOTION_CLIENT_SECRET',
        // Redirect URI is configured at runtime from environment
        redirectUri: '/api/integrations/oauth/callback',
        pkce: false,
        additionalParams: {
            owner: 'user', // Request access to user's workspace
        },
    },
    availableEntities: NOTION_ENTITIES,
    // Each tenant connects their own Notion workspace
    // Credentials stored in Key Vault: tenant-{tenantId}-notion-oauth
    connectionScope: 'tenant',
    status: 'active',
    version: '1.0.0',
    documentationUrl: 'https://developers.notion.com',
    supportUrl: 'https://www.notion.so/help',
    createdAt: new Date(),
    updatedAt: new Date(),
};
// ============================================
// Factory & Registration
// ============================================
/**
 * Notion adapter factory
 */
export const notionAdapterFactory = {
    create(monitoring, connectionService, tenantId, connectionId) {
        return new NotionAdapter(monitoring, connectionService, tenantId, connectionId);
    },
};
// Register adapter
adapterRegistry.register('notion', notionAdapterFactory);
//# sourceMappingURL=notion.adapter.js.map