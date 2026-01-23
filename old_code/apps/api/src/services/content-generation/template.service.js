import { config } from '../../config/env.js';
export class TemplateService {
    monitoring;
    container;
    constructor(monitoring, cosmosClient) {
        this.monitoring = monitoring;
        const database = cosmosClient.database(config.cosmosDb.databaseId);
        // We'll use the 'templates' container defined in env.ts
        this.container = database.container(config.cosmosDb.containers.templates);
    }
    /**
     * Create a new template
     */
    async createTemplate(tenantId, input, createdBy) {
        this.monitoring.trackEvent('template.create', { tenantId, type: input.type });
        const now = new Date().toISOString();
        const variables = this.extractVariables(input.content);
        const template = {
            id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tenantId,
            name: input.name,
            description: input.description,
            content: input.content,
            variables,
            type: input.type,
            category: input.category,
            tags: input.tags,
            thumbnailUrl: input.thumbnailUrl,
            variableConfig: input.variableConfig,
            createdAt: now,
            updatedAt: now,
            createdBy,
            updatedBy: createdBy,
        };
        const { resource } = await this.container.items.create(template);
        if (!resource) {
            throw new Error('Failed to create template');
        }
        return resource;
    }
    /**
     * Get a template by ID
     */
    async getTemplate(id, tenantId) {
        try {
            // Try to get tenant template
            const { resource } = await this.container.item(id, tenantId).read();
            if (resource) {
                return resource;
            }
            // Try to get system template
            const { resource: systemResource } = await this.container.item(id, 'system').read();
            if (systemResource && systemResource.isSystem) {
                return systemResource;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * List templates for a tenant (including system templates)
     */
    async listTemplates(tenantId, options) {
        try {
            let query = `
        SELECT * FROM c 
        WHERE (c.tenantId = @tenantId OR c.isSystem = true)
      `;
            const parameters = [{ name: '@tenantId', value: tenantId }];
            if (options?.category) {
                query += ` AND c.category = @category`;
                parameters.push({ name: '@category', value: options.category });
            }
            if (options?.tags && options.tags.length > 0) {
                // Simple array contains check for at least one tag
                // For Cosmos DB, ARRAY_CONTAINS is useful
                // This checks if ANY of the requested tags are in the document's tags
                // Note: This is a simplification. For strict "all tags" matching, we'd need multiple checks.
                // Assuming OR logic for tags filter for now.
                const tagChecks = options.tags.map((_, i) => `ARRAY_CONTAINS(c.tags, @tag${i})`).join(' OR ');
                if (tagChecks) {
                    query += ` AND (${tagChecks})`;
                    options.tags.forEach((tag, i) => {
                        parameters.push({ name: `@tag${i}`, value: tag });
                    });
                }
            }
            if (options?.search) {
                query += ` AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.description), @search))`;
                parameters.push({ name: '@search', value: options.search.toLowerCase() });
            }
            query += ` ORDER BY c.updatedAt DESC`;
            const { resources } = await this.container.items.query({
                query,
                parameters
            }).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'template.list' });
            throw error;
        }
    }
    /**
     * Update a template
     */
    async updateTemplate(id, tenantId, input, updatedBy) {
        const template = await this.getTemplate(id, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        if (template.tenantId !== tenantId) {
            throw new Error('Cannot update system template or template from another tenant');
        }
        const now = new Date().toISOString();
        const variables = input.content ? this.extractVariables(input.content) : template.variables;
        const updatedTemplate = {
            ...template,
            ...input,
            variables,
            updatedAt: now,
            updatedBy,
        };
        const { resource } = await this.container.item(id, tenantId).replace(updatedTemplate);
        if (!resource) {
            throw new Error('Failed to update template');
        }
        return resource;
    }
    /**
     * Delete a template
     */
    async deleteTemplate(id, tenantId) {
        const template = await this.getTemplate(id, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        if (template.tenantId !== tenantId) {
            throw new Error('Cannot delete system template or template from another tenant');
        }
        await this.container.item(id, tenantId).delete();
    }
    /**
     * Extract variables from content (e.g., {{variable}})
     */
    extractVariables(content) {
        const regex = /\{\{([^}]+)\}\}/g;
        const matches = [...content.matchAll(regex)];
        return [...new Set(matches.map(m => m[1].trim()))];
    }
    /**
     * Clone a template
     */
    async cloneTemplate(id, tenantId, userId) {
        // Get the original template (could be system or tenant)
        const original = await this.getTemplate(id, tenantId);
        if (!original) {
            throw new Error('Template not found');
        }
        const now = new Date().toISOString();
        const newTemplate = {
            ...original,
            id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tenantId,
            name: `${original.name} (Copy)`,
            isSystem: false, // Cloned templates are never system templates
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
        };
        const { resource } = await this.container.items.create(newTemplate);
        if (!resource) {
            throw new Error('Failed to clone template');
        }
        return resource;
    }
    /**
     * Import a template from a file (Mock implementation)
     */
    async importTemplate(tenantId, userId, file) {
        this.monitoring.trackEvent('template.import', { tenantId, fileType: file.type });
        const now = new Date().toISOString();
        let content = '';
        let type = 'document';
        let slides;
        // Mock parsing logic
        if (file.name.endsWith('.pptx')) {
            type = 'presentation';
            // Mock slides
            slides = [
                {
                    title: "Imported Presentation",
                    layout: "title-bullets",
                    content: { bullets: ["Slide 1 content", "Slide 1 point 2"] },
                    notes: "Imported from " + file.name
                },
                {
                    title: "Agenda",
                    layout: "title-bullets",
                    content: { bullets: ["Topic A", "Topic B", "Topic C"] }
                }
            ];
            content = JSON.stringify(slides);
        }
        else {
            // Assume document (PDF/Docx) -> HTML
            content = `<h1>Imported Document: ${file.name}</h1><p>This is a placeholder for imported content.</p>`;
        }
        const template = {
            id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tenantId,
            name: file.name,
            description: `Imported from ${file.name}`,
            content,
            slides,
            variables: [],
            type,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
        };
        const { resource } = await this.container.items.create(template);
        if (!resource) {
            throw new Error('Failed to import template');
        }
        return resource;
    }
}
//# sourceMappingURL=template.service.js.map