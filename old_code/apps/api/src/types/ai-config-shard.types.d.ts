/**
 * AI Config Shard Types
 * Types for c_aiconfig ShardType
 */
export type AIConfigScope = 'system' | 'tenant' | 'assistant';
export type AIConfigLevel = 'system_default' | 'tenant_override' | 'assistant_override';
export interface PersonaConfig {
    name: string;
    role: string;
    traits: string[];
    expertise: string[];
    tone: 'formal' | 'professional' | 'friendly' | 'casual';
    verbosity: 'concise' | 'balanced' | 'detailed';
    proactivity: 'reactive' | 'balanced' | 'proactive';
    creativity: number;
}
export interface StyleConfig {
    defaultFormat: 'paragraph' | 'bullets' | 'structured' | 'conversational';
    useMarkdown: boolean;
    useEmoji: boolean;
    useHeadings: boolean;
    preferredLength: 'brief' | 'moderate' | 'detailed';
    maxParagraphs?: number;
    includeIntro: boolean;
    includeConclusion: boolean;
    includeSummary: boolean;
    citationStyle: 'inline' | 'footnote' | 'endnote' | 'none';
    showConfidence: boolean;
}
export interface ToolConfig {
    enabledTools: string[];
    toolSettings: Record<string, ToolSettings>;
    maxToolCalls: number;
    toolTimeout: number;
    parallelExecution: boolean;
}
export interface ToolSettings {
    enabled: boolean;
    config: Record<string, unknown>;
    rateLimit?: number;
}
export declare const AVAILABLE_TOOLS: readonly ["web_search", "calculator", "code_interpreter", "image_generation", "document_search", "calendar", "email_draft", "data_visualization"];
export type AvailableTool = typeof AVAILABLE_TOOLS[number];
export interface WebSearchConfig {
    enabled: boolean;
    autoSearch: boolean;
    searchTriggers: string[];
    maxResults: number;
    preferredSources?: string[];
    blockedSources?: string[];
    requireRecent: boolean;
    maxAge?: string;
    safeSearch: boolean;
}
export interface DomainKnowledgeConfig {
    industry?: string;
    subIndustry?: string;
    customTerminology: Record<string, string>;
    frameworks: string[];
    guidelines: string[];
    responseTemplates: Record<string, string>;
}
export interface SafetyConfig {
    contentFiltering: 'strict' | 'balanced' | 'minimal';
    blockedTopics: string[];
    disclaimers: {
        topic: string;
        disclaimer: string;
    }[];
    allowPersonalAdvice: boolean;
    allowFinancialAdvice: boolean;
    allowLegalAdvice: boolean;
    allowMedicalAdvice: boolean;
    disclosureLevel: 'full' | 'minimal' | 'none';
    admitUncertainty: boolean;
    piiHandling: 'mask' | 'redact' | 'allow';
    retainConversations: boolean;
}
export interface LocalizationConfig {
    defaultLanguage: string;
    supportedLanguages: string[];
    autoDetectLanguage: boolean;
    dateFormat: string;
    numberFormat: string;
    currency: string;
    timezone: string;
    measurementSystem: 'metric' | 'imperial';
}
export interface CustomizationControl {
    allowPersonaOverride: boolean;
    allowStyleOverride: boolean;
    allowToolOverride: boolean;
    allowSafetyOverride: boolean;
    allowDomainOverride: boolean;
    lockedSettings: string[];
    inheritFrom?: string;
}
export interface AIConfigStructuredData {
    name: string;
    description?: string;
    scope: AIConfigScope;
    tenantId?: string;
    assistantId?: string;
    persona: PersonaConfig;
    style: StyleConfig;
    tools: ToolConfig;
    webSearch: WebSearchConfig;
    domainKnowledge: DomainKnowledgeConfig;
    safety: SafetyConfig;
    localization: LocalizationConfig;
    customization: CustomizationControl;
    isActive: boolean;
    isDefault: boolean;
    version: number;
    tags?: string[];
}
export interface MergedAIConfig {
    persona: PersonaConfig;
    style: StyleConfig;
    tools: ToolConfig;
    webSearch: WebSearchConfig;
    domainKnowledge: DomainKnowledgeConfig;
    safety: SafetyConfig;
    localization: LocalizationConfig;
    sources: {
        section: string;
        configId: string;
        level: AIConfigLevel;
    }[];
    resolvedAt: Date;
}
export interface CreateAIConfigInput {
    name: string;
    description?: string;
    scope: AIConfigScope;
    tenantId?: string;
    assistantId?: string;
    persona?: Partial<PersonaConfig>;
    style?: Partial<StyleConfig>;
    tools?: Partial<ToolConfig>;
    webSearch?: Partial<WebSearchConfig>;
    domainKnowledge?: Partial<DomainKnowledgeConfig>;
    safety?: Partial<SafetyConfig>;
    localization?: Partial<LocalizationConfig>;
    customization?: Partial<CustomizationControl>;
    tags?: string[];
}
export interface UpdateAIConfigInput {
    name?: string;
    description?: string;
    persona?: Partial<PersonaConfig>;
    style?: Partial<StyleConfig>;
    tools?: Partial<ToolConfig>;
    webSearch?: Partial<WebSearchConfig>;
    domainKnowledge?: Partial<DomainKnowledgeConfig>;
    safety?: Partial<SafetyConfig>;
    localization?: Partial<LocalizationConfig>;
    customization?: Partial<CustomizationControl>;
    isActive?: boolean;
    tags?: string[];
}
export declare const DEFAULT_PERSONA: PersonaConfig;
export declare const DEFAULT_STYLE: StyleConfig;
export declare const DEFAULT_TOOLS: ToolConfig;
export declare const DEFAULT_WEB_SEARCH: WebSearchConfig;
export declare const DEFAULT_DOMAIN_KNOWLEDGE: DomainKnowledgeConfig;
export declare const DEFAULT_SAFETY: SafetyConfig;
export declare const DEFAULT_LOCALIZATION: LocalizationConfig;
export declare const DEFAULT_CUSTOMIZATION: CustomizationControl;
export declare const DEFAULT_AI_CONFIG: Omit<AIConfigStructuredData, 'scope' | 'tenantId' | 'assistantId'>;
//# sourceMappingURL=ai-config-shard.types.d.ts.map