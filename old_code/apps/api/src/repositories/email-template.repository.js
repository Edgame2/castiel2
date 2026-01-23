/**
 * Email Template Repository
 * Handles all Cosmos DB operations for email templates
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Email Template Repository
 */
export class EmailTemplateRepository {
    container;
    constructor(client, databaseId, containerId = 'EmailTemplates') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Create email template
     */
    async create(template) {
        const now = new Date().toISOString();
        const doc = {
            ...template,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
        };
        const { resource } = await this.container.item(doc.id, doc.tenantId).replace(doc);
        if (!resource) {
            throw new Error('Failed to create email template');
        }
        return resource;
    }
    /**
     * Update email template
     */
    async update(id, tenantId, updates) {
        const existing = await this.findById(id, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        const { resource } = await this.container
            .item(id, tenantId)
            .replace(updated);
        return resource;
    }
    /**
     * Delete email template
     */
    async delete(id, tenantId) {
        try {
            await this.container.item(id, tenantId).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Find template by ID
     */
    async findById(id, tenantId) {
        try {
            const { resource } = await this.container.item(id, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Find template by name and language
     */
    async findByNameAndLanguage(name, language, tenantId) {
        const query = {
            query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.name = @name
          AND c.language = @language
      `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@name', value: name },
                { name: '@language', value: language },
            ],
        };
        const { resources } = await this.container.items.query(query, {
            partitionKey: tenantId,
        }).fetchAll();
        return resources[0] || null;
    }
    /**
     * Find all language variants of a template
     */
    async findByName(name, tenantId) {
        const query = {
            query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.name = @name
        ORDER BY c.language ASC
      `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@name', value: name },
            ],
        };
        const { resources } = await this.container.items.query(query, {
            partitionKey: tenantId,
        }).fetchAll();
        return resources;
    }
    /**
     * List templates with filters and pagination
     */
    async list(filters, pagination) {
        const { tenantId = 'system', category, language, isActive, search, } = filters;
        const { limit = 20, offset = 0 } = pagination;
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: tenantId },
        ];
        if (category) {
            conditions.push('c.category = @category');
            parameters.push({ name: '@category', value: category });
        }
        if (language) {
            conditions.push('c.language = @language');
            parameters.push({ name: '@language', value: language });
        }
        if (isActive !== undefined) {
            conditions.push('c.isActive = @isActive');
            parameters.push({ name: '@isActive', value: isActive });
        }
        if (search) {
            conditions.push('(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.displayName), LOWER(@search)))');
            parameters.push({ name: '@search', value: search });
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Count query
        const countQuery = {
            query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
            parameters,
        };
        const { resources: countResult } = await this.container.items.query(countQuery, {
            partitionKey: tenantId,
        }).fetchAll();
        const total = countResult[0] || 0;
        // Data query
        const dataQuery = {
            query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC OFFSET ${offset} LIMIT ${limit}`,
            parameters,
        };
        const { resources } = await this.container.items.query(dataQuery, {
            partitionKey: tenantId,
        }).fetchAll();
        return {
            items: resources,
            total,
            limit,
            offset,
            hasMore: offset + resources.length < total,
        };
    }
    /**
     * Get all language variants of a template
     */
    async getLanguageVariants(name, tenantId) {
        const templates = await this.findByName(name, tenantId);
        return templates.map(t => ({
            language: t.language,
            templateId: t.id,
            displayName: t.displayName,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
    }
    /**
     * Check if template exists
     */
    async exists(name, language, tenantId) {
        const template = await this.findByNameAndLanguage(name, language, tenantId);
        return template !== null;
    }
}
//# sourceMappingURL=email-template.repository.js.map