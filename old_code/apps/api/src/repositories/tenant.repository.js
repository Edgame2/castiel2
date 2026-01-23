export class TenantRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async listTenants() {
        const { resources } = await this.container.items.query({ query: 'SELECT * FROM c' }).fetchAll();
        return resources;
    }
    async getTenant(tenantId) {
        try {
            const { resource } = await this.container.item(tenantId, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async updateTenantDocumentSettings(tenantId, settings) {
        const { resource } = await this.container.item(tenantId, tenantId).read();
        if (!resource) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        resource.documentSettings = settings;
        await this.container.items.upsert(resource);
    }
}
//# sourceMappingURL=tenant.repository.js.map