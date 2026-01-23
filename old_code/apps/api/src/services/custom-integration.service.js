/**
 * Custom Integration Service
 * Executes user-defined REST API, Webhook, and GraphQL integrations
 */
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { ShardStatus } from '../types/shard.types.js';
export class CustomIntegrationService {
    shardRepository;
    shardTypeRepository;
    encryptionService;
    monitoring;
    constructor(shardRepository, shardTypeRepository, encryptionService, monitoring) {
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.encryptionService = encryptionService;
        this.monitoring = monitoring;
    }
    // ============================================
    // Integration Execution
    // ============================================
    /**
     * Execute an endpoint on a custom integration
     */
    async executeEndpoint(integration, endpointId, params, body) {
        const requestId = uuid();
        const startTime = Date.now();
        const endpoint = integration.endpoints.find((e) => e.id === endpointId);
        if (!endpoint) {
            return {
                success: false,
                error: `Endpoint ${endpointId} not found`,
                latencyMs: Date.now() - startTime,
                requestId,
            };
        }
        try {
            // Build request
            const url = this.buildUrl(integration.baseUrl, endpoint, params);
            const headers = await this.buildHeaders(integration, endpoint);
            const requestBody = this.buildBody(endpoint, body);
            this.monitoring.trackEvent('custom-integration.execute', {
                integrationId: integration.id,
                endpointId,
                method: endpoint.method,
            });
            // Execute request
            const response = await this.executeRequest(url, endpoint.method, headers, requestBody, integration.timeout || 30000);
            // Check for errors
            if (!response.ok) {
                const errorBody = await response.text();
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorBody}`,
                    latencyMs: Date.now() - startTime,
                    requestId,
                };
            }
            // Parse response
            const responseData = await response.json();
            // Apply response mapping
            const mappedShards = await this.applyResponseMapping(integration.tenantId, responseData, endpoint.responseMapping);
            return {
                success: true,
                data: responseData,
                mappedShards,
                latencyMs: Date.now() - startTime,
                requestId,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'custom-integration.execute',
                integrationId: integration.id,
                endpointId,
            });
            return {
                success: false,
                error: error.message,
                latencyMs: Date.now() - startTime,
                requestId,
            };
        }
    }
    /**
     * Test integration connection
     */
    async testConnection(integration) {
        const startTime = Date.now();
        try {
            // Find a test endpoint (prefer GET requests)
            const testEndpoint = integration.endpoints.find((e) => e.method === 'GET') || integration.endpoints[0];
            if (!testEndpoint) {
                return {
                    success: false,
                    error: 'No endpoints configured to test',
                    request: {
                        url: integration.baseUrl,
                        method: 'GET',
                        headers: {},
                    },
                };
            }
            const url = this.buildUrl(integration.baseUrl, testEndpoint, testEndpoint.testConfig?.testParams);
            const headers = await this.buildHeaders(integration, testEndpoint);
            const response = await this.executeRequest(url, testEndpoint.method, headers, undefined, integration.timeout);
            const responseBody = await response.text();
            let parsedBody;
            try {
                parsedBody = JSON.parse(responseBody);
            }
            catch {
                parsedBody = responseBody;
            }
            return {
                success: response.ok,
                request: {
                    url,
                    method: testEndpoint.method,
                    headers: this.sanitizeHeaders(headers),
                },
                response: {
                    statusCode: response.status,
                    headers: response.headers ? (() => {
                        const headersObj = {};
                        if ('entries' in response.headers && typeof response.headers.entries === 'function') {
                            for (const [key, value] of response.headers.entries()) {
                                headersObj[key] = value;
                            }
                        }
                        else if ('forEach' in response.headers && typeof response.headers.forEach === 'function') {
                            response.headers.forEach((value, key) => {
                                headersObj[key] = value;
                            });
                        }
                        return headersObj;
                    })() : {},
                    body: parsedBody,
                    latencyMs: Date.now() - startTime,
                },
                error: response.ok ? undefined : `HTTP ${response.status}`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                request: {
                    url: integration.baseUrl,
                    method: 'GET',
                    headers: {},
                },
            };
        }
    }
    /**
     * Test a specific endpoint
     */
    async testEndpoint(integration, endpointId, testParams, testBody) {
        const startTime = Date.now();
        const endpoint = integration.endpoints.find((e) => e.id === endpointId);
        if (!endpoint) {
            return {
                success: false,
                error: `Endpoint ${endpointId} not found`,
                request: {
                    url: integration.baseUrl,
                    method: 'GET',
                    headers: {},
                },
            };
        }
        try {
            const url = this.buildUrl(integration.baseUrl, endpoint, testParams);
            const headers = await this.buildHeaders(integration, endpoint);
            const body = this.buildBody(endpoint, testBody);
            const response = await this.executeRequest(url, endpoint.method, headers, body, integration.timeout);
            const responseBody = await response.text();
            let parsedBody;
            try {
                parsedBody = JSON.parse(responseBody);
            }
            catch {
                parsedBody = responseBody;
            }
            // Preview mapping
            let mappingPreview;
            if (response.ok && endpoint.responseMapping) {
                mappingPreview = this.previewMapping(parsedBody, endpoint.responseMapping);
            }
            return {
                success: response.ok,
                request: {
                    url,
                    method: endpoint.method,
                    headers: this.sanitizeHeaders(headers),
                    body,
                },
                response: {
                    statusCode: response.status,
                    headers: response.headers ? (() => {
                        const headersObj = {};
                        if ('entries' in response.headers && typeof response.headers.entries === 'function') {
                            for (const [key, value] of response.headers.entries()) {
                                headersObj[key] = value;
                            }
                        }
                        else if ('forEach' in response.headers && typeof response.headers.forEach === 'function') {
                            response.headers.forEach((value, key) => {
                                headersObj[key] = value;
                            });
                        }
                        return headersObj;
                    })() : {},
                    body: parsedBody,
                    latencyMs: Date.now() - startTime,
                },
                mappingPreview,
                error: response.ok ? undefined : `HTTP ${response.status}`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                request: {
                    url: integration.baseUrl,
                    method: endpoint.method,
                    headers: {},
                },
            };
        }
    }
    // ============================================
    // Webhook Handling
    // ============================================
    /**
     * Process incoming webhook
     */
    async processWebhook(integration, payload, signature) {
        const webhookConfig = integration.webhookConfig;
        if (!webhookConfig) {
            return { success: false, error: 'Webhook not configured', processed: 0 };
        }
        // Verify signature if configured
        if (webhookConfig.signatureConfig && webhookConfig.signatureConfig.algorithm !== 'none') {
            const isValid = this.verifyWebhookSignature(payload, signature, webhookConfig.webhookSecret, webhookConfig.signatureConfig);
            if (!isValid) {
                this.monitoring.trackEvent('custom-integration.webhook.signature-failed', {
                    integrationId: integration.id,
                });
                return { success: false, error: 'Invalid signature', processed: 0 };
            }
        }
        // Find matching event routing
        let processed = 0;
        for (const routing of webhookConfig.eventRouting) {
            const eventType = this.extractJsonPath(payload, routing.eventTypePath);
            if (eventType.found && eventType.value === routing.eventTypeValue) {
                try {
                    await this.processWebhookEvent(integration.tenantId, payload, routing);
                    processed++;
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'custom-integration.webhook.process',
                        integrationId: integration.id,
                        eventType: routing.eventTypeValue,
                    });
                }
            }
        }
        return { success: true, processed };
    }
    /**
     * Generate webhook URL for an integration
     */
    generateWebhookUrl(integrationId, secret) {
        const nodeEnv = (process.env.NODE_ENV || 'development');
        const baseUrl = process.env.API_BASE_URL ||
            process.env.PUBLIC_API_BASE_URL ||
            (nodeEnv === 'production'
                ? (() => { throw new Error('API_BASE_URL or PUBLIC_API_BASE_URL is required in production'); })()
                : 'http://localhost:3001');
        return `${baseUrl}/api/v1/webhooks/custom/${integrationId}/${secret}`;
    }
    /**
     * Generate a new webhook secret
     */
    generateWebhookSecret() {
        return `whsec_${crypto.randomBytes(32).toString('hex')}`;
    }
    // ============================================
    // Private Methods
    // ============================================
    buildUrl(baseUrl, endpoint, params) {
        let path = endpoint.path;
        // Replace path parameters
        if (endpoint.pathParams) {
            for (const param of endpoint.pathParams) {
                const value = params?.[param.name] ?? param.default;
                if (value !== undefined) {
                    path = path.replace(`{${param.name}}`, String(value));
                }
            }
        }
        const url = new URL(path, baseUrl);
        // Add query parameters
        if (endpoint.queryParams) {
            for (const param of endpoint.queryParams) {
                const value = params?.[param.name] ?? param.default;
                if (value !== undefined) {
                    if (Array.isArray(value)) {
                        value.forEach((v) => url.searchParams.append(param.name, String(v)));
                    }
                    else {
                        url.searchParams.set(param.name, String(value));
                    }
                }
            }
        }
        return url.toString();
    }
    async buildHeaders(integration, endpoint) {
        const headers = {
            'Content-Type': endpoint.body?.contentType || 'application/json',
            Accept: 'application/json',
            ...integration.defaultHeaders,
            ...endpoint.headers,
        };
        // Add authentication headers
        await this.applyAuth(headers, integration.auth);
        return headers;
    }
    async applyAuth(headers, auth) {
        switch (auth.type) {
            case 'none':
                break;
            case 'api_key':
                if (auth.keyLocation === 'header') {
                    headers[auth.keyName] = await this.encryptionService.decrypt(auth.keyValue);
                }
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${await this.encryptionService.decrypt(auth.token)}`;
                break;
            case 'basic':
                const credentials = `${auth.username}:${await this.encryptionService.decrypt(auth.password)}`;
                headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
                break;
            case 'oauth2':
                if (auth.accessToken) {
                    headers['Authorization'] = `Bearer ${await this.encryptionService.decrypt(auth.accessToken)}`;
                }
                break;
            case 'custom_headers':
                for (const [key, value] of Object.entries(auth.headers)) {
                    headers[key] = await this.encryptionService.decrypt(value);
                }
                break;
        }
    }
    buildBody(endpoint, data) {
        if (!endpoint.body || endpoint.method === 'GET') {
            return undefined;
        }
        switch (endpoint.body.bodyType) {
            case 'raw':
                return endpoint.body.raw;
            case 'template':
                return this.interpolateTemplate(endpoint.body.template || '', data);
            case 'schema':
                return data;
            default:
                return data;
        }
    }
    interpolateTemplate(template, data) {
        // Replace {{variable}} placeholders
        const interpolated = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const result = this.extractJsonPath(data, path.trim());
            return result.found ? String(result.value) : match;
        });
        try {
            return JSON.parse(interpolated);
        }
        catch {
            return interpolated;
        }
    }
    async executeRequest(url, method, headers, body, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async applyResponseMapping(tenantId, responseData, mapping) {
        const results = [];
        // Extract data using dataPath
        const dataResult = this.extractJsonPath(responseData, mapping.dataPath);
        if (!dataResult.found) {
            return results;
        }
        const items = Array.isArray(dataResult.value) ? dataResult.value : [dataResult.value];
        for (const item of items) {
            const mappedData = {};
            // Apply field mappings
            for (const fieldMapping of mapping.fieldMappings) {
                const sourceResult = this.extractJsonPath(item, fieldMapping.source);
                let value = sourceResult.found ? sourceResult.value : fieldMapping.default;
                // Apply transformation
                if (value !== undefined && fieldMapping.transform) {
                    value = this.applyTransform(value, fieldMapping.transform, item);
                }
                // Skip if empty and configured to do so
                if (fieldMapping.skipIfEmpty && (value === null || value === undefined || value === '')) {
                    continue;
                }
                mappedData[fieldMapping.target] = value;
            }
            // Get identifier for deduplication
            const identifierResult = this.extractJsonPath(item, mapping.identifierField);
            const identifier = identifierResult.found ? String(identifierResult.value) : undefined;
            // Check if shard exists (for deduplication)
            let action = 'created';
            let shardId;
            if (mapping.targetShardTypeId && identifier) {
                // Try to find existing shard by external ID
                try {
                    const existing = await this.shardRepository.list({
                        filter: {
                            tenantId,
                            shardTypeId: mapping.targetShardTypeId,
                        },
                        limit: 1,
                    });
                    // Check if any shard has matching external ID
                    const existingShard = existing.shards.find((s) => s.structuredData?.externalId === identifier);
                    if (existingShard) {
                        action = 'updated';
                        shardId = existingShard.id;
                    }
                }
                catch {
                    // Ignore errors, just create new
                }
            }
            results.push({
                shardId,
                action,
                data: mappedData,
            });
        }
        return results;
    }
    previewMapping(responseData, mapping) {
        const errors = [];
        const mappedData = [];
        // Extract data
        const dataResult = this.extractJsonPath(responseData, mapping.dataPath);
        if (!dataResult.found) {
            errors.push(`Data path '${mapping.dataPath}' not found in response`);
            return { rawData: responseData, mappedData: [], errors };
        }
        const items = Array.isArray(dataResult.value) ? dataResult.value.slice(0, 3) : [dataResult.value]; // Preview first 3
        for (const item of items) {
            const mapped = {};
            for (const fieldMapping of mapping.fieldMappings) {
                const sourceResult = this.extractJsonPath(item, fieldMapping.source);
                if (!sourceResult.found && fieldMapping.default === undefined) {
                    errors.push(`Source field '${fieldMapping.source}' not found`);
                }
                let value = sourceResult.found ? sourceResult.value : fieldMapping.default;
                if (value !== undefined && fieldMapping.transform) {
                    try {
                        value = this.applyTransform(value, fieldMapping.transform, item);
                    }
                    catch (error) {
                        errors.push(`Transform error for '${fieldMapping.target}': ${error.message}`);
                    }
                }
                mapped[fieldMapping.target] = value;
            }
            mappedData.push(mapped);
        }
        return {
            rawData: items,
            mappedData,
            errors,
        };
    }
    applyTransform(value, transform, context) {
        if (!transform) {
            return value;
        }
        switch (transform.type) {
            case 'direct':
                return value;
            case 'concat':
                const fields = transform.config?.fields || [];
                const separator = transform.config?.separator || '';
                return fields
                    .map((f) => this.extractJsonPath(context, f).value)
                    .filter((v) => v !== undefined && v !== null)
                    .join(separator);
            case 'split':
                const delimiter = transform.config?.delimiter || ',';
                return String(value).split(delimiter);
            case 'map':
                const mapping = transform.config?.mapping || {};
                return mapping[String(value)] ?? transform.config?.default ?? value;
            case 'date':
                // Simple ISO date conversion
                if (value instanceof Date) {
                    return value.toISOString();
                }
                const date = new Date(String(value));
                return isNaN(date.getTime()) ? value : date.toISOString();
            case 'number':
                return Number(value);
            case 'boolean':
                if (typeof value === 'boolean') {
                    return value;
                }
                const truthyValues = ['true', '1', 'yes', 'on'];
                if (value === null || value === undefined) {
                    return false;
                }
                return truthyValues.includes(String(value).toLowerCase());
            case 'template':
                const template = transform.config?.template || '';
                return this.interpolateTemplate(template, context);
            default:
                return value;
        }
    }
    extractJsonPath(data, path) {
        // Simple JSONPath implementation
        // Supports: $.field, $.nested.field, $.array[0], $[0].field
        if (path === '$') {
            return { value: data, found: true };
        }
        const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
        let current = data;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return { value: undefined, found: false };
            }
            if (typeof current === 'object') {
                current = current[part];
            }
            else if (Array.isArray(current)) {
                const index = parseInt(part, 10);
                // Validate index is valid and within bounds
                if (isNaN(index) || index < 0 || index >= current.length) {
                    return { value: undefined, found: false };
                }
                current = current[index];
            }
            else {
                return { value: undefined, found: false };
            }
        }
        return { value: current, found: current !== undefined };
    }
    verifyWebhookSignature(payload, signature, secret, config) {
        if (!signature) {
            return false;
        }
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const algorithm = config.algorithm === 'hmac-sha256' ? 'sha256' : 'sha1';
        const expectedSignature = crypto.createHmac(algorithm, secret).update(payloadString).digest('hex');
        const actualSignature = signature.replace(config.signaturePrefix || '', '');
        return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(actualSignature, 'hex'));
    }
    async processWebhookEvent(tenantId, payload, routing) {
        const dataResult = this.extractJsonPath(payload, routing.dataPath || '$');
        if (!dataResult.found) {
            return;
        }
        const data = dataResult.value;
        switch (routing.action) {
            case 'create_shard':
                if (routing.targetShardTypeId && routing.fieldMappings) {
                    const mappedData = {};
                    for (const mapping of routing.fieldMappings) {
                        const result = this.extractJsonPath(data, mapping.source);
                        if (result.found) {
                            mappedData[mapping.target] = result.value;
                        }
                    }
                    await this.shardRepository.create({
                        tenantId,
                        shardTypeId: routing.targetShardTypeId,
                        structuredData: mappedData,
                        status: ShardStatus.ACTIVE,
                        createdBy: 'system',
                    });
                }
                break;
            case 'update_shard':
                if (routing.identifierPath && routing.fieldMappings) {
                    const idResult = this.extractJsonPath(data, routing.identifierPath);
                    if (!idResult.found) {
                        return;
                    }
                    // Find shard by external ID and update
                    // Implementation depends on how external IDs are stored
                }
                break;
            case 'delete_shard':
                // Find and soft-delete shard
                break;
            case 'trigger_sync':
                // Trigger a sync task
                break;
        }
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key'];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '***REDACTED***';
            }
        }
        return sanitized;
    }
}
//# sourceMappingURL=custom-integration.service.js.map