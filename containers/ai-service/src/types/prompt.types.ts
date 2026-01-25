/**
 * Prompt Service types
 * Core data model for prompt management and A/B testing
 */

export enum PromptStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
}

export enum PromptABTestStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Prompt Template
 */
export interface PromptTemplate {
  id: string;
  tenantId: string; // Partition key
  slug: string; // Unique identifier (e.g., 'code-generation', 'planning')
  name: string; // Human-readable name
  description?: string;
  category?: string; // Category for grouping (e.g., 'code', 'planning', 'qa')
  content: string; // Prompt template content with {{variable}} syntax
  variables?: PromptVariable[]; // Required/optional variables
  version: number; // Version number
  status: PromptStatus;
  isDefault: boolean; // Whether this is the default version
  organizationId?: string; // Organization-specific override
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Prompt Variable
 */
export interface PromptVariable {
  name: string; // Variable name (without {{}})
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

/**
 * Prompt Version
 */
export interface PromptVersion {
  id: string;
  tenantId: string; // Partition key
  promptId: string; // Reference to prompt template
  version: number;
  content: string;
  variables?: PromptVariable[];
  changelog?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Prompt Variant (for A/B testing)
 */
export interface PromptVariant {
  variantId: string; // 'control' | 'treatment' | custom ID
  promptId: string; // ID of the prompt version
  promptSlug: string; // Slug of the prompt
  name: string; // Human-readable name
  trafficPercentage: number; // 0-100
  description?: string;
}

/**
 * Variant Metrics
 */
export interface VariantMetrics {
  impressions: number; // Number of times variant was used
  successfulResponses: number; // Successful completions
  failedResponses: number; // Failed completions
  averageTokens: number; // Average tokens used
  averageLatencyMs: number; // Average response latency
  userFeedbackScore: number; // 0-5 average rating
  positiveFeedback: number; // Count of positive feedback
  negativeFeedback: number; // Count of negative feedback
  totalCost: number; // Total cost in currency units
  lastUsedAt?: Date;
}

/**
 * Prompt A/B Test
 */
export interface PromptABTest {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  hypothesis?: string;
  promptSlug?: string; // Optional: specific prompt slug to test
  variants: PromptVariant[];
  trafficSplit: Record<string, number>; // Percentage per variant (must sum to 100)
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
  successCriteria?: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number; // Percentage improvement
    confidenceLevel: number; // 0.95 = 95% confidence
  };
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    tags?: string[];
  };
  status: PromptABTestStatus;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number; // Minimum days to run
  minSamplesPerVariant?: number; // Minimum samples per variant
  metrics: Record<string, VariantMetrics>; // Metrics per variant
  results?: {
    winner?: string; // variantId of winner
    statisticalSignificance?: number; // 0-1
    confidenceLevel?: number; // 0-1
    improvement?: number; // Percentage improvement
    completedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Prompt Analytics
 */
export interface PromptAnalytics {
  id: string;
  tenantId: string; // Partition key
  promptId: string;
  promptSlug: string;
  date: Date; // Date for aggregation
  usageCount: number; // Number of times prompt was used
  averageTokens: number;
  averageLatencyMs: number;
  successRate: number; // 0-1
  totalCost: number;
  userFeedbackScore: number; // 0-5 average
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create prompt template input
 */
export interface CreatePromptTemplateInput {
  tenantId: string;
  userId: string;
  slug: string;
  name: string;
  description?: string;
  category?: string;
  content: string;
  variables?: PromptVariable[];
  organizationId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update prompt template input
 */
export interface UpdatePromptTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  variables?: PromptVariable[];
  status?: PromptStatus;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Render prompt input
 */
export interface RenderPromptInput {
  tenantId: string;
  slug: string;
  variables: Record<string, any>;
  organizationId?: string;
  version?: number; // Specific version, or latest if not specified
}

/**
 * Create A/B test input
 */
export interface CreatePromptABTestInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  hypothesis?: string;
  promptSlug?: string;
  variants: Array<{
    variantId: string;
    promptId: string;
    promptSlug: string;
    name: string;
    trafficPercentage: number;
    description?: string;
  }>;
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
  successCriteria?: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number;
    confidenceLevel: number;
  };
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    tags?: string[];
  };
  minDuration?: number;
  minSamplesPerVariant?: number;
}
