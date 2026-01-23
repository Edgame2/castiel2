/**
 * Widget Catalog Types
 * Types for widget catalog management at platform and tenant levels
 * SuperAdmins manage system widget types; TenantAdmins only customize visibility/role access
 */

import type { WidgetType, WidgetPermissions } from './widget.types.js';
import type { GridSize } from './dashboard.types.js';

// ============================================================================
// Enums & Constants
// ============================================================================

export enum WidgetCatalogStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  HIDDEN = 'hidden',
}

export enum WidgetVisibilityLevel {
  ALL = 'all',                    // All authenticated users
  AUTHENTICATED = 'authenticated', // Only logged-in users
  TENANT = 'tenant',              // Tenant users only
  SPECIFIC_ROLES = 'specific_roles', // Specific roles only
  HIDDEN = 'hidden',              // Not visible (admins can still use)
}

// ============================================================================
// Widget Catalog Entry (System-wide, SuperAdmin-managed, immutable by Tenant)
// ============================================================================

/**
 * Widget template that can be used in catalogs
 * Created and managed by SuperAdmins only
 * TenantAdmins cannot modify base config, only visibility/role access
 */
export interface WidgetCatalogEntry {
  // Identity
  id: string;
  widgetType: WidgetType;
  catalogType: 'system'; // Only system catalog entries in Phase 1
  
  // Display Info
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  thumbnail?: string;
  
  // Status
  status: WidgetCatalogStatus;
  isDefault: boolean;  // Show in default widget palette
  isFeatured: boolean; // Highlight in UI
  
  // Visibility
  visibilityLevel: WidgetVisibilityLevel;
  allowedRoles?: string[];  // If visibilityLevel === SPECIFIC_ROLES
  
  // Configuration (Immutable by TenantAdmin)
  defaultSize: GridSize;
  defaultConfig: Record<string, unknown>;
  minSize?: GridSize;
  maxSize?: GridSize;
  
  // Permissions
  defaultPermissions: Partial<WidgetPermissions>;
  
  // Customization
  allowUserConfiguration: boolean;
  configurableFields?: string[];  // Fields users can customize
  
  // Metadata
  version: number;
  tags?: string[];
  sortOrder: number;  // Display order in catalog
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Tenant Widget Catalog Override (TenantAdmin-customizable visibility only)
// ============================================================================

/**
 * Tenant-level widget catalog customization
 * TenantAdmins can ONLY modify visibility and role-based access
 * Cannot change widget configuration, size, or other base properties
 */
export interface TenantWidgetCatalogOverride {
  id: string;
  tenantId: string;
  
  // Widget reference (immutable)
  widgetCatalogEntryId: string;
  
  // Visibility customization (TenantAdmin can modify these only)
  visibleToTenant: boolean;        // Hide/show widget for this tenant
  customVisibilityLevel?: WidgetVisibilityLevel; // Override visibility level
  customAllowedRoles?: string[];   // Override allowed roles for this tenant
  
  // Role-based customization (TenantAdmin can modify these only)
  tenantSpecificRoles?: string[];  // Additional tenant-specific roles
  
  // Feature flags (TenantAdmin can customize)
  enableForTenant: boolean;
  featuredForTenant: boolean;
  
  // Metadata
  version: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Tenant Widget Catalog Config (Settings)
// ============================================================================

/**
 * Tenant-level widget catalog configuration and settings
 */
export interface TenantWidgetCatalogConfig {
  tenantId: string;
  
  // Feature flags
  enableCustomWidgets: boolean;
  enableWidgetSharing: boolean;
  enableWidgetExport: boolean;
  
  // Widget management
  visibleWidgetIds: string[];  // Widget catalog entry IDs visible to this tenant
  hiddenWidgetIds: string[];   // Widget catalog entry IDs hidden for this tenant
  featuredWidgetIds: string[]; // Widget catalog entry IDs to feature
  
  // Role-based visibility
  roleBasedWidgetAccess?: Record<string, string[]>;  // role ID -> widget catalog entry IDs
  
  // Branding
  customCategoryLabels?: Record<string, string>;
  
  // Defaults for new dashboards
  defaultWidgetCatalogEntryIds: string[];  // Catalog entry IDs shown to new users
  
  // Limits
  maxWidgetsPerDashboard: number;
  maxCustomQueryWidgets: number;
  
  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// API Request/Response Types (SuperAdmin)
// ============================================================================

export interface CreateWidgetCatalogEntryInput {
  widgetType: WidgetType;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  thumbnail?: string;
  defaultSize: GridSize;
  defaultConfig: Record<string, unknown>;
  visibilityLevel: WidgetVisibilityLevel;
  allowedRoles?: string[];
  isDefault?: boolean;
  isFeatured?: boolean;
  status?: WidgetCatalogStatus;
}

export interface UpdateWidgetCatalogEntryInput {
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  thumbnail?: string;
  status?: WidgetCatalogStatus;
  isDefault?: boolean;
  isFeatured?: boolean;
  visibilityLevel?: WidgetVisibilityLevel;
  allowedRoles?: string[];
  defaultSize?: GridSize;
  defaultConfig?: Record<string, unknown>;
  minSize?: GridSize;
  maxSize?: GridSize;
  version: number; // For optimistic concurrency
}

// ============================================================================
// API Request/Response Types (TenantAdmin - Visibility Only)
// ============================================================================

export interface UpdateTenantWidgetAccessInput {
  widgetCatalogEntryId: string;
  visibleToTenant?: boolean;
  customVisibilityLevel?: WidgetVisibilityLevel;
  customAllowedRoles?: string[];
  enableForTenant?: boolean;
  featuredForTenant?: boolean;
  version: number; // For optimistic concurrency
}

export interface UpdateTenantWidgetConfigInput {
  visibleWidgetIds?: string[];
  hiddenWidgetIds?: string[];
  featuredWidgetIds?: string[];
  roleBasedWidgetAccess?: Record<string, string[]>;
  defaultWidgetCatalogEntryIds?: string[];
  maxWidgetsPerDashboard?: number;
  maxCustomQueryWidgets?: number;
  version: number; // For optimistic concurrency
}

// ============================================================================
// List & Search Types
// ============================================================================

export interface WidgetCatalogListOptions {
  tenantId?: string;
  status?: WidgetCatalogStatus;
  category?: string;
  visibilityLevel?: WidgetVisibilityLevel;
  search?: string;
  sort?: 'name' | 'category' | 'recent' | 'featured';
  page?: number;
  limit?: number;
}

export interface WidgetCatalogListResult {
  items: WidgetCatalogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface TenantWidgetOverrideListResult {
  items: TenantWidgetCatalogOverride[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Widget Catalog Response (with tenant overrides applied)
// ============================================================================

/**
 * Widget catalog entry with tenant overrides applied
 * Used in API responses to show what user actually sees
 */
export interface WidgetCatalogEntryWithTenantOverride extends WidgetCatalogEntry {
  tenantOverride?: TenantWidgetCatalogOverride;
  visibleToUser: boolean;
  userAllowedRoles: string[];
}
