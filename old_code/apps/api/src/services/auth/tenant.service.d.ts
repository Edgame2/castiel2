/**
 * Tenant Service
 * Business logic for tenant/organization management
 */
import { Container } from '@azure/cosmos';
import { CreateTenantRequest, UpdateTenantRequest, TenantResponse, TenantListQuery, TenantListResponse } from '../../types/tenant.types.js';
/**
 * Tenant Service
 */
export declare class TenantService {
    private tenantsContainer;
    constructor(tenantsContainer: Container);
    /**
     * Create a new tenant
     */
    createTenant(request: CreateTenantRequest, createdBy?: string): Promise<TenantResponse>;
    /**
     * Get tenant by ID
     */
    getTenant(tenantId: string): Promise<TenantResponse | null>;
    /**
     * Update tenant
     */
    updateTenant(tenantId: string, updates: UpdateTenantRequest): Promise<TenantResponse>;
    /**
     * Delete (soft delete) tenant
     */
    deleteTenant(tenantId: string): Promise<void>;
    /**
     * Activate tenant
     */
    activateTenant(tenantId: string): Promise<TenantResponse>;
    /**
     * List tenants with pagination and filtering
     */
    listTenants(query: TenantListQuery): Promise<TenantListResponse>;
    /**
     * Find tenant by slug
     */
    private findBySlug;
    /**
     * Find tenant by domain
     */
    private findByDomain;
    /**
     * Generate slug from name
     */
    private generateSlug;
    /**
     * Convert TenantDocument to TenantResponse
     */
    private toResponse;
    getTenantByDomain(domain: string): Promise<TenantResponse | null>;
    appendAdminUser(tenantId: string, userId: string): Promise<void>;
    /**
     * Ensure Tenants container exists
     */
    static ensureContainer(database: any): Promise<Container>;
}
//# sourceMappingURL=tenant.service.d.ts.map