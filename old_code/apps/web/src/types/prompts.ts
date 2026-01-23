export type PromptScope = 'system' | 'tenant' | 'user';

/**
 * Canonical Insight Types - must match API enum
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

export type PromptStatus = 'draft' | 'active' | 'archived';

export interface PromptTemplate {
    systemPrompt?: string;
    userPrompt?: string;
    variables?: string[];
}

export interface RagConfig {
    topK?: number;
    minScore?: number;
    includeCitations?: boolean;
    requiresContext?: boolean;
}

export interface Prompt {
    id: string;
    tenantId: string;
    slug: string;
    name: string;
    scope: PromptScope;
    insightType?: InsightType; // Optional, links to specific insight types
    tags?: string[];
    version: number;
    template: PromptTemplate;
    ragConfig?: RagConfig;
    inputVariables: string[]; // Duplicate of template.variables for indexing/validation

    // Metadata
    description?: string;
    author?: string;
    createdBy: {
        userId: string;
        at: Date;
    };
    updatedBy?: {
        userId: string;
        at: Date;
    };

    status: PromptStatus;
    metadata?: Record<string, any>;
}

export interface PromptResolutionRequest {
    slug: string;
    insightType?: InsightType;
    tags?: string[];
    variables?: Record<string, any>;
}

export interface PromptResolutionResult {
    systemPrompt: string;
    userPrompt: string;
    config: RagConfig;
    source: Prompt;
}
