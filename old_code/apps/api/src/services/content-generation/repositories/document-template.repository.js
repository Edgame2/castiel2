/**
 * Document Template Repository
 *
 * Cosmos DB repository for document templates (Content Generation system)
 * Container: document-templates
 * Partition Key: /tenantId
 */
import { v4 as uuidv4 } from 'uuid';
export class DocumentTemplateRepository {
    container;
    constructor(client, databaseId, containerId = 'document-templates') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Create a new document template
     */
    async create(tenantId, userId, input) {
        const now = new Date().toISOString();
        const template = {
            id: uuidv4(),
            tenantId,
            userId,
            name: input.name,
            description: input.description,
            documentFormat: input.documentFormat,
            sourceDocumentId: input.sourceDocumentId,
            sourceDocumentUrl: input.sourceDocumentUrl,
            dominantColors: [],
            placeholders: [],
            placeholderConfigs: [],
            contextTemplateId: input.contextTemplateId,
            status: 'draft',
            versions: [],
            currentVersion: 1,
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(template);
        if (!resource) {
            throw new Error('Failed to create document template');
        }
        return resource;
    }
    /**
     * Get template by ID
     */
    async getById(id, tenantId) {
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            return resource || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Update template
     */
    async update(id, tenantId, updates) {
        const existing = await this.getById(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
            // Handle status transitions
            ...(updates.status === 'active' && existing.status !== 'active'
                ? { activatedAt: new Date().toISOString() }
                : {}),
            ...(updates.status === 'archived' && existing.status !== 'archived'
                ? { archivedAt: new Date().toISOString() }
                : {}),
        };
        const { resource } = await this.container.item(id, tenantId).replace(updated);
        return resource;
    }
    /**
     * Delete template
     */
    async delete(id, tenantId) {
        try {
            await this.container.item(id, tenantId).delete();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * List templates with filters
     */
    async list(tenantId, filters) {
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: tenantId },
        ];
        if (filters?.status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: filters.status });
        }
        if (filters?.documentFormat) {
            conditions.push('c.documentFormat = @documentFormat');
            parameters.push({ name: '@documentFormat', value: filters.documentFormat });
        }
        if (filters?.search) {
            conditions.push('(CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.description), @search))');
            parameters.push({ name: '@search', value: filters.search.toLowerCase() });
        }
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const query = {
            query: `SELECT * FROM c ${whereClause} ORDER BY c.updatedAt DESC`,
            parameters,
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    /**
     * List active templates (for users)
     */
    async listActive(tenantId, filters) {
        const conditions = ['c.tenantId = @tenantId', 'c.status = @status'];
        const parameters = [
            { name: '@tenantId', value: tenantId },
            { name: '@status', value: 'active' },
        ];
        if (filters?.documentFormat) {
            conditions.push('c.documentFormat = @documentFormat');
            parameters.push({ name: '@documentFormat', value: filters.documentFormat });
        }
        const query = {
            query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.name`,
            parameters,
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    /**
     * Add version to template (max 5 versions)
     */
    async addVersion(templateId, tenantId, version) {
        const template = await this.getById(templateId, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        // Enforce max 5 versions - remove oldest if at limit
        const maxVersions = 5;
        let versions = [...template.versions];
        if (versions.length >= maxVersions) {
            // Remove oldest version (lowest version number)
            versions.sort((a, b) => a.versionNumber - b.versionNumber);
            versions = versions.slice(1); // Remove first (oldest)
        }
        versions.push(version);
        // Update current version number
        const newVersionNumber = Math.max(...versions.map(v => v.versionNumber)) + 1;
        const updated = {
            ...template,
            versions,
            currentVersion: newVersionNumber,
            updatedAt: new Date().toISOString(),
        };
        await this.container.item(templateId, tenantId).replace(updated);
    }
    /**
     * Get all versions for a template
     */
    async getVersions(templateId, tenantId) {
        const template = await this.getById(templateId, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        return template.versions.sort((a, b) => b.versionNumber - a.versionNumber); // Newest first
    }
    /**
     * Rollback to a specific version
     */
    async rollbackToVersion(templateId, tenantId, versionNumber) {
        const template = await this.getById(templateId, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        const version = template.versions.find(v => v.versionNumber === versionNumber);
        if (!version) {
            throw new Error(`Version ${versionNumber} not found`);
        }
        // Restore from version snapshot
        const rolledBack = {
            ...template,
            placeholders: version.snapshot.placeholders,
            dominantColors: version.snapshot.dominantColors,
            currentVersion: versionNumber,
            updatedAt: new Date().toISOString(),
        };
        const { resource } = await this.container.item(templateId, tenantId).replace(rolledBack);
        if (!resource) {
            throw new Error('Failed to rollback template');
        }
        return resource;
    }
}
//# sourceMappingURL=document-template.repository.js.map