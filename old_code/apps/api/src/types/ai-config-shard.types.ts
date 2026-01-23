/**
 * AI Config Shard Types
 * Types for c_aiconfig ShardType
 */

// ============================================
// Configuration Scope
// ============================================

export type AIConfigScope = 'system' | 'tenant' | 'assistant';

export type AIConfigLevel = 'system_default' | 'tenant_override' | 'assistant_override';

// ============================================
// Persona Configuration
// ============================================

export interface PersonaConfig {
  // Identity
  name: string;
  role: string;

  // Personality
  traits: string[]; // e.g., ['analytical', 'friendly']
  expertise: string[]; // e.g., ['sales', 'risk analysis']

  // Tone
  tone: 'formal' | 'professional' | 'friendly' | 'casual';
  verbosity: 'concise' | 'balanced' | 'detailed';

  // Behavior
  proactivity: 'reactive' | 'balanced' | 'proactive';
  creativity: number; // 0-1
}

// ============================================
// Style Configuration
// ============================================

export interface StyleConfig {
  // Response format
  defaultFormat: 'paragraph' | 'bullets' | 'structured' | 'conversational';

  // Language
  useMarkdown: boolean;
  useEmoji: boolean;
  useHeadings: boolean;

  // Length
  preferredLength: 'brief' | 'moderate' | 'detailed';
  maxParagraphs?: number;

  // Structure
  includeIntro: boolean;
  includeConclusion: boolean;
  includeSummary: boolean;

  // Citations
  citationStyle: 'inline' | 'footnote' | 'endnote' | 'none';
  showConfidence: boolean;
}

// ============================================
// Tool Configuration
// ============================================

export interface ToolConfig {
  // Enabled tools
  enabledTools: string[];

  // Tool-specific settings
  toolSettings: Record<string, ToolSettings>;

  // Execution
  maxToolCalls: number;
  toolTimeout: number; // Seconds
  parallelExecution: boolean;
}

export interface ToolSettings {
  enabled: boolean;
  config: Record<string, unknown>;
  rateLimit?: number;
}

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
] as const;

export type AvailableTool = typeof AVAILABLE_TOOLS[number];

// ============================================
// Web Search Configuration
// ============================================

export interface WebSearchConfig {
  enabled: boolean;

  // When to search
  autoSearch: boolean;
  searchTriggers: string[]; // Keywords that trigger search

  // Search parameters
  maxResults: number;
  preferredSources?: string[]; // Domain allowlist
  blockedSources?: string[]; // Domain blocklist

  // Freshness
  requireRecent: boolean;
  maxAge?: string; // e.g., '7d', '1m'

  // Safety
  safeSearch: boolean;
}

// ============================================
// Domain Knowledge Configuration
// ============================================

export interface DomainKnowledgeConfig {
  // Industry context
  industry?: string;
  subIndustry?: string;

  // Terminology
  customTerminology: Record<string, string>;

  // Frameworks
  frameworks: string[]; // e.g., 'MEDDIC', 'BANT'

  // Guidelines
  guidelines: string[];

  // Templates
  responseTemplates: Record<string, string>;
}

// ============================================
// Safety Configuration
// ============================================

export interface SafetyConfig {
  // Content filtering
  contentFiltering: 'strict' | 'balanced' | 'minimal';

  // Blocked topics
  blockedTopics: string[];

  // Required disclaimers
  disclaimers: {
    topic: string;
    disclaimer: string;
  }[];

  // Boundaries
  allowPersonalAdvice: boolean;
  allowFinancialAdvice: boolean;
  allowLegalAdvice: boolean;
  allowMedicalAdvice: boolean;

  // Transparency
  disclosureLevel: 'full' | 'minimal' | 'none';
  admitUncertainty: boolean;

  // Data handling
  piiHandling: 'mask' | 'redact' | 'allow';
  retainConversations: boolean;
}

// ============================================
// Localization Configuration
// ============================================

export interface LocalizationConfig {
  // Language
  defaultLanguage: string; // ISO 639-1
  supportedLanguages: string[];
  autoDetectLanguage: boolean;

  // Regional
  dateFormat: string;
  numberFormat: string;
  currency: string;
  timezone: string;

  // Units
  measurementSystem: 'metric' | 'imperial';
}

// ============================================
// Customization Control
// ============================================

export interface CustomizationControl {
  // What can be overridden
  allowPersonaOverride: boolean;
  allowStyleOverride: boolean;
  allowToolOverride: boolean;
  allowSafetyOverride: boolean;
  allowDomainOverride: boolean;

  // Locked settings
  lockedSettings: string[]; // Field paths that can't be changed

  // Inheritance
  inheritFrom?: string; // Parent config ID
}

// ============================================
// AI Config Structured Data
// ============================================

export interface AIConfigStructuredData {
  // Identity
  name: string;
  description?: string;
  scope: AIConfigScope;

  // Reference (for tenant/assistant configs)
  tenantId?: string;
  assistantId?: string;

  // Configuration sections
  persona: PersonaConfig;
  style: StyleConfig;
  tools: ToolConfig;
  webSearch: WebSearchConfig;
  domainKnowledge: DomainKnowledgeConfig;
  safety: SafetyConfig;
  localization: LocalizationConfig;

  // Customization control
  customization: CustomizationControl;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Versioning
  version: number;

  // Tags
  tags?: string[];
}

// ============================================
// Merged Configuration
// ============================================

export interface MergedAIConfig {
  // Resolved configuration
  persona: PersonaConfig;
  style: StyleConfig;
  tools: ToolConfig;
  webSearch: WebSearchConfig;
  domainKnowledge: DomainKnowledgeConfig;
  safety: SafetyConfig;
  localization: LocalizationConfig;

  // Source tracking
  sources: {
    section: string;
    configId: string;
    level: AIConfigLevel;
  }[];

  // Computed at
  resolvedAt: Date;
}

// ============================================
// API Types
// ============================================

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

// ============================================
// Default Configurations
// ============================================

export const DEFAULT_PERSONA: PersonaConfig = {
  name: 'Castiel Assistant',
  role: 'AI Business Intelligence Assistant',
  traits: ['analytical', 'helpful', 'professional'],
  expertise: ['data analysis', 'business insights', 'project management'],
  tone: 'professional',
  verbosity: 'balanced',
  proactivity: 'balanced',
  creativity: 0.5,
};

export const DEFAULT_STYLE: StyleConfig = {
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

export const DEFAULT_TOOLS: ToolConfig = {
  enabledTools: ['document_search', 'calculator'],
  toolSettings: {},
  maxToolCalls: 5,
  toolTimeout: 30,
  parallelExecution: true,
};

export const DEFAULT_WEB_SEARCH: WebSearchConfig = {
  enabled: false,
  autoSearch: false,
  searchTriggers: ['latest', 'news', 'current'],
  maxResults: 5,
  requireRecent: true,
  maxAge: '30d',
  safeSearch: true,
};

export const DEFAULT_DOMAIN_KNOWLEDGE: DomainKnowledgeConfig = {
  customTerminology: {},
  frameworks: [],
  guidelines: [],
  responseTemplates: {},
};

export const DEFAULT_SAFETY: SafetyConfig = {
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

export const DEFAULT_LOCALIZATION: LocalizationConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en'],
  autoDetectLanguage: true,
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-US',
  currency: 'USD',
  timezone: 'UTC',
  measurementSystem: 'metric',
};

export const DEFAULT_CUSTOMIZATION: CustomizationControl = {
  allowPersonaOverride: true,
  allowStyleOverride: true,
  allowToolOverride: true,
  allowSafetyOverride: false,
  allowDomainOverride: true,
  lockedSettings: [],
};

export const DEFAULT_AI_CONFIG: Omit<AIConfigStructuredData, 'scope' | 'tenantId' | 'assistantId'> = {
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











