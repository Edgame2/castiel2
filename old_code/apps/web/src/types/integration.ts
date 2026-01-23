/**
 * Integration Types
 * Frontend type definitions for integrations
 */

export interface IntegrationProviderDocument {
  id: string;
  category: string;
  name: string;
  displayName: string;
  provider: string;
  description?: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant';
  capabilities: string[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean;
  supportsSearch: boolean;
  searchableEntities?: string[];
  searchCapabilities?: {
    fullText: boolean;
    fieldSpecific: boolean;
    filtered: boolean;
  };
  requiresUserScoping: boolean;
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: any;
  availableEntities: any[];
  entityMappings?: any[];
  icon: string;
  color: string;
  version: string;
  isPremium?: boolean;
  requiredPlan?: string;
  documentationUrl?: string;
  supportUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface IntegrationDocument {
  id: string;
  tenantId: string;
  integrationId: string;
  providerName: string;
  name: string;
  displayName?: string;
  icon?: string;
  color?: string;
  description?: string;
  credentialSecretName: string;
  settings: Record<string, any>;
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncFrequency?: string;
    entityMappings: any[];
    pullFilters?: any[];
    syncUserScoped?: boolean;
  };
  userScoped?: boolean;
  allowedShardTypes: string[];
  availableEntities?: any[];
  searchEnabled?: boolean;
  searchableEntities?: string[];
  searchFilters?: {
    dateRange?: { start?: string; end?: string };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  status: 'pending' | 'connected' | 'error' | 'disabled';
  connectionStatus?: 'active' | 'expired' | 'revoked' | 'error';
  authType?: 'oauth2' | 'api_key' | 'basic' | 'custom';
  lastConnectedAt?: string;
  lastConnectionTestAt?: string;
  lastConnectionTestResult?: 'success' | 'failed';
  connectionError?: string;
  instanceUrl?: string;
  documentationUrl?: string;
  enabledAt: string;
  enabledBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultItem {
  id: string;
  entity: string;
  title: string;
  description?: string;
  url?: string;
  score: number;
  metadata?: Record<string, any>;
  highlights?: string[];
  integrationId: string;
  integrationName: string;
  providerName: string;
}

export interface IntegrationSearchResult {
  results: SearchResultItem[];
  total: number;
  took: number;
  hasMore: boolean;
  integrations: Array<{
    integrationId: string;
    integrationName: string;
    providerName: string;
    resultCount: number;
    status: 'success' | 'error' | 'timeout';
    error?: string;
  }>;
}







