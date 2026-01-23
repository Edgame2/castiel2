/**
 * Base Integration Adapter
 * Abstract class for implementing integration-specific logic
 */
/**
 * Base Integration Adapter
 */
export class BaseIntegrationAdapter {
    monitoring;
    connectionService;
    integrationId;
    tenantId;
    connectionId;
    constructor(monitoring, connectionService, integrationId, tenantId, connectionId) {
        this.monitoring = monitoring;
        this.connectionService = connectionService;
        this.integrationId = integrationId;
        this.tenantId = tenantId;
        this.connectionId = connectionId;
    }
    /**
     * Parse webhook payload
     */
    parseWebhook(payload, headers) {
        // Default implementation - override in specific adapters
        return null;
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature, secret) {
        // Default implementation - override in specific adapters
        return false;
    }
    // ============================================
    // Lifecycle Hooks (Optional - Override as Needed)
    // ============================================
    /**
     * Called when connection is established
     */
    async onConnect() {
        // Override in specific adapters for setup tasks
    }
    /**
     * Called when connection is terminated
     */
    async onDisconnect() {
        // Override in specific adapters for cleanup
    }
    /**
     * Called when an error occurs during operations
     */
    async onError(error, context) {
        this.monitoring.trackException(error, {
            operation: 'adapter.error',
            integrationId: this.integrationId,
            tenantId: this.tenantId,
            ...context,
        });
    }
    /**
     * Called when rate limit is hit
     */
    async onRateLimitHit(resetAt) {
        this.monitoring.trackEvent('integration.rate_limit_hit', {
            integrationId: this.integrationId,
            tenantId: this.tenantId,
            resetAt: resetAt.toISOString(),
        });
    }
    // ============================================
    // Batch Operations (Optional - Override for Better Performance)
    // ============================================
    /**
     * Fetch records in batches for large data sets
     */
    async fetchBatch(options) {
        const results = [];
        const batchSize = options.batchSize || 100;
        const maxBatches = options.maxBatches || 10;
        let offset = options.offset || 0;
        let batchNumber = 0;
        let hasMore = true;
        while (hasMore && batchNumber < maxBatches) {
            const result = await this.fetch({
                ...options,
                limit: batchSize,
                offset,
            });
            results.push(result);
            batchNumber++;
            if (options.onBatchComplete) {
                await options.onBatchComplete(result, batchNumber);
            }
            hasMore = result.hasMore;
            offset = result.nextOffset || offset + batchSize;
        }
        return results;
    }
    /**
     * Push records in batches
     */
    async pushBatch(records, options) {
        const results = [];
        for (const record of records) {
            try {
                const result = await this.push(record, options);
                results.push(result);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                results.push({
                    success: false,
                    error: errorMessage,
                });
            }
        }
        return results;
    }
    // ============================================
    // Schema Discovery (Optional - Override for Dynamic Schema)
    // ============================================
    /**
     * Discover available entities dynamically from API
     */
    async discoverEntities() {
        // Override in adapters that support dynamic schema discovery
        return [];
    }
    /**
     * Discover fields for a specific entity
     */
    async discoverFields(entityName) {
        // Override in adapters that support dynamic field discovery
        const entity = await this.getEntitySchema(entityName);
        return entity?.fields || [];
    }
    // ============================================
    // Health Check (Optional - Override for Custom Checks)
    // ============================================
    /**
     * Check adapter health and connectivity
     */
    async healthCheck() {
        const startTime = Date.now();
        try {
            const testResult = await this.testConnection();
            const responseTime = Date.now() - startTime;
            return {
                healthy: testResult.success,
                responseTime,
                error: testResult.error,
                lastCheckedAt: new Date(),
                details: testResult.details,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                healthy: false,
                responseTime: Date.now() - startTime,
                error: errorMessage,
                lastCheckedAt: new Date(),
            };
        }
    }
    // ============================================
    // Rate Limit Handling (Optional - Override for API-Specific Logic)
    // ============================================
    /**
     * Extract rate limit info from response headers
     */
    extractRateLimitInfo(headers) {
        // Common header patterns - override for specific APIs
        const limit = headers.get('x-ratelimit-limit') || headers.get('ratelimit-limit');
        const remaining = headers.get('x-ratelimit-remaining') || headers.get('ratelimit-remaining');
        const reset = headers.get('x-ratelimit-reset') || headers.get('ratelimit-reset');
        if (!limit || !remaining || !reset) {
            return null;
        }
        const resetTimestamp = parseInt(reset, 10);
        const resetAt = new Date(resetTimestamp * 1000);
        const resetInSeconds = Math.max(0, Math.floor((resetAt.getTime() - Date.now()) / 1000));
        return {
            limit: parseInt(limit, 10),
            remaining: parseInt(remaining, 10),
            resetAt,
            resetInSeconds,
        };
    }
    /**
     * Get access token (handles refresh if needed)
     */
    async getAccessToken() {
        try {
            const credentials = await this.connectionService.getDecryptedCredentials(this.connectionId, this.integrationId);
            if (credentials?.type === 'oauth2' && credentials.accessToken) {
                return credentials.accessToken;
            }
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'base-adapter.get-access-token',
                connectionId: this.connectionId,
                integrationId: this.integrationId,
            });
            return null;
        }
    }
    /**
     * Make authenticated API request with rate limit handling
     */
    async makeRequest(url, options = {}, timeoutMs = 30000) {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            return { error: 'No access token available', status: 401 };
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            clearTimeout(timeoutId);
            // Extract rate limit info if available
            let rateLimitInfo;
            if (this.extractRateLimitInfo) {
                rateLimitInfo = this.extractRateLimitInfo(response.headers) || undefined;
                // Trigger callback if rate limit is low
                if (rateLimitInfo && rateLimitInfo.remaining < 10 && this.onRateLimitHit) {
                    await this.onRateLimitHit(rateLimitInfo.resetAt);
                }
            }
            // Handle rate limit exceeded
            if (response.status === 429) {
                const resetAt = rateLimitInfo?.resetAt || new Date(Date.now() + 60000); // Default 1 min
                if (this.onRateLimitHit) {
                    await this.onRateLimitHit(resetAt);
                }
                return {
                    error: 'Rate limit exceeded',
                    status: 429,
                    rateLimitInfo,
                };
            }
            if (!response.ok) {
                const errorText = await response.text();
                this.monitoring.trackEvent('integration.request.failed', {
                    integrationId: this.integrationId,
                    status: response.status,
                    url,
                });
                if (this.onError) {
                    await this.onError(new Error(errorText), {
                        status: response.status,
                        url,
                    });
                }
                return { error: errorText, status: response.status, rateLimitInfo };
            }
            const data = await response.json();
            return { data, status: response.status, rateLimitInfo };
        }
        catch (error) {
            clearTimeout(timeoutId);
            // Handle timeout errors
            const errorName = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorName === 'AbortError' || errorMessage?.includes('aborted')) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'integration.makeRequest.timeout',
                    integrationId: this.integrationId,
                    url,
                    timeoutMs,
                });
                return { error: 'Request timeout', status: 504 };
            }
            this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                operation: 'integration.makeRequest',
                integrationId: this.integrationId,
                url,
            });
            if (this.onError) {
                await this.onError(error instanceof Error ? error : new Error(errorMessage), { url });
            }
            return { error: errorMessage, status: 500 };
        }
    }
}
/**
 * Registry for integration adapters
 */
export class IntegrationAdapterRegistry {
    adapters = new Map();
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    register(integrationId, factory) {
        this.adapters.set(integrationId, factory);
        this.monitoring?.trackEvent('adapter.registered', {
            integrationId,
        });
    }
    get(integrationId) {
        return this.adapters.get(integrationId);
    }
    has(integrationId) {
        return this.adapters.has(integrationId);
    }
    list() {
        return Array.from(this.adapters.keys());
    }
    unregister(integrationId) {
        const existed = this.adapters.delete(integrationId);
        if (existed) {
            this.monitoring?.trackEvent('adapter.unregistered', {
                integrationId,
            });
        }
        return existed;
    }
    /**
     * Auto-discover and register adapters from a directory
     * Scans for adapter files matching pattern: *.adapter.ts or *.adapter.js
     */
    async autoDiscoverAdapters(directory) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            if (!fs.existsSync(directory)) {
                this.monitoring?.trackEvent('adapter.discovery.failed', {
                    reason: 'directory_not_found',
                    directory,
                });
                return 0;
            }
            const files = fs.readdirSync(directory);
            const adapterFiles = files.filter((file) => file.endsWith('.adapter.ts') || file.endsWith('.adapter.js'));
            let registeredCount = 0;
            for (const file of adapterFiles) {
                try {
                    const filePath = path.join(directory, file);
                    const module = await import(filePath);
                    // Look for exported factory or adapter class
                    if (module.adapterFactory) {
                        const integrationId = file.replace(/\.adapter\.(ts|js)$/, '');
                        this.register(integrationId, module.adapterFactory);
                        registeredCount++;
                    }
                    else if (module.default) {
                        // Try to use default export as factory
                        const integrationId = file.replace(/\.adapter\.(ts|js)$/, '');
                        this.register(integrationId, module.default);
                        registeredCount++;
                    }
                }
                catch (error) {
                    this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                        operation: 'adapter.discovery',
                        file,
                    });
                }
            }
            this.monitoring?.trackEvent('adapter.discovery.completed', {
                directory,
                discovered: adapterFiles.length,
                registered: registeredCount,
            });
            return registeredCount;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'adapter.autoDiscoverAdapters',
                directory,
            });
            return 0;
        }
    }
    /**
     * Get adapter statistics
     */
    getStats() {
        return {
            totalAdapters: this.adapters.size,
            adapterIds: this.list(),
        };
    }
}
// Global adapter registry
export const adapterRegistry = new IntegrationAdapterRegistry();
//# sourceMappingURL=base-adapter.js.map