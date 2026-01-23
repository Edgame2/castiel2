import { BaseDocument } from '../../services/ai-insights/cosmos.service.js';

/**
 * Prompt Scopes
 */
export enum PromptScope {
    System = 'system',
    Tenant = 'tenant',
    Project = 'project',
    User = 'user',
}

/**
 * Canonical Insight Types (shared with frontend/DB)
 */
export enum InsightType {
    Summary = 'summary',
    Analysis = 'analysis',
    Comparison = 'comparison',
    Recommendation = 'recommendation',
    Prediction = 'prediction',
    Extraction = 'extraction',
    Search = 'search',
    Generation = 'generation',
}

export enum PromptStatus {
    Draft = 'draft',
    Active = 'active',
    Archived = 'archived',
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
    systemPrompt?: string; // The system instructions (persona, rules)
    userPrompt?: string; // The user input template
    variables?: string[]; // Expected variables in the template (e.g., {{userQuery}})
}

/**
 * Core Prompt Data Model
 */
export interface Prompt extends BaseDocument {
    slug: string; // Unique identifier for the prompt logic (e.g., "summarize-meeting")
    name: string; // Human-readable name
    scope: PromptScope;
    ownerId?: string; // Required for User scope
    projectId?: string; // Required for Project scope
    insightType?: InsightType; // Optional categorization

    template: PromptTemplate;
    ragConfig?: RagConfig;

    status: PromptStatus;
    version: number;
    tags?: string[]; // For UI recommendations

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
    projectId?: string; // Optional project ID for project-specific prompts
    tags?: string[];
    variables?: Record<string, any>;
}

export interface PromptResolutionResult {
    prompt: Prompt;
    renderedSystemPrompt: string;
    renderedUserPrompt: string;
    sourceScope: PromptScope;
    experimentId?: string; // A/B test experiment ID if applicable
    variantId?: string; // A/B test variant ID if applicable
}
