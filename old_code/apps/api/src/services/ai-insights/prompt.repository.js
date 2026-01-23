import { PromptScope, PromptStatus } from '../../types/ai-insights/prompt.types.js';
export class PromptRepository {
    cosmosService;
    constructor(cosmosService) {
        this.cosmosService = cosmosService;
    }
    /**
     * Create a new prompt
     */
    async create(prompt) {
        return this.cosmosService.create(this.cosmosService.getPromptsContainer(), prompt);
    }
    /**
     * Get a prompt by ID
     */
    async findById(tenantId, id) {
        return this.cosmosService.read(this.cosmosService.getPromptsContainer(), id, tenantId);
    }
    /**
     * List prompts with filtering
     */
    async list(tenantId, filters = {}) {
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (filters.scope) {
            query += ' AND c.scope = @scope';
            parameters.push({ name: '@scope', value: filters.scope });
        }
        if (filters.status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: filters.status });
        }
        if (filters.insightType) {
            query += ' AND c.insightType = @insightType';
            parameters.push({ name: '@insightType', value: filters.insightType });
        }
        if (filters.slug) {
            query += ' AND c.slug = @slug';
            parameters.push({ name: '@slug', value: filters.slug });
        }
        if (filters.ownerId) {
            query += ' AND c.ownerId = @ownerId';
            parameters.push({ name: '@ownerId', value: filters.ownerId });
        }
        if (filters.projectId) {
            query += ' AND c.projectId = @projectId';
            parameters.push({ name: '@projectId', value: filters.projectId });
        }
        query += ' ORDER BY c.createdAt DESC';
        const querySpec = {
            query,
            parameters,
        };
        return this.cosmosService.queryAll(this.cosmosService.getPromptsContainer(), querySpec);
    }
    /**
     * Update a prompt
     */
    async update(tenantId, id, updates) {
        return this.cosmosService.update(this.cosmosService.getPromptsContainer(), id, tenantId, updates);
    }
    /**
     * Get the latest active version of a prompt for a given slug
     */
    async findActiveBySlug(tenantId, slug) {
        const querySpec = {
            query: `
                SELECT TOP 1 * FROM c 
                WHERE c.tenantId = @tenantId 
                AND c.slug = @slug 
                AND c.status = @status 
                ORDER BY c.version DESC
            `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@slug', value: slug },
                { name: '@status', value: PromptStatus.Active },
            ],
        };
        const results = await this.cosmosService.queryAll(this.cosmosService.getPromptsContainer(), querySpec, 1 // limit
        );
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Get the latest active version of a project-specific prompt for a given slug
     */
    async findActiveBySlugAndProject(tenantId, slug, projectId) {
        const querySpec = {
            query: `
                SELECT TOP 1 * FROM c 
                WHERE c.tenantId = @tenantId 
                AND c.slug = @slug 
                AND c.projectId = @projectId
                AND c.scope = @scope
                AND c.status = @status 
                ORDER BY c.version DESC
            `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@slug', value: slug },
                { name: '@projectId', value: projectId },
                { name: '@scope', value: PromptScope.Project },
                { name: '@status', value: PromptStatus.Active },
            ],
        };
        const results = await this.cosmosService.queryAll(this.cosmosService.getPromptsContainer(), querySpec, 1 // limit
        );
        return results.length > 0 ? results[0] : null;
    }
}
//# sourceMappingURL=prompt.repository.js.map