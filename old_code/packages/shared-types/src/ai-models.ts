/**
 * AI Model and Connection Types
 * 
 * Two-part architecture:
 * 1. AIModel: Catalog of available models (managed by super admin)
 * 2. AIConnection: Specific credentials/endpoints to connect to models
 */

/**
 * AI model type - expanded for multi-modal support
 */
export type AIModelType = 
  | 'LLM'                    // Text generation
  | 'Embedding'              // Text embeddings
  | 'ImageGeneration'        // Image creation (DALL-E, Stable Diffusion)
  | 'TextToSpeech'           // Audio generation
  | 'SpeechToText'           // Audio transcription
  | 'Vision'                 // Image understanding
  | 'VideoGeneration'        // Video creation (future)
  | 'Moderation';            // Content filtering

/**
 * Content capability - what the model can produce
 */
export type ContentCapability = 
  | 'text'
  | 'image' 
  | 'audio'
  | 'video'
  | 'embedding';

/**
 * Quality tier for routing and cost optimization
 */
export type QualityTier = 
  | 'economy'    // Low cost, simple tasks (e.g., Claude Haiku, GPT-3.5)
  | 'standard'   // Balanced (e.g., GPT-4o, Claude Sonnet)
  | 'premium';   // Best quality (e.g., Claude Opus, GPT-4)

/**
 * Where the model is hosted
 */
export type AIModelHoster =
  | 'OpenAI'
  | 'Azure'
  | 'AWS'
  | 'GCP'
  | 'Anthropic'
  | 'Self-Hosted';

/**
 * AI model provider
 */
export type AIModelProvider =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google'
  | 'Cohere'
  | 'HuggingFace'
  | 'Custom';

/**
 * Model status
 */
export type AIModelStatus = 'active' | 'deprecated' | 'disabled';

/**
 * Connection status
 */
export type AIConnectionStatus = 'active' | 'disabled' | 'error';

/**
 * AI Model (Catalog Entry)
 * 
 * Defines the capabilities and specifications of an AI model.
 * Managed by super admins only.
 */
export interface AIModel {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Provider of the model */
  provider: AIModelProvider;

  /** Type of model */
  type: AIModelType;

  /** Where the model is hosted */
  hoster: AIModelHoster;

  /** Whether tenants can create their own connections to this model */
  allowTenantConnections: boolean;

  /** Context window size (tokens) */
  contextWindow: number;

  /** Maximum output tokens */
  maxOutputs: number;

  /** Supports streaming responses */
  streaming: boolean;

  /** Supports vision/image inputs */
  vision: boolean;

  /** Supports function calling */
  functions: boolean;

  /** Supports JSON mode */
  jsonMode: boolean;

  /** Model status */
  status: AIModelStatus;

  /** Quality/cost tier */
  qualityTier: QualityTier;
  
  /** Content capabilities this model supports */
  capabilities: ContentCapability[];
  
  /** Task suitability scores (0-100) */
  taskScores?: {
    textGeneration?: number;
    reasoning?: number;
    coding?: number;
    creative?: number;
    dataAnalysis?: number;
    conversation?: number;
  };
  
  /** Average latency in milliseconds */
  avgLatencyMs?: number;
  
  /** Maximum concurrent requests supported */
  maxConcurrency?: number;

  /** Optional description */
  description?: string;

  /** Model version/identifier used by provider */
  modelIdentifier?: string;

  /** Pricing information (optional) */
  pricing?: {
    inputTokenPrice?: number; // per 1K tokens
    outputTokenPrice?: number; // per 1K tokens
    currency?: string; // default: USD
  };

  /** Creation metadata */
  createdAt: string;
  createdBy: string;

  /** Update metadata */
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Input for creating a new AI model
 */
export interface CreateAIModelInput {
  name: string;
  provider: AIModelProvider;
  type: AIModelType;
  hoster: AIModelHoster;
  allowTenantConnections: boolean;
  contextWindow: number;
  maxOutputs: number;
  streaming: boolean;
  vision: boolean;
  functions: boolean;
  jsonMode: boolean;
  qualityTier: QualityTier;
  capabilities: ContentCapability[];
  taskScores?: {
    textGeneration?: number;
    reasoning?: number;
    coding?: number;
    creative?: number;
    dataAnalysis?: number;
    conversation?: number;
  };
  avgLatencyMs?: number;
  maxConcurrency?: number;
  description?: string;
  modelIdentifier?: string;
  pricing?: {
    inputTokenPrice?: number;
    outputTokenPrice?: number;
    currency?: string;
  };
}

/**
 * Input for updating an AI model
 */
export interface UpdateAIModelInput {
  name?: string;
  allowTenantConnections?: boolean;
  contextWindow?: number;
  maxOutputs?: number;
  streaming?: boolean;
  vision?: boolean;
  functions?: boolean;
  jsonMode?: boolean;
  status?: AIModelStatus;
  qualityTier?: QualityTier;
  capabilities?: ContentCapability[];
  taskScores?: {
    textGeneration?: number;
    reasoning?: number;
    coding?: number;
    creative?: number;
    dataAnalysis?: number;
    conversation?: number;
  };
  avgLatencyMs?: number;
  maxConcurrency?: number;
  description?: string;
  modelIdentifier?: string;
  pricing?: {
    inputTokenPrice?: number;
    outputTokenPrice?: number;
    currency?: string;
  };
}

/**
 * AI Connection (Instance Configuration)
 * 
 * Specific credentials and endpoint configuration to connect to a model.
 * Can be system-wide (super admin) or tenant-specific (tenant admin).
 */
export interface AIConnection {
  /** Unique identifier */
  id: string;

  /** Display name for this connection */
  name: string;

  /** Reference to the AI model in the catalog */
  modelId: string;

  /** 
   * Tenant ID for tenant-specific connections
   * null = system-wide connection (available to all tenants)
   */
  tenantId: string | null;

  /** API endpoint URL */
  endpoint: string;

  /** API version (for Azure, etc.) */
  version?: string;

  /** Deployment name (for Azure OpenAI) */
  deploymentName?: string;

  /** 
   * Context window override
   * Can be lower than model default for quota/limit purposes
   */
  contextWindow?: number;

  /** 
   * Whether this is the default connection
   * - System connection: default for all tenants without their own connection
   * - Tenant connection: default for this specific tenant
   */
  isDefaultModel: boolean;

  /**
   * Key Vault secret ID containing the API key
   * Format: ai-provider-{provider}-system or ai-provider-{provider}-tenant-{tenantId}
   * Optional if apiKeyEnvVar is set
   */
  secretId?: string;

  /**
   * Environment variable name containing the API key
   * Used instead of Key Vault if set
   */
  apiKeyEnvVar?: string;

  /** Connection status */
  status: AIConnectionStatus;

  /** Optional error message if status is 'error' */
  errorMessage?: string;

  /** Last time this connection was successfully used */
  lastUsedAt?: string;

  /** Creation metadata */
  createdAt: string;
  createdBy: string;

  /** Update metadata */
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Input for creating a new AI connection
 */
export interface CreateAIConnectionInput {
  name: string;
  modelId: string;
  tenantId?: string | null; // null for system-wide
  endpoint: string;
  version?: string;
  deploymentName?: string;
  contextWindow?: number;
  isDefaultModel?: boolean;
  apiKey?: string; // Will be stored in Key Vault, not in database
  apiKeyEnvVar?: string; // Optional: use env var instead of Key Vault
}

/**
 * Input for updating an AI connection
 */
export interface UpdateAIConnectionInput {
  name?: string;
  endpoint?: string;
  version?: string;
  deploymentName?: string;
  contextWindow?: number;
  isDefaultModel?: boolean;
  status?: AIConnectionStatus;
  apiKey?: string; // If provided, will update Key Vault
  apiKeyEnvVar?: string;
}

/**
 * Result when retrieving connection credentials
 */
export interface AIConnectionCredentials {
  connection: AIConnection;
  model: AIModel;
  apiKey: string; // Retrieved from Key Vault
}

/**
 * Query filters for listing AI models
 */
export interface AIModelListFilters {
  type?: AIModelType;
  provider?: AIModelProvider;
  hoster?: AIModelHoster;
  status?: AIModelStatus;
  allowTenantConnections?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'provider' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query filters for listing AI connections
 */
export interface AIConnectionListFilters {
  modelId?: string;
  tenantId?: string | null; // null to get system connections only
  type?: AIModelType;
  status?: AIConnectionStatus;
  isDefaultModel?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'modelId' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
