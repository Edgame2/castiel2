/**
 * Widget Catalog Types (Frontend)
 * TypeScript interfaces for the frontend widget catalog management
 */

import type { WidgetType, GridSize } from '@castiel/shared-types';

// ============================================================================
// Enums
// ============================================================================

export enum WidgetCatalogStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  HIDDEN = 'hidden',
}

export enum WidgetVisibilityLevel {
  ALL = 'all',
  AUTHENTICATED = 'authenticated',
  TENANT = 'tenant',
  SPECIFIC_ROLES = 'specific_roles',
  HIDDEN = 'hidden',
}

// ============================================================================
// Widget Catalog Entry
// ============================================================================

export interface WidgetCatalogEntry {
  id: string;
  widgetType: WidgetType;
  catalogType: 'system';
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  thumbnail?: string;
  status: WidgetCatalogStatus;
  isDefault: boolean;
  isFeatured: boolean;
  visibilityLevel: WidgetVisibilityLevel;
  allowedRoles?: string[];
  defaultSize: GridSize;
  defaultConfig: Record<string, unknown>;
  minSize?: GridSize;
  maxSize?: GridSize;
  allowUserConfiguration: boolean;
  configurableFields?: string[];
  version: number;
  tags?: string[];
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// Tenant Widget Catalog Override
// ============================================================================

export interface TenantWidgetCatalogOverride {
  id: string;
  tenantId: string;
  widgetCatalogEntryId: string;
  visibleToTenant: boolean;
  customVisibilityLevel?: WidgetVisibilityLevel;
  customAllowedRoles?: string[];
  tenantSpecificRoles?: string[];
  enableForTenant: boolean;
  featuredForTenant: boolean;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// Tenant Widget Catalog Config
// ============================================================================

export interface TenantWidgetCatalogConfig {
  tenantId: string;
  enableCustomWidgets: boolean;
  enableWidgetSharing: boolean;
  enableWidgetExport: boolean;
  visibleWidgetIds: string[];
  hiddenWidgetIds: string[];
  featuredWidgetIds: string[];
  roleBasedWidgetAccess?: Record<string, string[]>;
  customCategoryLabels?: Record<string, string>;
  defaultWidgetCatalogEntryIds: string[];
  maxWidgetsPerDashboard: number;
  maxCustomQueryWidgets: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// Widget Catalog Entry with Tenant Override
// ============================================================================

export interface WidgetCatalogEntryWithTenantOverride extends WidgetCatalogEntry {
  tenantOverride?: TenantWidgetCatalogOverride;
  visibleToUser: boolean;
  userAllowedRoles: string[];
}

// ============================================================================
// API Request/Response Types
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
  version: number;
}

export interface UpdateTenantWidgetAccessInput {
  widgetCatalogEntryId: string;
  visibleToTenant?: boolean;
  customVisibilityLevel?: WidgetVisibilityLevel;
  customAllowedRoles?: string[];
  enableForTenant?: boolean;
  featuredForTenant?: boolean;
  version: number;
}

export interface UpdateTenantWidgetConfigInput {
  visibleWidgetIds?: string[];
  hiddenWidgetIds?: string[];
  featuredWidgetIds?: string[];
  roleBasedWidgetAccess?: Record<string, string[]>;
  defaultWidgetCatalogEntryIds?: string[];
  maxWidgetsPerDashboard?: number;
  maxCustomQueryWidgets?: number;
  version: number;
}

// ============================================================================
// List Response Types
// ============================================================================

export interface WidgetCatalogListResult {
  items: WidgetCatalogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface WidgetCatalogUserListResult {
  items: WidgetCatalogEntryWithTenantOverride[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
