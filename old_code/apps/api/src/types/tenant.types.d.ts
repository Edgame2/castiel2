/**
 * Tenant Management Types
 * Types for tenant/organization management
 */
import { Tenant, TenantSettings } from '@castiel/shared-types';
import type { TenantDocumentSettings } from './document.types.js';
/**
 * Tenant status
 */
export declare enum TenantStatus {
    PENDING = "pending",
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
/**
 * Tenant plan/tier
 */
export declare enum TenantPlan {
    FREE = "free",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
/**
 * Extended Tenant with additional fields
 */
export interface TenantDocument extends Omit<Tenant, 'createdAt' | 'updatedAt'> {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    status: TenantStatus;
    plan: TenantPlan;
    settings: TenantSettings;
    adminUserIds: string[];
    metadata: {
        region?: string;
        adminContactEmail?: string;
        ownerId?: string;
        billingEmail?: string;
        createdAt: string;
        updatedAt: string;
        activatedAt?: string;
    };
    documentSettings?: TenantDocumentSettings;
    partitionKey: string;
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
    adminUserIds?: string[];
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
    adminUserIds?: string[];
    metadata?: {
        adminContactEmail?: string;
        billingEmail?: string;
    };
}
/**
 * Tenant response (public-safe)
 */
export interface TenantResponse {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    status: TenantStatus;
    plan: TenantPlan;
    settings: TenantSettings;
    region?: string;
    adminUserIds: string[];
    createdAt: string;
    updatedAt: string;
    activatedAt?: string;
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
    tenants: TenantResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
//# sourceMappingURL=tenant.types.d.ts.map