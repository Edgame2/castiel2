/**
 * AI Chat Catalog Types
 * Defines question templates and catalog management for project-aware AI chat
 */
export interface ProjectChatQuestionBase {
    question: string;
    description: string;
    category: 'status' | 'risks' | 'timeline' | 'resources' | 'team' | 'budget' | 'deliverables' | 'custom';
    estimatedTokens: number;
    isActive: boolean;
}
export interface ProjectChatQuestion extends ProjectChatQuestionBase {
    id: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number;
    tags?: string[];
    /** For system questions, the template ID. For custom, null */
    templateId?: string;
    /** SuperAdmin can mark questions as deprecated */
    deprecated?: boolean;
    replacedBy?: string;
}
export interface CreateProjectChatQuestionInput extends ProjectChatQuestionBase {
    tags?: string[];
}
export interface UpdateProjectChatQuestionInput extends Partial<ProjectChatQuestionBase> {
    deprecated?: boolean;
    replacedBy?: string;
}
export interface TenantChatCatalogConfig {
    tenantId: string;
    /** IDs of questions enabled for this tenant */
    enabledQuestionIds: string[];
    /** Categories enabled for this tenant */
    enabledCategories: string[];
    /** Custom questions created by tenant (limited per tenant) */
    customQuestions: ProjectChatQuestion[];
    /** Max custom questions allowed (configurable by super admin) */
    maxCustomQuestions: number;
    /** Question selection preferences: 'manual' or 'auto' (auto shows all enabled) */
    selectionMode: 'manual' | 'auto';
    updatedAt: Date;
    updatedBy: string;
}
export interface CreateTenantChatCatalogInput {
    enabledQuestionIds: string[];
    enabledCategories?: string[];
    selectionMode?: 'manual' | 'auto';
}
export interface UpdateTenantChatCatalogInput {
    enabledQuestionIds?: string[];
    enabledCategories?: string[];
    selectionMode?: 'manual' | 'auto';
}
export interface ProjectChatContext {
    projectId: string;
    projectName: string;
    description?: string;
    enabledQuestions: ProjectChatQuestion[];
    linkedShardsCount: number;
    estimatedContextTokens: number;
}
export interface ChatQuestionCategory {
    name: string;
    description: string;
    icon?: string;
    questionCount: number;
    isDefault: boolean;
}
//# sourceMappingURL=ai-chat-catalog.types.d.ts.map