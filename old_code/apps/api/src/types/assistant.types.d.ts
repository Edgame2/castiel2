/**
 * Assistant Types
 * Types for c_assistant ShardType
 */
export declare enum AssistantPersonality {
    PROFESSIONAL = "professional",
    FRIENDLY = "friendly",
    FORMAL = "formal",
    CASUAL = "casual",
    ANALYTICAL = "analytical",
    CREATIVE = "creative",
    SUPPORTIVE = "supportive",
    DIRECT = "direct"
}
export declare enum AssistantTone {
    NEUTRAL = "neutral",
    ENTHUSIASTIC = "enthusiastic",
    EMPATHETIC = "empathetic",
    CONFIDENT = "confident",
    CAUTIOUS = "cautious",
    ENCOURAGING = "encouraging",
    INFORMATIVE = "informative"
}
export declare enum AssistantCapability {
    SUMMARIZATION = "summarization",
    ANALYSIS = "analysis",
    RECOMMENDATIONS = "recommendations",
    WRITING = "writing",
    RESEARCH = "research",
    FORECASTING = "forecasting",
    COACHING = "coaching",
    Q_AND_A = "q_and_a",
    DATA_EXTRACTION = "data_extraction",
    TRANSLATION = "translation"
}
export declare enum ResponseFormat {
    CONVERSATIONAL = "conversational",
    STRUCTURED = "structured",
    BULLET_POINTS = "bullet_points",
    DETAILED = "detailed",
    CONCISE = "concise"
}
export interface AssistantStructuredData {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
}
export interface CreateAssistantInput {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive?: boolean;
    isDefault?: boolean;
    tags?: string[];
}
export interface UpdateAssistantInput {
    name?: string;
    description?: string;
    systemPrompt?: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive?: boolean;
    isDefault?: boolean;
    tags?: string[];
}
export interface AssistantQueryOptions {
    search?: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    capabilities?: AssistantCapability[];
    isActive?: boolean;
    isDefault?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
    orderBy?: 'name' | 'createdAt' | 'usageCount' | 'lastUsedAt';
    orderDirection?: 'asc' | 'desc';
}
export interface ResolvedAssistant {
    assistant: AssistantStructuredData;
    model: {
        id: string;
        name: string;
        provider: string;
    };
    template?: {
        id: string;
        name: string;
    };
    config?: {
        id: string;
        name: string;
    };
}
export declare const SYSTEM_ASSISTANTS: {
    readonly GENERAL: "asst_general";
    readonly ANALYST: "asst_analyst";
    readonly WRITER: "asst_writer";
    readonly RESEARCHER: "asst_researcher";
    readonly COACH: "asst_coach";
};
export type SystemAssistantId = typeof SYSTEM_ASSISTANTS[keyof typeof SYSTEM_ASSISTANTS];
export declare const DEFAULT_GENERAL_ASSISTANT: AssistantStructuredData;
export declare const DEFAULT_ANALYST_ASSISTANT: AssistantStructuredData;
export declare const DEFAULT_WRITER_ASSISTANT: AssistantStructuredData;
export declare const DEFAULT_RESEARCHER_ASSISTANT: AssistantStructuredData;
export declare const DEFAULT_COACH_ASSISTANT: AssistantStructuredData;
export declare const DEFAULT_ASSISTANTS: ({
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
    id: "asst_general";
} | {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
    id: "asst_analyst";
} | {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
    id: "asst_writer";
} | {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
    id: "asst_researcher";
} | {
    name: string;
    description?: string;
    systemPrompt: string;
    personality?: AssistantPersonality;
    tone?: AssistantTone;
    language?: string;
    capabilities?: AssistantCapability[];
    focusAreas?: string[];
    constraints?: string[];
    responseFormat?: ResponseFormat;
    maxTokens?: number;
    temperature?: number;
    model?: string;
    contextTemplateId?: string;
    configId?: string;
    isActive: boolean;
    isDefault: boolean;
    usageCount?: number;
    lastUsedAt?: Date;
    tags?: string[];
    id: "asst_coach";
})[];
//# sourceMappingURL=assistant.types.d.ts.map