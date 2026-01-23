import { AIInsightsCosmosService } from './cosmos.service';
import { Prompt, PromptScope, PromptStatus } from '../../types/ai-insights/prompt.types.js';
export declare class PromptRepository {
    private readonly cosmosService;
    constructor(cosmosService: AIInsightsCosmosService);
    /**
     * Create a new prompt
     */
    create(prompt: Prompt): Promise<Prompt>;
    /**
     * Get a prompt by ID
     */
    findById(tenantId: string, id: string): Promise<Prompt | null>;
    /**
     * List prompts with filtering
     */
    list(tenantId: string, filters?: {
        scope?: PromptScope;
        status?: PromptStatus;
        insightType?: string;
        slug?: string;
        ownerId?: string;
        projectId?: string;
    }): Promise<Prompt[]>;
    /**
     * Update a prompt
     */
    update(tenantId: string, id: string, updates: Partial<Prompt>): Promise<Prompt>;
    /**
     * Get the latest active version of a prompt for a given slug
     */
    findActiveBySlug(tenantId: string, slug: string): Promise<Prompt | null>;
    /**
     * Get the latest active version of a project-specific prompt for a given slug
     */
    findActiveBySlugAndProject(tenantId: string, slug: string, projectId: string): Promise<Prompt | null>;
}
//# sourceMappingURL=prompt.repository.d.ts.map