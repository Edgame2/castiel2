/**
 * Custom Integration Types
 * Types for user-defined REST API, Webhook, and GraphQL integrations
 */

// ============================================
// Core Types
// ============================================

export type CustomIntegrationType = 'rest_api' | 'webhook' | 'graphql';

export interface CustomIntegrationDefinition {
  // Identity
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;

  // Type
  integrationType: CustomIntegrationType;

  // Base Configuration
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number; // ms, default 30000
  retryConfig?: RetryConfig;

  // Authentication
  auth: CustomAuthConfig;

  // Endpoints
  endpoints: CustomEndpoint[];

  // Webhook (for incoming data)
  webhookConfig?: WebhookReceiverConfig;

  // Metadata
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
  retryDelay: number; // ms
  retryOn: number[]; // HTTP status codes to retry
}

// ============================================
// Authentication Types
// ============================================

export type CustomAuthConfig =
  | NoAuth
  | ApiKeyAuth
  | BearerTokenAuth
  | BasicAuth
  | OAuth2Auth
  | CustomHeaderAuth;

export interface NoAuth {
  type: 'none';
}

export interface ApiKeyAuth {
  type: 'api_key';
  keyName: string; // e.g., 'X-API-Key'
  keyLocation: 'header' | 'query' | 'body';
  keyValue: string; // Encrypted
}

export interface BearerTokenAuth {
  type: 'bearer';
  token: string; // Encrypted
}

export interface BasicAuth {
  type: 'basic';
  username: string;
  password: string; // Encrypted
}

export interface OAuth2Auth {
  type: 'oauth2';
  grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
  tokenUrl: string;
  clientId: string;
  clientSecret: string; // Encrypted
  scope?: string;

  // For authorization_code flow
  authorizationUrl?: string;
  redirectUri?: string;

  // Token storage (encrypted)
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface CustomHeaderAuth {
  type: 'custom_headers';
  headers: Record<string, string>; // Values encrypted
}

// ============================================
// Endpoint Types
// ============================================

export interface CustomEndpoint {
  id: string;
  name: string;
  description?: string;

  // HTTP Configuration
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // Supports templates: /users/{id}

  // Request
  queryParams?: ParamConfig[];
  pathParams?: ParamConfig[];
  headers?: Record<string, string>;
  body?: RequestBodyConfig;

  // Response
  responseMapping: ResponseMappingConfig;

  // Pagination (for list endpoints)
  pagination?: PaginationConfig;

  // Rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit?: number;
  };

  // Tags for organization
  tags?: string[];

  // Test data
  testConfig?: EndpointTestConfig;
}

export interface ParamConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array';
  default?: unknown;
  description?: string;

  // Dynamic value support
  valueSource?: 'static' | 'variable' | 'expression';
  value?: unknown;
}

export interface RequestBodyConfig {
  contentType:
    | 'application/json'
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data'
    | 'text/plain';

  // Body type
  bodyType: 'template' | 'schema' | 'raw';

  // For template: JSON with {{variable}} placeholders
  template?: string;

  // For schema: Define structure
  schema?: BodySchema;

  // For raw: Static content
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

// ============================================
// Response Mapping Types
// ============================================

export interface ResponseMappingConfig {
  // Where is the data in the response?
  dataPath: string; // JSONPath: '$.data.items'

  // How to map response fields to Shard fields
  fieldMappings: FieldMapping[];

  // Target ShardType for creating shards
  targetShardTypeId?: string;

  // Unique identifier field for deduplication
  identifierField: string;

  // Error handling
  errorPath?: string; // JSONPath to error message

  // Metadata extraction
  metadataMapping?: {
    totalCount?: string;
    pageInfo?: string;
  };
}

export interface FieldMapping {
  // Source (from API response)
  source: string; // JSONPath in response

  // Target (Shard field)
  target: string; // Field name in Shard

  // Transformation
  transform?: TransformConfig;

  // Default value if source is null/missing
  default?: unknown;

  // Skip if empty
  skipIfEmpty?: boolean;
}

export type TransformType =
  | 'direct'
  | 'concat'
  | 'split'
  | 'map'
  | 'date'
  | 'number'
  | 'boolean'
  | 'template'
  | 'expression'
  | 'lookup';

export interface TransformConfig {
  type: TransformType;
  config?: Record<string, unknown>;
}

// ============================================
// Pagination Types
// ============================================

export type PaginationType = 'offset' | 'cursor' | 'page' | 'link';

export interface PaginationConfig {
  type: PaginationType;

  // For offset pagination
  offsetParam?: string;
  limitParam?: string;
  maxLimit?: number;

  // For cursor pagination
  cursorParam?: string;
  cursorPath?: string;

  // For page pagination
  pageParam?: string;
  pageSizeParam?: string;

  // For link pagination
  nextLinkPath?: string;

  // How to detect end of data
  endCondition: {
    type: 'empty_array' | 'count_less_than_limit' | 'cursor_null' | 'has_more_field';
    field?: string;
  };
}

// ============================================
// Webhook Receiver Types
// ============================================

export interface WebhookReceiverConfig {
  // Webhook endpoint (generated by system)
  webhookUrl?: string;
  webhookSecret: string;

  // Signature verification
  signatureConfig?: {
    header: string;
    algorithm: 'hmac-sha256' | 'hmac-sha1' | 'none';
    signaturePrefix?: string;
  };

  // Event routing
  eventRouting: WebhookEventRouting[];

  // Response
  responseStatus: number;
  responseBody?: string;
}

export interface WebhookEventRouting {
  // How to identify event type
  eventTypePath: string;
  eventTypeValue: string;

  // What to do with this event
  action: 'create_shard' | 'update_shard' | 'delete_shard' | 'trigger_sync' | 'custom';

  // Mapping for create/update
  targetShardTypeId?: string;
  dataPath?: string;
  fieldMappings?: FieldMapping[];

  // Identifier for update/delete
  identifierPath?: string;
}

// ============================================
// Testing Types
// ============================================

export interface EndpointTestConfig {
  // Test data for path/query params
  testParams?: Record<string, unknown>;

  // Test body data
  testBody?: Record<string, unknown>;

  // Expected response
  expectations?: {
    statusCode?: number;
    bodyContains?: string[];
    jsonPath?: { path: string; value: unknown }[];
  };
}

export interface TestResult {
  success: boolean;

  // Request details
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };

  // Response details
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
    latencyMs: number;
  };

  // Mapping preview
  mappingPreview?: {
    rawData: unknown;
    mappedData: unknown;
    errors: string[];
  };

  // Errors
  error?: string;
}

// ============================================
// Execution Types
// ============================================

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

// ============================================
// Shard Structured Data
// ============================================

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











