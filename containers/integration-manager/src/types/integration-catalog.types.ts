/**
 * Integration Catalog Types
 * Types for managing integration catalog entries and visibility rules
 */

import { IntegrationProvider } from './integration.types';

/**
 * Integration catalog entry (extends provider with catalog-specific fields)
 */
export interface IntegrationCatalogEntry extends IntegrationProvider {
  // Visibility & Access Control
  visibility: 'public' | 'superadmin_only';
  requiresApproval: boolean;
  beta: boolean;
  deprecated: boolean;

  // Pricing & Tier Requirements
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null; // null = all, array = whitelist
  blockedTenants?: string[]; // explicitly blocked

  // Rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  // Shard mappings
  shardMappings?: Array<{
    integrationEntity: string;
    supportedShardTypes: string[];
    defaultShardType: string;
    bidirectionalSync: boolean;
    description?: string;
  }>;

  // Metadata
  displayName: string;
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
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
  category: string;
  provider: string;
  icon?: string;
  color?: string;
  visibility: 'public' | 'superadmin_only';
  requiresApproval?: boolean;
  beta?: boolean;
  deprecated?: boolean;
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null;
  blockedTenants?: string[];
  authMethods: string[];
  supportedEntities: string[];
  webhookSupport?: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  shardMappings?: Array<{
    integrationEntity: string;
    supportedShardTypes: string[];
    defaultShardType: string;
    bidirectionalSync: boolean;
    description?: string;
  }>;
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'disabled';
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
  authMethods?: string[];
  supportedEntities?: string[];
  webhookSupport?: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  shardMappings?: Array<{
    integrationEntity: string;
    supportedShardTypes: string[];
    defaultShardType: string;
    bidirectionalSync: boolean;
    description?: string;
  }>;
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'disabled';
  version?: string;
  updatedBy: string;
}

/**
 * Catalog list filter
 */
export interface CatalogListFilter {
  category?: string;
  visibility?: 'public' | 'superadmin_only';
  status?: 'active' | 'beta' | 'deprecated' | 'disabled';
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
 * Integration visibility rule
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
  customRateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  customCapabilities?: string[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];

  // Request/Approval tracking
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
  customRateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  customCapabilities?: string[];
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
  customRateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  customCapabilities?: string[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
  notes?: string;
}
