/**
 * AI Recommendation System Types
 * 
 * Unified type definitions for all AI-powered recommendation types
 * across the Castiel platform.
 */

/**
 * All supported recommendation types
 */
export type RecommendationType =
  | 'schemaRecommendation'
  | 'embeddingTemplate'
  | 'uiSchemaRecommendation'
  | 'computedFieldRecommendation'
  | 'searchQueryRecommendation'
  | 'validationRuleRecommendation'
  | 'userIntentRecommendation'
  | 'promptGenerationRecommendation'
  | 'projectImprovementRecommendation';

/**
 * Risk level for auto-apply decisions
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Context data available for prompt rendering
 */
export interface RecommendationContext {
  // Always present
  tenantId: string;
  userId: string;
  
  // Entity-specific context
  shardType?: {
    id: string;
    name: string;
    description?: string;
    schema?: any;
    category?: string;
  };
  
  parentShardType?: {
    id: string;
    name: string;
    schema?: any;
  };
  
  relatedShardTypes?: Array<{
    id: string;
    name: string;
    schema?: any;
    category?: string;
  }>;
  
  // Existing data samples (anonymized)
  dataSamples?: Array<Record<string, any>>;
  
  // Tenant-specific conventions
  tenantConventions?: {
    namingPatterns?: Record<string, string>;
    defaultValidations?: Record<string, any>;
    preferredModels?: Record<string, string>;
    customRules?: Array<{
      type: string;
      rule: any;
    }>;
  };
  
  // User preferences
  userPreferences?: {
    preferredRiskLevel?: RiskLevel;
    autoApplyLowRisk?: boolean;
    preferredModel?: string;
  };
  
  // Field-specific context (for field-level recommendations)
  field?: {
    name: string;
    description?: string;
    existingType?: string;
  };
  
  // Free-form additional context
  additionalContext?: Record<string, any>;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

/**
 * Metadata about the recommendation generation
 */
export interface RecommendationMetadata {
  model: string;
  tokens: TokenUsage;
  processingTime: number; // seconds
  promptUsed: string; // prompt slug or ID
  promptVersion?: string;
  temperature?: number;
  timestamp: Date;
}

/**
 * Single recommendation option
 */
export interface RecommendationOption<T = any> {
  recommendation: T; // The actual generated content
  confidence: number; // 0-1
  reasoning: string; // Why this was suggested
  riskLevel: RiskLevel;
  editable?: boolean; // Can user edit before applying?
}

/**
 * Standard response format for all recommendations
 */
export interface AIRecommendationResponse<T = any> {
  type: RecommendationType;
  options: RecommendationOption<T>[]; // Multiple alternatives
  metadata: RecommendationMetadata;
  suggestedNextAction?: {
    type: RecommendationType;
    context: Partial<RecommendationContext>;
    message: string; // e.g., "Generate embedding template for this schema?"
  };
}

/**
 * Request to generate a recommendation
 */
export interface AIRecommendationRequest {
  type: RecommendationType;
  context: RecommendationContext;
  options?: {
    maxOptions?: number; // How many alternatives to generate (default: 3)
    temperature?: number; // 0-1 (default: 0.3)
    maxTokens?: number;
    preferredModel?: string;
  };
}

// ============================================================================
// Type-Specific Payloads
// ============================================================================

/**
 * Schema recommendation payload
 */
export interface SchemaRecommendation {
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
    required?: boolean;
    description?: string;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      enum?: any[];
    };
    defaultValue?: any;
    items?: any; // For arrays
    properties?: any; // For objects
  }>;
  suggestedIndices?: string[];
  suggestedRelationships?: Array<{
    targetShardType: string;
    relationship: 'oneToOne' | 'oneToMany' | 'manyToMany';
    fieldName: string;
  }>;
}

/**
 * Embedding template recommendation payload
 */
export interface EmbeddingTemplateRecommendation {
  name: string;
  description?: string;
  fields: Array<{
    name: string;
    weight: number; // 0-100
    include: boolean;
  }>;
  preprocessing?: {
    chunking?: {
      enabled: boolean;
      size?: number;
      overlap?: number;
    };
    normalization?: {
      lowercase?: boolean;
      removeSpecialChars?: boolean;
      removeStopWords?: boolean;
    };
    fieldSeparator?: string;
  };
  modelConfig?: {
    strategy: 'default' | 'fast' | 'quality' | 'custom';
    fallbackModel?: string;
  };
  parentContext?: {
    mode: 'prepend' | 'append' | 'none';
    weight: number;
    maxLength?: number;
    fields?: string[];
  };
}

/**
 * UI Schema recommendation payload
 */
export interface UISchemaRecommendation {
  layout: 'single-column' | 'two-column' | 'tabbed' | 'accordion';
  fieldOrder: string[];
  fieldGroups?: Array<{
    title: string;
    fields: string[];
    collapsible?: boolean;
  }>;
  fieldSettings?: Record<string, {
    widget?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'radio';
    placeholder?: string;
    helpText?: string;
    readOnly?: boolean;
    hidden?: boolean;
  }>;
}

/**
 * Computed field recommendation payload
 */
export interface ComputedFieldRecommendation {
  name: string;
  description?: string;
  formula: string; // Expression or code
  formulaLanguage: 'javascript' | 'jsonata' | 'excel';
  dependencies: string[]; // Field names this formula depends on
  returnType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  exampleInput?: Record<string, any>;
  exampleOutput?: any;
}

/**
 * Search query recommendation payload
 */
export interface SearchQueryRecommendation {
  name: string;
  description?: string;
  filters: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
  }>;
  sort?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
  aggregations?: Array<{
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  }>;
}

/**
 * Validation rule recommendation payload
 */
export interface ValidationRuleRecommendation {
  field: string;
  rule: {
    type: 'pattern' | 'custom' | 'range' | 'length' | 'format';
    pattern?: string; // Regex pattern
    message?: string; // Error message
    min?: number;
    max?: number;
    customValidator?: string; // Code as string
  };
  examples?: {
    valid: any[];
    invalid: any[];
  };
}

/**
 * User intent recommendation payload
 */
export interface UserIntentRecommendation {
  intent: string; // Classified intent
  confidence: number;
  suggestedActions: Array<{
    action: string;
    description: string;
    endpoint?: string;
    parameters?: Record<string, any>;
  }>;
  relatedEntities?: Array<{
    type: string;
    id?: string;
    name?: string;
  }>;
}

/**
 * Prompt generation recommendation payload
 */
export interface PromptGenerationRecommendation {
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: Array<{
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
  tags: string[];
  scope: 'system' | 'tenant' | 'user';
  exampleContext?: Record<string, any>;
  exampleOutput?: string;
}

/**
 * Project improvement recommendation payload
 */
export interface ProjectImprovementRecommendation {
  category: 'performance' | 'security' | 'maintainability' | 'usability' | 'documentation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large';
  impact: string; // What will improve
  steps: Array<{
    step: number;
    description: string;
    code?: string;
    filePath?: string;
  }>;
  relatedResources?: string[]; // URLs or doc links
}

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Interface that all recommendation handlers must implement
 */
export interface IRecommendationHandler<T = any> {
  /**
   * The recommendation type this handler supports
   */
  readonly type: RecommendationType;
  
  /**
   * Enrich the context with additional data needed for this recommendation type
   */
  enrichContext(context: RecommendationContext): Promise<RecommendationContext>;
  
  /**
   * Validate the generated recommendation before returning to user
   */
  validate(recommendation: T): Promise<{ valid: boolean; errors?: string[] }>;
  
  /**
   * Generate the recommendation using Azure OpenAI
   */
  generate(
    context: RecommendationContext,
    options?: AIRecommendationRequest['options']
  ): Promise<AIRecommendationResponse<T>>;
  
  /**
   * Determine if this recommendation should auto-apply
   */
  shouldAutoApply(option: RecommendationOption<T>, context: RecommendationContext): boolean;
  
  /**
   * Suggest next action after this recommendation is applied
   */
  suggestNextAction?(
    appliedRecommendation: T,
    context: RecommendationContext
  ): Promise<AIRecommendationResponse['suggestedNextAction'] | null>;
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  perUser: {
    maxRequests: number;
    windowMs: number; // Time window in milliseconds
  };
  perTenant: {
    maxRequests: number;
    windowMs: number;
  };
  costTracking: {
    budgetPerTenant?: number; // USD per month
    alertThreshold?: number; // Percentage (e.g., 80)
  };
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  userId?: string;
  tenantId: string;
  requests: number;
  resetAt: Date;
  exceeded: boolean;
}

/**
 * Cost tracking entry
 */
export interface CostTrackingEntry {
  tenantId: string;
  userId: string;
  recommendationType: RecommendationType;
  tokens: TokenUsage;
  estimatedCost: number; // USD
  timestamp: Date;
}
