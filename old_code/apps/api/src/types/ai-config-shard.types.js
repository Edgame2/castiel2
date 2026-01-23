/**
 * AI Config Shard Types
 * Types for c_aiconfig ShardType
 */
// Available tools
export const AVAILABLE_TOOLS = [
    'web_search',
    'calculator',
    'code_interpreter',
    'image_generation',
    'document_search',
    'calendar',
    'email_draft',
    'data_visualization',
];
// ============================================
// Default Configurations
// ============================================
export const DEFAULT_PERSONA = {
    name: 'Castiel Assistant',
    role: 'AI Business Intelligence Assistant',
    traits: ['analytical', 'helpful', 'professional'],
    expertise: ['data analysis', 'business insights', 'project management'],
    tone: 'professional',
    verbosity: 'balanced',
    proactivity: 'balanced',
    creativity: 0.5,
};
export const DEFAULT_STYLE = {
    defaultFormat: 'structured',
    useMarkdown: true,
    useEmoji: false,
    useHeadings: true,
    preferredLength: 'moderate',
    maxParagraphs: 5,
    includeIntro: true,
    includeConclusion: true,
    includeSummary: false,
    citationStyle: 'inline',
    showConfidence: true,
};
export const DEFAULT_TOOLS = {
    enabledTools: ['document_search', 'calculator'],
    toolSettings: {},
    maxToolCalls: 5,
    toolTimeout: 30,
    parallelExecution: true,
};
export const DEFAULT_WEB_SEARCH = {
    enabled: false,
    autoSearch: false,
    searchTriggers: ['latest', 'news', 'current'],
    maxResults: 5,
    requireRecent: true,
    maxAge: '30d',
    safeSearch: true,
};
export const DEFAULT_DOMAIN_KNOWLEDGE = {
    customTerminology: {},
    frameworks: [],
    guidelines: [],
    responseTemplates: {},
};
export const DEFAULT_SAFETY = {
    contentFiltering: 'balanced',
    blockedTopics: [],
    disclaimers: [],
    allowPersonalAdvice: false,
    allowFinancialAdvice: false,
    allowLegalAdvice: false,
    allowMedicalAdvice: false,
    disclosureLevel: 'full',
    admitUncertainty: true,
    piiHandling: 'mask',
    retainConversations: true,
};
export const DEFAULT_LOCALIZATION = {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    autoDetectLanguage: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-US',
    currency: 'USD',
    timezone: 'UTC',
    measurementSystem: 'metric',
};
export const DEFAULT_CUSTOMIZATION = {
    allowPersonaOverride: true,
    allowStyleOverride: true,
    allowToolOverride: true,
    allowSafetyOverride: false,
    allowDomainOverride: true,
    lockedSettings: [],
};
export const DEFAULT_AI_CONFIG = {
    name: 'Default Configuration',
    description: 'System default AI configuration',
    persona: DEFAULT_PERSONA,
    style: DEFAULT_STYLE,
    tools: DEFAULT_TOOLS,
    webSearch: DEFAULT_WEB_SEARCH,
    domainKnowledge: DEFAULT_DOMAIN_KNOWLEDGE,
    safety: DEFAULT_SAFETY,
    localization: DEFAULT_LOCALIZATION,
    customization: DEFAULT_CUSTOMIZATION,
    isActive: true,
    isDefault: true,
    version: 1,
};
//# sourceMappingURL=ai-config-shard.types.js.map