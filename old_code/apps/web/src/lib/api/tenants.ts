/**
 * Tenant Management API Client
 * API functions for tenant/organization management
 */

import { apiClient } from './client';

/**
 * Tenant status enum
 */
export type TenantStatus = 'pending' | 'active' | 'inactive' | 'suspended';

/**
 * Tenant plan/tier enum
 */
export type TenantPlan = 'free' | 'pro' | 'enterprise';

/**
 * Tenant settings interface
 */
export interface TenantSettings {
  maxUsers?: number;
  maxStorage?: number; // in GB
  features?: {
    sso?: boolean;
    mfa?: boolean;
    audit?: boolean;
    apiAccess?: boolean;
    customBranding?: boolean;
  };
  security?: {
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSymbols?: boolean;
      expiryDays?: number;
    };
    sessionTimeout?: number; // in minutes
    ipWhitelist?: string[];
  };
  notifications?: {
    email?: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
}

/**
 * Tenant interface
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  region?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}

/**
 * Create tenant request
 */
export interface CreateTenantRequest {
  name: string;
  slug?: string;
  domain?: string;
  plan?: TenantPlan;
  region?: string;
  adminContactEmail?: string;
  settings?: Partial<TenantSettings>;
}

/**
 * Update tenant request
 */
export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  domain?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  settings?: Partial<TenantSettings>;
  metadata?: {
    adminContactEmail?: string;
    billingEmail?: string;
  };
}

/**
 * Tenant list query options
 */
export interface TenantListQuery {
  page?: number;
  limit?: number;
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
}

/**
 * Tenant list response
 */
export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Get list of tenants (platform admin)
 */
export async function getTenants(query?: TenantListQuery): Promise<TenantListResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.status) params.append('status', query.status);
  if (query?.plan) params.append('plan', query.plan);
  if (query?.search) params.append('search', query.search);

  const response = await apiClient.get<TenantListResponse>(
    `/tenants?${params.toString()}`
  );
  return response.data;
}

/**
 * Get tenant by ID
 */
export async function getTenant(tenantId: string): Promise<Tenant> {
  const response = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
  return response.data;
}

/**
 * Create a new tenant
 */
export async function createTenant(data: CreateTenantRequest): Promise<Tenant> {
  const response = await apiClient.post<Tenant>('/tenants', data);
  return response.data;
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: string,
  data: UpdateTenantRequest
): Promise<Tenant> {
  const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}`, data);
  return response.data;
}

/**
 * Delete (soft delete) tenant
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  await apiClient.delete(`/tenants/${tenantId}`);
}

/**
 * Activate tenant
 */
export async function activateTenant(tenantId: string): Promise<Tenant> {
  const response = await apiClient.post<Tenant>(
    `/tenants/${tenantId}/activate`
  );
  return response.data;
}
