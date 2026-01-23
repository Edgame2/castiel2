import { BaseDocument } from '../../services/ai-insights/cosmos.service.js';
/**
 * Prompt Scopes
 */
export declare enum PromptScope {
    System = "system",
    Tenant = "tenant",
    Project = "project",
    User = "user"
}
/**
 * Canonical Insight Types (shared with frontend/DB)
 */
export declare enum InsightType {
    Summary = "summary",
    Analysis = "analysis",
    Comparison = "comparison",
    Recommendation = "recommendation",
    Prediction = "prediction",
    Extraction = "extraction",
    Search = "search",
    Generation = "generation"
}
export declare enum PromptStatus {
    Draft = "draft",
    Active = "active",
    Archived = "archived"
}
/**
 * RAG Configuration for a prompt
 */
export interface RagConfig {
    topK?: number;
    minScore?: number;
    includeCitations?: boolean;
    requiresContext?: boolean;
}
/**
 * Prompt Template definition
 */
export interface PromptTemplate {
    systemPrompt?: string;
    userPrompt?: string;
    variables?: string[];
}
/**
 * Core Prompt Data Model
 */
export interface Prompt extends BaseDocument {
    slug: string;
    name: string;
    scope: PromptScope;
    ownerId?: string;
    projectId?: string;
    insightType?: InsightType;
    template: PromptTemplate;
    ragConfig?: RagConfig;
    status: PromptStatus;
    version: number;
    tags?: string[];
    createdBy: {
        userId: string;
        at: Date;
    };
    updatedBy?: {
        userId: string;
        at: Date;
    };
    metadata?: Record<string, unknown>;
}
export interface PromptResolutionRequest {
    tenantId: string;
    userId: string;
    slug: string;
    insightType?: InsightType;
    projectId?: string;
    tags?: string[];
    variables?: Record<string, any>;
}
export interface PromptResolutionResult {
    prompt: Prompt;
    renderedSystemPrompt: string;
    renderedUserPrompt: string;
    sourceScope: PromptScope;
    experimentId?: string;
    variantId?: string;
}
//# sourceMappingURL=prompt.types.d.ts.map