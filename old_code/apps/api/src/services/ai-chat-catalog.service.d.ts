/**
 * AI Chat Catalog Service
 * Manages project chat question templates and tenant configurations
 */
import { CosmosDBService } from './cosmos-db.service.js';
import { CacheService } from './cache.service.js';
import type { ProjectChatQuestion, TenantChatCatalogConfig, CreateProjectChatQuestionInput, UpdateProjectChatQuestionInput, UpdateTenantChatCatalogInput } from '../types/ai-chat-catalog.types.js';
export declare class AIChatCatalogService {
    private cosmosDb;
    private cache;
    private logger;
    constructor(cosmosDb: CosmosDBService, cache: CacheService);
    /**
     * Create a new chat question (super admin only)
     */
    createQuestion(input: CreateProjectChatQuestionInput, createdBy: string): Promise<ProjectChatQuestion>;
    /**
     * Update a chat question
     */
    updateQuestion(questionId: string, input: UpdateProjectChatQuestionInput, updatedBy: string): Promise<ProjectChatQuestion>;
    /**
     * Get all active questions
     */
    getAllQuestions(): Promise<ProjectChatQuestion[]>;
    /**
     * Get questions by category
     */
    getQuestionsByCategory(category: string): Promise<ProjectChatQuestion[]>;
    /**
     * Delete a question (soft delete by marking deprecated)
     */
    deleteQuestion(questionId: string, updatedBy: string): Promise<void>;
    /**
     * Get tenant chat catalog configuration
     */
    getTenantCatalogConfig(tenantId: string): Promise<TenantChatCatalogConfig>;
    /**
     * Update tenant catalog configuration
     */
    updateTenantCatalogConfig(tenantId: string, input: UpdateTenantChatCatalogInput, updatedBy: string): Promise<TenantChatCatalogConfig>;
    /**
     * Get enabled questions for a tenant
     */
    getTenantEnabledQuestions(tenantId: string): Promise<ProjectChatQuestion[]>;
    /**
     * Create custom question for tenant
     */
    createCustomQuestion(tenantId: string, input: CreateProjectChatQuestionInput, createdBy: string): Promise<ProjectChatQuestion>;
    /**
     * Get default tenant catalog configuration
     */
    private getDefaultTenantCatalogConfig;
}
//# sourceMappingURL=ai-chat-catalog.service.d.ts.map