/**
 * Custom Integration Types
 * Types for user-defined REST API, Webhook, and GraphQL integrations
 */
export type CustomIntegrationType = 'rest_api' | 'webhook' | 'graphql';
export interface CustomIntegrationDefinition {
    id: string;
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
    color?: string;
    integrationType: CustomIntegrationType;
    baseUrl: string;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
    retryConfig?: RetryConfig;
    auth: CustomAuthConfig;
    endpoints: CustomEndpoint[];
    webhookConfig?: WebhookReceiverConfig;
    status: 'active' | 'inactive' | 'error';
    lastTestedAt?: Date;
    lastTestResult?: 'success' | 'failure';
    lastError?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[];
}
export type CustomAuthConfig = NoAuth | ApiKeyAuth | BearerTokenAuth | BasicAuth | OAuth2Auth | CustomHeaderAuth;
export interface NoAuth {
    type: 'none';
}
export interface ApiKeyAuth {
    type: 'api_key';
    keyName: string;
    keyLocation: 'header' | 'query' | 'body';
    keyValue: string;
}
export interface BearerTokenAuth {
    type: 'bearer';
    token: string;
}
export interface BasicAuth {
    type: 'basic';
    username: string;
    password: string;
}
export interface OAuth2Auth {
    type: 'oauth2';
    grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
    authorizationUrl?: string;
    redirectUri?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
}
export interface CustomHeaderAuth {
    type: 'custom_headers';
    headers: Record<string, string>;
}
export interface CustomEndpoint {
    id: string;
    name: string;
    description?: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    queryParams?: ParamConfig[];
    pathParams?: ParamConfig[];
    headers?: Record<string, string>;
    body?: RequestBodyConfig;
    responseMapping: ResponseMappingConfig;
    pagination?: PaginationConfig;
    rateLimit?: {
        requestsPerMinute: number;
        burstLimit?: number;
    };
    tags?: string[];
    testConfig?: EndpointTestConfig;
}
export interface ParamConfig {
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'array';
    default?: unknown;
    description?: string;
    valueSource?: 'static' | 'variable' | 'expression';
    value?: unknown;
}
export interface RequestBodyConfig {
    contentType: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
    bodyType: 'template' | 'schema' | 'raw';
    template?: string;
    schema?: BodySchema;
    raw?: string;
}
export interface BodySchema {
    type: 'object' | 'array';
    properties?: Record<string, PropertySchema>;
    items?: PropertySchema;
}
export interface PropertySchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    source?: 'static' | 'variable' | 'expression';
    value?: unknown;
    properties?: Record<string, PropertySchema>;
    items?: PropertySchema;
}
export interface ResponseMappingConfig {
    dataPath: string;
    fieldMappings: FieldMapping[];
    targetShardTypeId?: string;
    identifierField: string;
    errorPath?: string;
    metadataMapping?: {
        totalCount?: string;
        pageInfo?: string;
    };
}
export interface FieldMapping {
    source: string;
    target: string;
    transform?: TransformConfig;
    default?: unknown;
    skipIfEmpty?: boolean;
}
export type TransformType = 'direct' | 'concat' | 'split' | 'map' | 'date' | 'number' | 'boolean' | 'template' | 'expression' | 'lookup';
export interface TransformConfig {
    type: TransformType;
    config?: Record<string, unknown>;
}
export type PaginationType = 'offset' | 'cursor' | 'page' | 'link';
export interface PaginationConfig {
    type: PaginationType;
    offsetParam?: string;
    limitParam?: string;
    maxLimit?: number;
    cursorParam?: string;
    cursorPath?: string;
    pageParam?: string;
    pageSizeParam?: string;
    nextLinkPath?: string;
    endCondition: {
        type: 'empty_array' | 'count_less_than_limit' | 'cursor_null' | 'has_more_field';
        field?: string;
    };
}
export interface WebhookReceiverConfig {
    webhookUrl?: string;
    webhookSecret: string;
    signatureConfig?: {
        header: string;
        algorithm: 'hmac-sha256' | 'hmac-sha1' | 'none';
        signaturePrefix?: string;
    };
    eventRouting: WebhookEventRouting[];
    responseStatus: number;
    responseBody?: string;
}
export interface WebhookEventRouting {
    eventTypePath: string;
    eventTypeValue: string;
    action: 'create_shard' | 'update_shard' | 'delete_shard' | 'trigger_sync' | 'custom';
    targetShardTypeId?: string;
    dataPath?: string;
    fieldMappings?: FieldMapping[];
    identifierPath?: string;
}
export interface EndpointTestConfig {
    testParams?: Record<string, unknown>;
    testBody?: Record<string, unknown>;
    expectations?: {
        statusCode?: number;
        bodyContains?: string[];
        jsonPath?: {
            path: string;
            value: unknown;
        }[];
    };
}
export interface TestResult {
    success: boolean;
    request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: unknown;
    };
    response?: {
        statusCode: number;
        headers: Record<string, string>;
        body: unknown;
        latencyMs: number;
    };
    mappingPreview?: {
        rawData: unknown;
        mappedData: unknown;
        errors: string[];
    };
    error?: string;
}
export interface CustomIntegrationExecuteRequest {
    integrationId: string;
    endpointId: string;
    params?: Record<string, unknown>;
    body?: unknown;
}
export interface CustomIntegrationExecuteResult {
    success: boolean;
    data?: unknown;
    mappedShards?: {
        shardId?: string;
        action: 'created' | 'updated' | 'skipped';
        data: Record<string, unknown>;
    }[];
    error?: string;
    latencyMs: number;
    requestId: string;
}
export interface CustomIntegrationStructuredData {
    displayName: string;
    description?: string;
    integrationType: CustomIntegrationType;
    baseUrl: string;
    authType: string;
    authConfig: CustomAuthConfig;
    endpoints: CustomEndpoint[];
    webhookConfig?: WebhookReceiverConfig;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
    retryConfig?: RetryConfig;
    status: 'active' | 'inactive' | 'error';
    lastTestedAt?: string;
    lastTestResult?: 'success' | 'failure';
    lastError?: string;
}
//# sourceMappingURL=custom-integration.types.d.ts.map