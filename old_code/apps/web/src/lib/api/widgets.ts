/**
 * Widget Catalog API Client
 * API client for widget catalog management
 */

import { apiClient } from '@/lib/api/client';
import type {
  WidgetCatalogEntry,
  TenantWidgetCatalogOverride,
  TenantWidgetCatalogConfig,
  WidgetCatalogListResult,
  WidgetCatalogUserListResult,
  CreateWidgetCatalogEntryInput,
  UpdateWidgetCatalogEntryInput,
  UpdateTenantWidgetAccessInput,
  UpdateTenantWidgetConfigInput,
  ApiResponse,
} from '@/types/widget-catalog';

// ============================================================================
// SuperAdmin: Widget Catalog Entry Management
// ============================================================================

/**
 * Create widget catalog entry (SuperAdmin only)
 */
export async function createWidgetCatalogEntry(
  data: CreateWidgetCatalogEntryInput
): Promise<WidgetCatalogEntry> {
  const response = await apiClient.post<ApiResponse<WidgetCatalogEntry>>(
    `/api/v1/admin/widget-catalog`,
    data
  );
  return response.data.data!;
}

/**
 * Get widget catalog entry by ID
 */
export async function getWidgetCatalogEntry(entryId: string): Promise<WidgetCatalogEntry> {
  const response = await apiClient.get<ApiResponse<WidgetCatalogEntry>>(
    `/api/v1/admin/widget-catalog/${entryId}`
  );
  return response.data.data!;
}

/**
 * List widget catalog entries (SuperAdmin only)
 */
export async function listWidgetCatalogEntries(
  params?: Record<string, unknown>
): Promise<WidgetCatalogListResult> {
  const queryString = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, String(value));
      }
    });
  }

  const response = await apiClient.get<ApiResponse<WidgetCatalogListResult>>(
    `/api/v1/admin/widget-catalog?${queryString.toString()}`
  );
  return response.data.data!;
}

/**
 * Update widget catalog entry (SuperAdmin only)
 */
export async function updateWidgetCatalogEntry(
  entryId: string,
  data: UpdateWidgetCatalogEntryInput
): Promise<WidgetCatalogEntry> {
  const response = await apiClient.patch<ApiResponse<WidgetCatalogEntry>>(
    `/api/v1/admin/widget-catalog/${entryId}`,
    data
  );
  return response.data.data!;
}

/**
 * Delete widget catalog entry (SuperAdmin only)
 */
export async function deleteWidgetCatalogEntry(entryId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/widget-catalog/${entryId}`);
}

// ============================================================================
// TenantAdmin: Widget Access & Visibility Customization
// ============================================================================

/**
 * Get tenant widget catalog configuration (TenantAdmin only)
 */
export async function getTenantWidgetConfig(
  tenantId: string
): Promise<TenantWidgetCatalogConfig> {
  const response = await apiClient.get<ApiResponse<TenantWidgetCatalogConfig>>(
    `/api/v1/admin/tenants/${tenantId}/widget-access`
  );
  return response.data.data!;
}

/**
 * Update tenant widget catalog configuration (TenantAdmin only)
 */
export async function updateTenantWidgetConfig(
  tenantId: string,
  data: UpdateTenantWidgetConfigInput
): Promise<TenantWidgetCatalogConfig> {
  const response = await apiClient.put<ApiResponse<TenantWidgetCatalogConfig>>(
    `/api/v1/admin/tenants/${tenantId}/widget-access`,
    data
  );
  return response.data.data!;
}

/**
 * Update widget access for specific widget (TenantAdmin only)
 */
export async function updateTenantWidgetAccess(
  tenantId: string,
  widgetId: string,
  data: Omit<UpdateTenantWidgetAccessInput, 'widgetCatalogEntryId'>
): Promise<TenantWidgetCatalogOverride> {
  const response = await apiClient.patch<ApiResponse<TenantWidgetCatalogOverride>>(
    `/api/v1/admin/tenants/${tenantId}/widget-access/${widgetId}`,
    data
  );
  return response.data.data!;
}

/**
 * Delete widget access override (TenantAdmin only)
 */
export async function deleteTenantWidgetAccess(
  tenantId: string,
  widgetId: string
): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tenants/${tenantId}/widget-access/${widgetId}`);
}

// ============================================================================
// User: Get Available Widgets
// ============================================================================

/**
 * Get available widgets for current user (with tenant overrides applied)
 */
export async function getUserWidgetCatalog(
  params?: Record<string, unknown>
): Promise<WidgetCatalogUserListResult> {
  const queryString = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, String(value));
      }
    });
  }

  const qs = queryString.toString();
  const response = await apiClient.get<ApiResponse<WidgetCatalogUserListResult>>(
    qs ? `/api/v1/widget-catalog?${qs}` : `/api/v1/widget-catalog`
  );
  return response.data.data!;
}
