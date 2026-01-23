/**
 * Custom Integrations API Client
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface CustomIntegration {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  integrationType: 'rest_api' | 'webhook' | 'graphql';
  baseUrl: string;
  authType: string;
  authConfig: AuthConfig;
  endpoints: CustomEndpoint[];
  webhookConfig?: WebhookConfig;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  status: 'active' | 'inactive' | 'error';
  lastTestedAt?: string;
  lastTestResult?: 'success' | 'failure';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'api_key'; keyName: string; keyLocation: 'header' | 'query' | 'body'; keyValue?: string }
  | { type: 'bearer'; token?: string }
  | { type: 'basic'; username: string; password?: string }
  | { type: 'oauth2'; grantType: string; tokenUrl: string; clientId: string; clientSecret?: string; scope?: string }
  | { type: 'custom_headers'; headers: Record<string, string> };

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
  tags?: string[];
}

export interface ParamConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array';
  default?: unknown;
  description?: string;
}

export interface RequestBodyConfig {
  contentType: string;
  bodyType: 'template' | 'schema' | 'raw';
  template?: string;
  schema?: Record<string, unknown>;
  raw?: string;
}

export interface ResponseMappingConfig {
  dataPath: string;
  fieldMappings: FieldMapping[];
  targetShardTypeId?: string;
  identifierField: string;
  errorPath?: string;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: {
    type: string;
    config?: Record<string, unknown>;
  };
  default?: unknown;
  skipIfEmpty?: boolean;
}

export interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page' | 'link';
  offsetParam?: string;
  limitParam?: string;
  cursorParam?: string;
  cursorPath?: string;
  pageParam?: string;
  pageSizeParam?: string;
  maxLimit?: number;
  endCondition: {
    type: string;
    field?: string;
  };
}

export interface WebhookConfig {
  webhookSecret?: string;
  signatureConfig?: {
    header: string;
    algorithm: 'hmac-sha256' | 'hmac-sha1' | 'none';
    signaturePrefix?: string;
  };
  eventRouting: WebhookEventRouting[];
  responseStatus?: number;
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

export interface ExecuteResult {
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

export interface CreateCustomIntegrationRequest {
  name: string;
  displayName: string;
  description?: string;
  integrationType: 'rest_api' | 'webhook' | 'graphql';
  baseUrl: string;
  authType: string;
  authConfig: AuthConfig;
  endpoints?: CustomEndpoint[];
  webhookConfig?: WebhookConfig;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface UpdateCustomIntegrationRequest extends Partial<CreateCustomIntegrationRequest> {
  status?: 'active' | 'inactive';
}

// ============================================
// API Functions
// ============================================

/**
 * List custom integrations
 */
export async function listCustomIntegrations(params?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ integrations: CustomIntegration[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const url = `/custom-integrations${searchParams.toString() ? `?${searchParams}` : ''}`;
  return apiClient.get(url);
}

/**
 * Get custom integration by ID
 */
export async function getCustomIntegration(id: string): Promise<CustomIntegration> {
  return apiClient.get(`/custom-integrations/${id}`);
}

/**
 * Create custom integration
 */
export async function createCustomIntegration(
  data: CreateCustomIntegrationRequest
): Promise<CustomIntegration & { webhookUrl?: string }> {
  return apiClient.post('/custom-integrations', data);
}

/**
 * Update custom integration
 */
export async function updateCustomIntegration(
  id: string,
  data: UpdateCustomIntegrationRequest
): Promise<CustomIntegration> {
  return apiClient.patch(`/custom-integrations/${id}`, data);
}

/**
 * Delete custom integration
 */
export async function deleteCustomIntegration(id: string): Promise<void> {
  return apiClient.delete(`/custom-integrations/${id}`);
}

/**
 * Test integration connection
 */
export async function testIntegrationConnection(id: string): Promise<TestResult> {
  return apiClient.post(`/custom-integrations/${id}/test`);
}

/**
 * Test specific endpoint
 */
export async function testEndpoint(
  integrationId: string,
  endpointId: string,
  params?: Record<string, unknown>,
  body?: unknown
): Promise<TestResult> {
  return apiClient.post(`/custom-integrations/${integrationId}/test/${endpointId}`, {
    params,
    body,
  });
}

/**
 * Execute endpoint
 */
export async function executeEndpoint(
  integrationId: string,
  endpointId: string,
  options: {
    params?: Record<string, unknown>;
    body?: unknown;
    createShards?: boolean;
  }
): Promise<ExecuteResult> {
  return apiClient.post(`/custom-integrations/${integrationId}/execute/${endpointId}`, options);
}

/**
 * Get webhook URL
 */
export async function getWebhookUrl(id: string): Promise<{ webhookUrl: string }> {
  return apiClient.get(`/custom-integrations/${id}/webhook-url`);
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(id: string): Promise<{ webhookUrl: string; message: string }> {
  return apiClient.post(`/custom-integrations/${id}/regenerate-secret`);
}











