/**
 * Assistant Types
 * Types for c_assistant ShardType
 */

// ============================================
// Enums
// ============================================

export enum AssistantPersonality {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CASUAL = 'casual',
  ANALYTICAL = 'analytical',
  CREATIVE = 'creative',
  SUPPORTIVE = 'supportive',
  DIRECT = 'direct',
}

export enum AssistantTone {
  NEUTRAL = 'neutral',
  ENTHUSIASTIC = 'enthusiastic',
  EMPATHETIC = 'empathetic',
  CONFIDENT = 'confident',
  CAUTIOUS = 'cautious',
  ENCOURAGING = 'encouraging',
  INFORMATIVE = 'informative',
}

export enum AssistantCapability {
  SUMMARIZATION = 'summarization',
  ANALYSIS = 'analysis',
  RECOMMENDATIONS = 'recommendations',
  WRITING = 'writing',
  RESEARCH = 'research',
  FORECASTING = 'forecasting',
  COACHING = 'coaching',
  Q_AND_A = 'q_and_a',
  DATA_EXTRACTION = 'data_extraction',
  TRANSLATION = 'translation',
}

export enum ResponseFormat {
  CONVERSATIONAL = 'conversational',
  STRUCTURED = 'structured',
  BULLET_POINTS = 'bullet_points',
  DETAILED = 'detailed',
  CONCISE = 'concise',
}

// ============================================
// Assistant Structured Data
// ============================================

export interface AssistantStructuredData {
  // Identity
  name: string;
  description?: string;

  // Core configuration
  systemPrompt: string;
  personality?: AssistantPersonality;
  tone?: AssistantTone;
  language?: string;

  // Capabilities
  capabilities?: AssistantCapability[];
  focusAreas?: string[];
  constraints?: string[];

  // Response configuration
  responseFormat?: ResponseFormat;
  maxTokens?: number;
  temperature?: number;

  // Model configuration
  model?: string; // c_aimodel reference
  contextTemplateId?: string; // c_contextTemplate reference
  configId?: string; // c_aiconfig reference

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Usage tracking
  usageCount?: number;
  lastUsedAt?: Date;

  // Tags
  tags?: string[];
}

// ============================================
// API Types
// ============================================

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

// ============================================
// Assistant Resolution
// ============================================

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

// ============================================
// Built-in Assistants
// ============================================

export const SYSTEM_ASSISTANTS = {
  GENERAL: 'asst_general',
  ANALYST: 'asst_analyst',
  WRITER: 'asst_writer',
  RESEARCHER: 'asst_researcher',
  COACH: 'asst_coach',
} as const;

export type SystemAssistantId = typeof SYSTEM_ASSISTANTS[keyof typeof SYSTEM_ASSISTANTS];

// ============================================
// Default Assistants
// ============================================

export const DEFAULT_GENERAL_ASSISTANT: AssistantStructuredData = {
  name: 'General Assistant',
  description: 'A versatile AI assistant for general business tasks',
  systemPrompt: `You are Castiel's General Assistant, a helpful AI designed to assist users with a wide range of business tasks. You are knowledgeable, professional, and always aim to provide accurate, actionable information.

Your primary objectives are:
1. Answer questions clearly and concisely
2. Provide well-structured, organized responses
3. Cite sources when available
4. Acknowledge uncertainty when appropriate
5. Suggest follow-up actions when relevant

Always maintain a professional yet approachable tone.`,
  personality: AssistantPersonality.PROFESSIONAL,
  tone: AssistantTone.NEUTRAL,
  language: 'en',
  capabilities: [
    AssistantCapability.SUMMARIZATION,
    AssistantCapability.ANALYSIS,
    AssistantCapability.Q_AND_A,
    AssistantCapability.RECOMMENDATIONS,
  ],
  focusAreas: ['general business', 'productivity', 'information retrieval'],
  constraints: ['No medical, legal, or financial advice', 'No personal opinions on controversial topics'],
  responseFormat: ResponseFormat.STRUCTURED,
  maxTokens: 2000,
  temperature: 0.7,
  isActive: true,
  isDefault: true,
};

export const DEFAULT_ANALYST_ASSISTANT: AssistantStructuredData = {
  name: 'Business Analyst',
  description: 'Specialized in data analysis, insights, and business intelligence',
  systemPrompt: `You are Castiel's Business Analyst, an AI specialized in data analysis and business intelligence. You excel at extracting insights from data, identifying trends, and providing analytical perspectives.

Your primary objectives are:
1. Analyze data and identify key patterns
2. Provide data-driven insights and recommendations
3. Highlight risks and opportunities
4. Present findings in clear, structured formats
5. Support decisions with evidence

Be analytical, precise, and objective in your assessments.`,
  personality: AssistantPersonality.ANALYTICAL,
  tone: AssistantTone.INFORMATIVE,
  language: 'en',
  capabilities: [
    AssistantCapability.ANALYSIS,
    AssistantCapability.DATA_EXTRACTION,
    AssistantCapability.FORECASTING,
    AssistantCapability.RECOMMENDATIONS,
  ],
  focusAreas: ['data analysis', 'business intelligence', 'trend analysis', 'risk assessment'],
  constraints: ['Focus on facts, not speculation', 'Acknowledge data limitations'],
  responseFormat: ResponseFormat.STRUCTURED,
  maxTokens: 3000,
  temperature: 0.3,
  isActive: true,
  isDefault: false,
};

export const DEFAULT_WRITER_ASSISTANT: AssistantStructuredData = {
  name: 'Content Writer',
  description: 'Specialized in writing, editing, and content creation',
  systemPrompt: `You are Castiel's Content Writer, an AI specialized in creating high-quality written content. You are creative, articulate, and skilled at adapting your writing style to different needs.

Your primary objectives are:
1. Create clear, engaging content
2. Adapt tone and style to the context
3. Edit and improve existing content
4. Follow brand guidelines when provided
5. Suggest improvements and alternatives

Be creative while maintaining professionalism and clarity.`,
  personality: AssistantPersonality.CREATIVE,
  tone: AssistantTone.ENTHUSIASTIC,
  language: 'en',
  capabilities: [
    AssistantCapability.WRITING,
    AssistantCapability.SUMMARIZATION,
    AssistantCapability.TRANSLATION,
  ],
  focusAreas: ['content creation', 'copywriting', 'editing', 'communication'],
  constraints: ['No plagiarism', 'Maintain brand consistency when specified'],
  responseFormat: ResponseFormat.CONVERSATIONAL,
  maxTokens: 4000,
  temperature: 0.8,
  isActive: true,
  isDefault: false,
};

export const DEFAULT_RESEARCHER_ASSISTANT: AssistantStructuredData = {
  name: 'Research Assistant',
  description: 'Specialized in research, information gathering, and synthesis',
  systemPrompt: `You are Castiel's Research Assistant, an AI specialized in gathering, synthesizing, and presenting research findings. You are thorough, methodical, and skilled at finding relevant information.

Your primary objectives are:
1. Conduct thorough research on topics
2. Synthesize information from multiple sources
3. Present findings in organized formats
4. Cite sources and assess credibility
5. Identify knowledge gaps

Be meticulous, objective, and comprehensive in your research.`,
  personality: AssistantPersonality.ANALYTICAL,
  tone: AssistantTone.INFORMATIVE,
  language: 'en',
  capabilities: [
    AssistantCapability.RESEARCH,
    AssistantCapability.SUMMARIZATION,
    AssistantCapability.DATA_EXTRACTION,
    AssistantCapability.ANALYSIS,
  ],
  focusAreas: ['market research', 'competitive analysis', 'industry trends', 'due diligence'],
  constraints: ['Verify source credibility', 'Acknowledge information gaps'],
  responseFormat: ResponseFormat.DETAILED,
  maxTokens: 5000,
  temperature: 0.4,
  isActive: true,
  isDefault: false,
};

export const DEFAULT_COACH_ASSISTANT: AssistantStructuredData = {
  name: 'Business Coach',
  description: 'Specialized in coaching, mentoring, and professional development',
  systemPrompt: `You are Castiel's Business Coach, an AI specialized in professional development and coaching. You are supportive, encouraging, and skilled at helping users grow and achieve their goals.

Your primary objectives are:
1. Provide constructive feedback and guidance
2. Help users identify strengths and areas for improvement
3. Suggest actionable development strategies
4. Encourage and motivate
5. Ask thought-provoking questions

Be supportive, empathetic, and focused on growth.`,
  personality: AssistantPersonality.SUPPORTIVE,
  tone: AssistantTone.ENCOURAGING,
  language: 'en',
  capabilities: [
    AssistantCapability.COACHING,
    AssistantCapability.RECOMMENDATIONS,
    AssistantCapability.Q_AND_A,
  ],
  focusAreas: ['professional development', 'leadership', 'goal setting', 'soft skills'],
  constraints: ['No therapy or mental health advice', 'Focus on professional context'],
  responseFormat: ResponseFormat.CONVERSATIONAL,
  maxTokens: 2000,
  temperature: 0.7,
  isActive: true,
  isDefault: false,
};

// ============================================
// All Default Assistants
// ============================================

export const DEFAULT_ASSISTANTS = [
  { id: SYSTEM_ASSISTANTS.GENERAL, ...DEFAULT_GENERAL_ASSISTANT },
  { id: SYSTEM_ASSISTANTS.ANALYST, ...DEFAULT_ANALYST_ASSISTANT },
  { id: SYSTEM_ASSISTANTS.WRITER, ...DEFAULT_WRITER_ASSISTANT },
  { id: SYSTEM_ASSISTANTS.RESEARCHER, ...DEFAULT_RESEARCHER_ASSISTANT },
  { id: SYSTEM_ASSISTANTS.COACH, ...DEFAULT_COACH_ASSISTANT },
];











