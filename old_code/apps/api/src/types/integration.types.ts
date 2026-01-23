/**
 * Integration System Types
 * External service integrations with sync capabilities
 */

// ============================================
// Integration Definition (System-level)
// ============================================

/**
 * Integration categories
 */
export enum IntegrationCategory {
  CRM = 'crm',
  COMMUNICATION = 'communication',
  DATA_SOURCE = 'data_source',
  STORAGE = 'storage',
  EMAIL = 'email',
  CUSTOM = 'custom',
  AI_PROVIDER = 'ai_provider',
}

/**
 * Integration capabilities
 */
export type IntegrationCapability =
  | 'read'
  | 'write'
  | 'delete'
  | 'search'
  | 'realtime'
  | 'bulk'
  | 'attachments';

/**
 * Authentication types
 */
export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'custom';

/**
 * Connection scope
 */
export type ConnectionScope = 'system' | 'tenant' | 'user';

/**
 * Integration status
 */
export type IntegrationStatus = 'active' | 'beta' | 'deprecated' | 'disabled';

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string; // Optional user info endpoint for OAuth providers
  scopes: string[];
  clientIdEnvVar?: string;
  clientSecretEnvVar?: string;
  redirectUri: string;
  pkce: boolean;
  additionalParams?: Record<string, string>;
}

/**
 * Integration entity that can be synced
 */
export interface IntegrationEntity {
  name: string;
  displayName: string;
  description?: string;
  fields: IntegrationEntityField[];
  supportsPull: boolean;
  supportsPush: boolean;
  supportsDelete: boolean;
  supportsWebhook: boolean;
  idField: string;
  modifiedField?: string;
}

/**
 * Field in an integration entity
 */
export interface IntegrationEntityField {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';
  required: boolean;
  readOnly?: boolean;
  description?: string;
}

/**
 * Integration definition (system-level, managed by super admins)
 * @deprecated Use IntegrationProviderDocument instead
 */
export interface IntegrationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;
  
  // Visibility & Access
  visibility: 'public' | 'superadmin_only';
  isPremium: boolean;
  requiredPlan?: string;
  
  // Capabilities
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  
  // Authentication
  authType: AuthType;
  oauthConfig?: OAuthConfig;
  
  // Data entities this integration can sync
  availableEntities: IntegrationEntity[];
  
  // Multi-shard type support
  entityMappings?: EntityToShardTypeMapping[];
  
  // System-wide or per-tenant
  connectionScope: ConnectionScope;
  
  // Status
  status: IntegrationStatus;
  version: string;
  
  // Metadata
  documentationUrl?: string;
  supportUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration Provider Document (Container-based)
 * System-level catalog of all available integrations
 */
export interface IntegrationProviderDocument {
  id: string;
  category: string; // Partition key (e.g., "crm", "communication", "data_source", "storage", "custom")
  name: string; // Internal name
  displayName: string; // User-friendly name
  provider: string; // Unique identifier (e.g., "salesforce")
  description?: string;
  
  // Status & Audience (Super Admin controlled)
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant'; // Replaces visibility and connectionScope
  // audience: 'system' = not visible to tenant admins, system-level only
  // audience: 'tenant' = visible to tenant admins, they can configure per-tenant
  
  // Capabilities & Features
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean; // Can be used by notification system (e.g., Teams, Slack)
  supportsSearch: boolean; // Adapter provides search capability
  searchableEntities?: string[]; // Which entities can be searched (e.g., ["Account", "Contact", "Opportunity"])
  searchCapabilities?: {
    fullText: boolean; // Supports full-text search
    fieldSpecific: boolean; // Supports field-specific search
    filtered: boolean; // Supports filtered search
  };
  requiresUserScoping: boolean; // Integration requires user-level scoping (not tenant-wide)
  // When true: search and sync must be scoped to individual users
  // Examples: Gmail (user emails), Slack (user-accessible channels), Salesforce (user opportunities), GDrive (user documents)
  
  // Authentication Configuration
  authType: AuthType;
  oauthConfig?: OAuthConfig;
  
  // Entity Mappings
  availableEntities: IntegrationEntity[];
  entityMappings?: EntityToShardTypeMapping[];
  
  // Metadata
  icon: string; // Icon name/identifier
  color: string;
  documentationUrl?: string;
  supportUrl?: string;
  version: string;
  
  // Pricing (if applicable)
  isPremium?: boolean;
  requiredPlan?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Super admin user ID
  updatedBy: string;
}

// ============================================
// Multi-Shard Type Support
// ============================================

/**
 * Maps external integration entities to Castiel shard types
 * Allows one external entity to create multiple shard types
 */
export interface EntityToShardTypeMapping {
  /** External entity name (e.g., "Account", "Contact") */
  integrationEntity: string;
  
  /** Supported shard type IDs for this entity */
  supportedShardTypes: string[];
  
  /** Default shard type to use if not specified */
  defaultShardType: string;
  
  /** Pre-built conversion schema IDs for this entity */
  conversionSchemas?: string[];
  
  /** Supports bidirectional sync for this entity */
  bidirectionalSync: boolean;
  
  /** Description of the mapping */
  description?: string;
}

/**
 * Relationship mapping between external entities
 * Preserves relationships when syncing to shards
 */
export interface RelationshipMapping {
  /** Source entity name */
  sourceEntity: string;
  
  /** Target entity name */
  targetEntity: string;
  
  /** Type of relationship */
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  
  /** Field in source that links to target */
  sourceField: string;
  
  /** Field in target that serves as identifier */
  targetField: string;
  
  /** Cascade sync related records */
  cascadeSync: boolean;
  
  /** Shard relationship type to create */
  shardRelationshipType?: string;
  
  /** Description */
  description?: string;
}

/**
 * Create integration definition input
 */
export interface CreateIntegrationDefinitionInput {
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon?: string;
  color?: string;
  visibility: 'public' | 'superadmin_only';
  isPremium?: boolean;
  requiredPlan?: string;
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  authType: AuthType;
  oauthConfig?: OAuthConfig;
  availableEntities: IntegrationEntity[];
  connectionScope: ConnectionScope;
  status?: IntegrationStatus;
  version?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

/**
 * Update integration definition input
 */
export interface UpdateIntegrationDefinitionInput {
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'superadmin_only';
  isPremium?: boolean;
  requiredPlan?: string;
  capabilities?: IntegrationCapability[];
  supportedSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  oauthConfig?: OAuthConfig;
  availableEntities?: IntegrationEntity[];
  status?: IntegrationStatus;
  version?: string;
  documentationUrl?: string;
  supportUrl?: string;
}

// ============================================
// Tenant Integration (Tenant-level)
// ============================================

/**
 * Tenant integration status
 */
export type TenantIntegrationStatus = 'pending' | 'connected' | 'error' | 'disabled';

/**
 * Tenant integration instance
 * @deprecated Use IntegrationDocument instead
 */
export interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationId: string;
  
  // Status
  status: TenantIntegrationStatus;
  enabledAt: Date;
  enabledBy: string;
  
  // Connection
  connectionId?: string;
  lastConnectedAt?: Date;
  connectionError?: string;
  
  // Configuration
  settings: Record<string, any>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync frequency configuration
 */
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';

/**
 * Entity mapping for sync
 */
export interface EntityMapping {
  integrationEntity: string;
  shardTypeId: string;
  fieldMappings: Record<string, string>;
}

/**
 * Pull filter for sync
 */
export interface PullFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

/**
 * Integration Document (Container-based)
 * Tenant-specific integration instances with configuration
 */
export interface IntegrationDocument {
  id: string;
  tenantId: string; // Partition key
  integrationId: string; // Reference to integration_providers.id
  providerName: string; // e.g., "salesforce" (denormalized for queries)
  
  // Instance Identity (for multiple instances of same provider)
  name: string; // User-defined name/label (e.g., "Salesforce - Sales Team")
  icon?: string; // Icon name/identifier (inherited from provider by default)
  description?: string; // Optional description
  
  // Credentials Reference (Key Vault)
  credentialSecretName: string; // Azure Key Vault secret name
  // Credentials are stored in Azure Key Vault, not in container
  // Format: e.g., "tenant-{tenantId}-{providerName}-{instanceId}-oauth"
  // For user-scoped: "tenant-{tenantId}-user-{userId}-{providerName}-{instanceId}-oauth"
  
  // Configuration
  settings: Record<string, any>; // Tenant-specific settings
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncFrequency?: SyncFrequency;
    entityMappings: EntityMapping[];
    pullFilters?: PullFilter[];
    syncUserScoped?: boolean; // Sync scoped to individual users (configurable per integration)
    // When true: sync only data accessible to specific users
    // When false or undefined: sync tenant-wide data
  };
  userScoped?: boolean; // Enable user-level scoping for this integration instance
  // When true: search and sync filtered by user permissions/access
  // When false or undefined: tenant-wide access
  // Can override provider's requiresUserScoping setting
  
  // Data Access Control (Tenant Admin configured)
  allowedShardTypes: string[]; // Which shard types this integration can access
  // e.g., ["c_company", "c_contact"] - integration can only access these shard types
  // Empty array = no access, undefined/null = access to all supported types
  
  // Search Configuration (Tenant Admin configured)
  searchEnabled?: boolean; // Enable/disable search for this integration instance
  searchableEntities?: string[]; // Which entities can be searched (subset of provider's searchableEntities)
  // e.g., ["Account", "Contact"] - only search these entities, even if provider supports more
  // undefined/null = use all provider's searchableEntities
  searchFilters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  
  // Connection Status
  status: TenantIntegrationStatus; // 'pending' | 'connected' | 'error' | 'disabled'
  connectionStatus?: ConnectionStatus; // 'active' | 'expired' | 'revoked' | 'error'
  lastConnectedAt?: Date;
  lastConnectionTestAt?: Date; // When connection was last tested
  lastConnectionTestResult?: 'success' | 'failed'; // Result of last connection test
  connectionError?: string;
  
  // OAuth-specific (if applicable)
  instanceUrl?: string; // For OAuth (Salesforce instance, etc.)
  
  // Metadata
  enabledAt: Date;
  enabledBy: string; // Tenant admin user ID
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create tenant integration input
 */
export interface CreateTenantIntegrationInput {
  tenantId: string;
  integrationId: string;
  enabledBy: string;
  settings?: Record<string, any>;
}

/**
 * Update tenant integration input
 */
export interface UpdateTenantIntegrationInput {
  status?: TenantIntegrationStatus;
  connectionId?: string;
  connectionError?: string;
  settings?: Record<string, any>;
}

// ============================================
// Integration Connection (Credentials)
// ============================================

/**
 * Connection status
 */
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error' | 'archived';

/**
 * OAuth tokens
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string[];
}

/**
 * Integration connection (stores credentials)
 * Updated to support user-scoped connections
 */
export interface IntegrationConnection {
  id: string;
  integrationId: string; // Partition key - reference to integrations.id
  
  // Scope
  scope: 'system' | 'tenant' | 'user'; // Extended to support user-scoped connections
  tenantId?: string; // Required for tenant and user scopes
  userId?: string; // Required for user scope
  
  // Authentication
  authType: AuthType;
  
  // Encrypted credentials (for non-OAuth)
  encryptedCredentials?: string;
  encryptionKeyId?: string;
  
  // OAuth specific (stored separately for token refresh)
  oauth?: {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenType: string;
    expiresAt?: Date;
    scope?: string[];
  };
  
  // Status
  status: ConnectionStatus;
  lastValidatedAt?: Date;
  validationError?: string;
  
  // Usage tracking
  lastUsedAt?: Date;
  usageCount?: number;
  
  // Metadata
  displayName?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create connection input
 */
export interface CreateConnectionInput {
  integrationId: string;
  scope: ConnectionScope;
  tenantId?: string;
  authType: AuthType;
  credentials: ConnectionCredentials;
  displayName?: string;
  createdBy: string;
}

/**
 * Connection credentials (before encryption)
 */
export type ConnectionCredentials =
  | { type: 'api_key'; apiKey: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2'; accessToken: string; refreshToken?: string; expiresAt?: Date; scope?: string[] }
  | { type: 'custom'; data: Record<string, any> };

/**
 * OAuth state for authorization flow
 */
export interface OAuthState {
  integrationId: string;
  tenantId?: string;
  userId: string;
  returnUrl: string;
  nonce: string;
  codeVerifier?: string;
  expiresAt: Date;
}

// ============================================
// List Options
// ============================================

/**
 * Integration list filter
 */
export interface IntegrationListFilter {
  category?: IntegrationCategory;
  visibility?: 'public' | 'superadmin_only';
  status?: IntegrationStatus;
  isPremium?: boolean;
  connectionScope?: ConnectionScope;
}

/**
 * Integration list options
 */
export interface IntegrationListOptions {
  filter?: IntegrationListFilter;
  limit?: number;
  offset?: number;
}

/**
 * Integration list result
 */
export interface IntegrationListResult {
  integrations: IntegrationDefinition[];
  total: number;
  hasMore: boolean;
}

/**
 * Tenant integration list filter
 */
export interface TenantIntegrationListFilter {
  tenantId: string;
  status?: TenantIntegrationStatus;
  integrationId?: string;
}

/**
 * Tenant integration list options
 */
export interface TenantIntegrationListOptions {
  filter: TenantIntegrationListFilter;
  limit?: number;
  offset?: number;
}

/**
 * Tenant integration list result
 */
export interface TenantIntegrationListResult {
  integrations: TenantIntegration[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Integration Catalog (Super Admin Management)
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

/**
 * Integration catalog entry (managed by super admins)
 * Defines the integration and its visibility/access rules
 */
export interface IntegrationCatalogEntry {
  id: string;
  integrationId: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;

  // Visibility & Access Control
  visibility: 'public' | 'superadmin_only';
  requiresApproval: boolean;
  beta: boolean;
  deprecated: boolean;

  // Pricing & Tier Requirements
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null; // null = all, array = whitelist
  blockedTenants?: string[]; // explicitly blocked

  // Features & Capabilities
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  rateLimit: RateLimitConfig;

  // Authentication
  authType: AuthType;
  oauthConfig?: OAuthConfig;
  requiredScopes?: string[];

  // Data Entities
  availableEntities: IntegrationEntity[];

  // Shard Type Support (Key Feature)
  supportedShardTypes: string[]; // e.g., ["contact", "account", "opportunity"]
  shardMappings: EntityToShardTypeMapping[];
  relationshipMappings?: RelationshipMapping[];

  // Documentation & Support
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;

  // Status & Versioning
  version: string;
  status: IntegrationStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Create integration catalog entry input
 */
export interface CreateIntegrationCatalogInput {
  integrationId: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon?: string;
  color?: string;
  visibility: 'public' | 'superadmin_only';
  requiresApproval?: boolean;
  beta?: boolean;
  deprecated?: boolean;
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null;
  blockedTenants?: string[];
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  rateLimit?: RateLimitConfig;
  authType: AuthType;
  oauthConfig?: OAuthConfig;
  requiredScopes?: string[];
  availableEntities: IntegrationEntity[];
  supportedShardTypes: string[];
  shardMappings: EntityToShardTypeMapping[];
  relationshipMappings?: RelationshipMapping[];
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  status?: IntegrationStatus;
  version?: string;
  createdBy: string;
}

/**
 * Update integration catalog entry input
 */
export interface UpdateIntegrationCatalogInput {
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'superadmin_only';
  requiresApproval?: boolean;
  beta?: boolean;
  deprecated?: boolean;
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null;
  blockedTenants?: string[];
  capabilities?: IntegrationCapability[];
  supportedSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime?: boolean;
  supportsWebhooks?: boolean;
  rateLimit?: RateLimitConfig;
  oauthConfig?: OAuthConfig;
  requiredScopes?: string[];
  availableEntities?: IntegrationEntity[];
  supportedShardTypes?: string[];
  shardMappings?: EntityToShardTypeMapping[];
  relationshipMappings?: RelationshipMapping[];
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  status?: IntegrationStatus;
  version?: string;
  updatedBy: string;
}

/**
 * Integration visibility rule (per tenant)
 */
export interface IntegrationVisibilityRule {
  id: string;
  tenantId: string;
  integrationId: string;

  // Visibility state
  isVisible: boolean;
  isEnabled: boolean;
  requiresApproval: boolean;
  isApproved: boolean;

  // Pricing
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  billingTierId?: string;

  // Custom overrides
  customRateLimit?: Partial<RateLimitConfig>;
  customCapabilities?: IntegrationCapability[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];

  // Request/Approval tracking
  requestedAt?: Date;
  requestedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  deniedAt?: Date;
  denialReason?: string;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create visibility rule input
 */
export interface CreateVisibilityRuleInput {
  tenantId: string;
  integrationId: string;
  isVisible?: boolean;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  isApproved?: boolean;
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  billingTierId?: string;
  customRateLimit?: Partial<RateLimitConfig>;
  customCapabilities?: IntegrationCapability[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  requestedBy?: string;
  notes?: string;
}

/**
 * Update visibility rule input
 */
export interface UpdateVisibilityRuleInput {
  isVisible?: boolean;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  isApproved?: boolean;
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  billingTierId?: string;
  customRateLimit?: Partial<RateLimitConfig>;
  customCapabilities?: IntegrationCapability[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  approvedBy?: string;
  denialReason?: string;
  notes?: string;
}

/**
 * Filtered integrations for tenant view
 */
export interface TenantCatalogView {
  integrations: IntegrationCatalogEntry[];
  visibility: Record<string, IntegrationVisibilityRule>;
  unavailableIntegrations: Array<{
    integrationId: string;
    name: string;
    reason: 'requires_plan' | 'requires_approval' | 'blocked' | 'superadmin_only';
    requiredPlan?: string;
  }>;
  total: number;
  hasMore: boolean;
}

/**
 * Catalog list filter
 */
export interface CatalogListFilter {
  category?: IntegrationCategory;
  visibility?: 'public' | 'superadmin_only';
  status?: IntegrationStatus;
  requiredPlan?: string;
  searchTerm?: string;
  beta?: boolean;
  deprecated?: boolean;
}

/**
 * Catalog list options
 */
export interface CatalogListOptions {
  filter?: CatalogListFilter;
  limit?: number;
  offset?: number;
}

/**
 * Catalog list result
 */
export interface CatalogListResult {
  entries: IntegrationCatalogEntry[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Search Types
// ============================================

/**
 * Search options for integration adapters
 */
export interface SearchOptions {
  query: string; // Search query string
  entities?: string[]; // Which entities to search (if not provided, search all)
  filters?: {
    dateRange?: { start?: Date; end?: Date };
    fieldFilters?: Record<string, any>;
    customFilters?: Record<string, any>;
  };
  limit?: number; // Max results per entity
  offset?: number; // Pagination offset
  userId?: string; // User ID for user-scoped integrations (Castiel user ID)
  externalUserId?: string; // External user ID from the integration system (for filtering API calls)
  tenantId: string; // Tenant ID
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  entity: string; // Entity type (e.g., "Account", "Contact", "Message")
  title: string;
  description?: string;
  url?: string; // Link to item in external system
  score: number; // Relevance score (0-1)
  metadata?: Record<string, any>; // Additional metadata
  highlights?: string[]; // Highlighted matching text
  integrationId: string; // Which integration this result came from
  integrationName: string; // Integration instance name
  providerName: string; // Provider name
}/**
 * Search result
 */
export interface SearchResult {
  results: SearchResultItem[];
  total: number;
  took: number; // Milliseconds
  hasMore: boolean;
}

/**
 * Integration search options
 */
export interface IntegrationSearchOptions {
  query: string;
  entities?: string[];
  filters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  limit?: number;
  offset?: number;
  integrationIds?: string[]; // Filter to specific integrations
}/**
 * Integration search result
 */
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

// ============================================
// Configuration Types
// ============================================/**
 * Sync configuration
 */
export interface SyncConfig {
  syncEnabled: boolean;
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
  syncFrequency?: SyncFrequency;
  entityMappings: EntityMapping[];
  pullFilters?: PullFilter[];
  syncUserScoped?: boolean;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  searchEnabled: boolean;
  searchableEntities?: string[];
  searchFilters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
}

/**
 * Allowed shard types (data access control)
 */
export type AllowedShardTypes = string[]; // Array of shard type IDs
