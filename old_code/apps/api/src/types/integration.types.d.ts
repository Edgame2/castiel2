/**
 * Integration System Types
 * External service integrations with sync capabilities
 */
/**
 * Integration categories
 */
export declare enum IntegrationCategory {
    CRM = "crm",
    COMMUNICATION = "communication",
    DATA_SOURCE = "data_source",
    STORAGE = "storage",
    EMAIL = "email",
    CUSTOM = "custom",
    AI_PROVIDER = "ai_provider"
}
/**
 * Integration capabilities
 */
export type IntegrationCapability = 'read' | 'write' | 'delete' | 'search' | 'realtime' | 'bulk' | 'attachments';
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
    userInfoUrl?: string;
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
    visibility: 'public' | 'superadmin_only';
    isPremium: boolean;
    requiredPlan?: string;
    capabilities: IntegrationCapability[];
    supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
    supportsRealtime: boolean;
    supportsWebhooks: boolean;
    authType: AuthType;
    oauthConfig?: OAuthConfig;
    availableEntities: IntegrationEntity[];
    entityMappings?: EntityToShardTypeMapping[];
    connectionScope: ConnectionScope;
    status: IntegrationStatus;
    version: string;
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
    category: string;
    name: string;
    displayName: string;
    provider: string;
    description?: string;
    status: 'active' | 'beta' | 'deprecated' | 'disabled';
    audience: 'system' | 'tenant';
    capabilities: IntegrationCapability[];
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
    authType: AuthType;
    oauthConfig?: OAuthConfig;
    availableEntities: IntegrationEntity[];
    entityMappings?: EntityToShardTypeMapping[];
    icon: string;
    color: string;
    documentationUrl?: string;
    supportUrl?: string;
    version: string;
    isPremium?: boolean;
    requiredPlan?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
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
    status: TenantIntegrationStatus;
    enabledAt: Date;
    enabledBy: string;
    connectionId?: string;
    lastConnectedAt?: Date;
    connectionError?: string;
    settings: Record<string, any>;
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
    tenantId: string;
    integrationId: string;
    providerName: string;
    name: string;
    icon?: string;
    description?: string;
    credentialSecretName: string;
    settings: Record<string, any>;
    syncConfig?: {
        syncEnabled: boolean;
        syncDirection: 'inbound' | 'outbound' | 'bidirectional';
        syncFrequency?: SyncFrequency;
        entityMappings: EntityMapping[];
        pullFilters?: PullFilter[];
        syncUserScoped?: boolean;
    };
    userScoped?: boolean;
    allowedShardTypes: string[];
    searchEnabled?: boolean;
    searchableEntities?: string[];
    searchFilters?: {
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
    };
    status: TenantIntegrationStatus;
    connectionStatus?: ConnectionStatus;
    lastConnectedAt?: Date;
    lastConnectionTestAt?: Date;
    lastConnectionTestResult?: 'success' | 'failed';
    connectionError?: string;
    instanceUrl?: string;
    enabledAt: Date;
    enabledBy: string;
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
    integrationId: string;
    scope: 'system' | 'tenant' | 'user';
    tenantId?: string;
    userId?: string;
    authType: AuthType;
    encryptedCredentials?: string;
    encryptionKeyId?: string;
    oauth?: {
        accessTokenEncrypted: string;
        refreshTokenEncrypted?: string;
        tokenType: string;
        expiresAt?: Date;
        scope?: string[];
    };
    status: ConnectionStatus;
    lastValidatedAt?: Date;
    validationError?: string;
    lastUsedAt?: Date;
    usageCount?: number;
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
export type ConnectionCredentials = {
    type: 'api_key';
    apiKey: string;
} | {
    type: 'basic';
    username: string;
    password: string;
} | {
    type: 'oauth2';
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string[];
} | {
    type: 'custom';
    data: Record<string, any>;
};
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
    visibility: 'public' | 'superadmin_only';
    requiresApproval: boolean;
    beta: boolean;
    deprecated: boolean;
    requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
    allowedTenants?: string[] | null;
    blockedTenants?: string[];
    capabilities: IntegrationCapability[];
    supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
    supportsRealtime: boolean;
    supportsWebhooks: boolean;
    rateLimit: RateLimitConfig;
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
    isVisible: boolean;
    isEnabled: boolean;
    requiresApproval: boolean;
    isApproved: boolean;
    availableInPlan?: 'free' | 'pro' | 'enterprise';
    billingTierId?: string;
    customRateLimit?: Partial<RateLimitConfig>;
    customCapabilities?: IntegrationCapability[];
    customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
    requestedAt?: Date;
    requestedBy?: string;
    approvedAt?: Date;
    approvedBy?: string;
    deniedAt?: Date;
    denialReason?: string;
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
/**
 * Search options for integration adapters
 */
export interface SearchOptions {
    query: string;
    entities?: string[];
    filters?: {
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        fieldFilters?: Record<string, any>;
        customFilters?: Record<string, any>;
    };
    limit?: number;
    offset?: number;
    userId?: string;
    externalUserId?: string;
    tenantId: string;
}
/**
 * Search result item
 */
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
/**
 * Search result
 */
export interface SearchResult {
    results: SearchResultItem[];
    total: number;
    took: number;
    hasMore: boolean;
}
/**
 * Integration search options
 */
export interface IntegrationSearchOptions {
    query: string;
    entities?: string[];
    filters?: {
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
    };
    limit?: number;
    offset?: number;
    integrationIds?: string[];
}
/**
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
/**
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
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
    };
}
/**
 * Allowed shard types (data access control)
 */
export type AllowedShardTypes = string[];
//# sourceMappingURL=integration.types.d.ts.map