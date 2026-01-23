/**
 * Tenant Service
 * Business logic for tenant/organization management
 */
import { randomBytes } from 'crypto';
import { TenantStatus, TenantPlan, } from '../../types/tenant.types.js';
/**
 * Tenant Service
 */
export class TenantService {
    tenantsContainer;
    constructor(tenantsContainer) {
        this.tenantsContainer = tenantsContainer;
    }
    /**
     * Create a new tenant
     */
    async createTenant(request, createdBy) {
        // Generate slug from name if not provided
        const slug = request.slug || this.generateSlug(request.name);
        // Check if slug already exists
        const existingTenant = await this.findBySlug(slug);
        if (existingTenant) {
            throw new Error(`Tenant with slug '${slug}' already exists`);
        }
        // Check if domain already exists (if provided)
        if (request.domain) {
            const existingDomain = await this.findByDomain(request.domain);
            if (existingDomain) {
                throw new Error(`Tenant with domain '${request.domain}' already exists`);
            }
        }
        const now = new Date().toISOString();
        const tenantId = randomBytes(16).toString('hex');
        const adminUserIds = request.adminUserIds && request.adminUserIds.length > 0
            ? request.adminUserIds
            : createdBy
                ? [createdBy]
                : [];
        const tenant = {
            id: tenantId,
            name: request.name,
            slug,
            domain: request.domain,
            status: TenantStatus.PENDING,
            plan: request.plan || TenantPlan.FREE,
            settings: request.settings || {},
            adminUserIds,
            metadata: {
                region: request.region,
                adminContactEmail: request.adminContactEmail,
                ownerId: createdBy,
                createdAt: now,
                updatedAt: now,
            },
            partitionKey: tenantId,
        };
        const { resource } = await this.tenantsContainer.items.create(tenant);
        if (!resource) {
            throw new Error('Failed to create tenant');
        }
        return this.toResponse(resource);
    }
    /**
     * Get tenant by ID
     */
    async getTenant(tenantId) {
        try {
            const { resource } = await this.tenantsContainer
                .item(tenantId, tenantId)
                .read();
            return resource ? this.toResponse(resource) : null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Update tenant
     */
    async updateTenant(tenantId, updates) {
        const existing = await this.getTenant(tenantId);
        if (!existing) {
            throw new Error('Tenant not found');
        }
        // Check if slug is being updated and if it conflicts
        if (updates.slug && updates.slug !== existing.slug) {
            const existingSlug = await this.findBySlug(updates.slug);
            if (existingSlug && existingSlug.id !== tenantId) {
                throw new Error(`Tenant with slug '${updates.slug}' already exists`);
            }
        }
        // Check if domain is being updated and if it conflicts
        if (updates.domain && updates.domain !== existing.domain) {
            const existingDomain = await this.findByDomain(updates.domain);
            if (existingDomain && existingDomain.id !== tenantId) {
                throw new Error(`Tenant with domain '${updates.domain}' already exists`);
            }
        }
        const { resource: current } = await this.tenantsContainer
            .item(tenantId, tenantId)
            .read();
        if (!current) {
            throw new Error('Tenant not found');
        }
        const updated = {
            ...current,
            name: updates.name ?? current.name,
            slug: updates.slug ?? current.slug,
            domain: updates.domain ?? current.domain,
            status: updates.status ?? current.status,
            plan: updates.plan ?? current.plan,
            settings: updates.settings
                ? { ...current.settings, ...updates.settings }
                : current.settings,
            adminUserIds: updates.adminUserIds || current.adminUserIds || [],
            metadata: {
                ...current.metadata,
                ...updates.metadata,
                updatedAt: new Date().toISOString(),
            },
        };
        const { resource } = await this.tenantsContainer
            .item(tenantId, tenantId)
            .replace(updated);
        if (!resource) {
            throw new Error('Failed to update tenant');
        }
        return this.toResponse(resource);
    }
    /**
     * Delete (soft delete) tenant
     */
    async deleteTenant(tenantId) {
        const existing = await this.getTenant(tenantId);
        if (!existing) {
            throw new Error('Tenant not found');
        }
        // Soft delete by setting status to inactive
        await this.updateTenant(tenantId, { status: TenantStatus.INACTIVE });
    }
    /**
     * Activate tenant
     */
    async activateTenant(tenantId) {
        const existing = await this.getTenant(tenantId);
        if (!existing) {
            throw new Error('Tenant not found');
        }
        const { resource: current } = await this.tenantsContainer
            .item(tenantId, tenantId)
            .read();
        if (!current) {
            throw new Error('Tenant not found');
        }
        const now = new Date().toISOString();
        const updated = {
            ...current,
            status: TenantStatus.ACTIVE,
            metadata: {
                ...current.metadata,
                activatedAt: now,
                updatedAt: now,
            },
        };
        const { resource } = await this.tenantsContainer
            .item(tenantId, tenantId)
            .replace(updated);
        if (!resource) {
            throw new Error('Failed to activate tenant');
        }
        return this.toResponse(resource);
    }
    /**
     * List tenants with pagination and filtering
     */
    async listTenants(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;
        // Build query
        let sqlQuery = 'SELECT * FROM c WHERE 1=1';
        const parameters = [];
        if (query.status) {
            sqlQuery += ' AND c.status = @status';
            parameters.push({ name: '@status', value: query.status });
        }
        if (query.plan) {
            sqlQuery += ' AND c.plan = @plan';
            parameters.push({ name: '@plan', value: query.plan });
        }
        if (query.search) {
            sqlQuery += ' AND (CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.slug), LOWER(@search)) OR CONTAINS(LOWER(c.domain), LOWER(@search)))';
            parameters.push({ name: '@search', value: query.search });
        }
        sqlQuery += ' ORDER BY c.metadata.createdAt DESC';
        // Get total count
        const countQuery = sqlQuery.replace('SELECT *', 'SELECT VALUE COUNT(1)');
        const { resources: countResult } = await this.tenantsContainer.items
            .query({
            query: countQuery,
            parameters,
        })
            .fetchAll();
        const total = countResult[0] || 0;
        // Get paginated results
        const { resources } = await this.tenantsContainer.items
            .query({
            query: `${sqlQuery} OFFSET ${offset} LIMIT ${limit}`,
            parameters,
        })
            .fetchAll();
        const tenants = resources.map((tenant) => this.toResponse(tenant));
        return {
            tenants,
            total,
            page,
            limit,
            hasMore: offset + resources.length < total,
        };
    }
    /**
     * Find tenant by slug
     */
    async findBySlug(slug) {
        const { resources } = await this.tenantsContainer.items
            .query({
            query: 'SELECT * FROM c WHERE c.slug = @slug',
            parameters: [{ name: '@slug', value: slug }],
        })
            .fetchAll();
        return resources[0] || null;
    }
    /**
     * Find tenant by domain
     */
    async findByDomain(domain) {
        const { resources } = await this.tenantsContainer.items
            .query({
            query: 'SELECT * FROM c WHERE c.domain = @domain',
            parameters: [{ name: '@domain', value: domain }],
        })
            .fetchAll();
        return resources[0] || null;
    }
    /**
     * Generate slug from name
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
    }
    /**
     * Convert TenantDocument to TenantResponse
     */
    toResponse(tenant) {
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug || tenant.id, // Fallback to id if slug is missing
            domain: tenant.domain,
            status: tenant.status,
            plan: tenant.plan || 'starter',
            settings: tenant.settings || {},
            adminUserIds: tenant.adminUserIds || [],
            region: tenant.metadata?.region,
            createdAt: tenant.metadata?.createdAt || new Date().toISOString(),
            updatedAt: tenant.metadata?.updatedAt || new Date().toISOString(),
            activatedAt: tenant.metadata?.activatedAt,
        };
    }
    async getTenantByDomain(domain) {
        const tenant = await this.findByDomain(domain);
        return tenant ? this.toResponse(tenant) : null;
    }
    async appendAdminUser(tenantId, userId) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const { resource: current } = await this.tenantsContainer
            .item(tenantId, tenantId)
            .read();
        if (!current) {
            throw new Error('Tenant not found');
        }
        if (!current.adminUserIds) {
            current.adminUserIds = [];
        }
        if (!current.adminUserIds.includes(userId)) {
            current.adminUserIds.push(userId);
            current.metadata.updatedAt = new Date().toISOString();
            await this.tenantsContainer.item(tenantId, tenantId).replace(current);
        }
    }
    /**
     * Ensure Tenants container exists
     */
    static async ensureContainer(database) {
        const { container } = await database.containers.createIfNotExists({
            id: 'tenants',
            partitionKey: { paths: ['/partitionKey'] },
        });
        return container;
    }
}
//# sourceMappingURL=tenant.service.js.map