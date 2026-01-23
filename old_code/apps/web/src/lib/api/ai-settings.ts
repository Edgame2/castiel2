/**
 * AI Settings API Client
 * Handles communication with AI configuration endpoints
 * 
 * Two-part architecture:
 * 1. AI Models (Catalog) - Defines available models and capabilities
 * 2. AI Connections - Specific credentials/endpoints to connect to models
 */

import { apiClient } from './client'

// ============================================
// Types - New Two-Part Architecture
// ============================================

/**
 * AI Model (Catalog Entry)
 * Defines the capabilities and specifications of an AI model
 */
export interface AIModelCatalog {
  id: string
  name: string
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Cohere' | 'HuggingFace' | 'Custom'
  type: 'LLM' | 'Embedding'
  hoster: 'OpenAI' | 'Azure' | 'AWS' | 'GCP' | 'Anthropic' | 'Self-Hosted'
  allowTenantConnections: boolean
  contextWindow: number
  maxOutputs: number
  streaming: boolean
  vision: boolean
  functions: boolean
  jsonMode: boolean
  status: 'active' | 'deprecated' | 'disabled'
  description?: string
  modelIdentifier?: string
  pricing?: {
    inputTokenPrice?: number
    outputTokenPrice?: number
    currency?: string
  }
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy?: string
}

/**
 * AI Connection (Instance Configuration)
 * Specific credentials and endpoint configuration to connect to a model
 */
export interface AIConnection {
  id: string
  name: string
  modelId: string
  tenantId: string | null // null = system-wide
  endpoint: string
  version?: string
  deploymentName?: string
  contextWindow?: number
  isDefaultModel: boolean
  secretId: string // Key Vault secret ID
  status: 'active' | 'disabled' | 'error'
  errorMessage?: string
  lastUsedAt?: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy?: string
}

/**
 * Connection with credentials (includes API key from Key Vault)
 */
export interface AIConnectionWithCredentials {
  connection: AIConnection
  model: AIModelCatalog
  apiKey: string
}

/**
 * Input types for creating/updating catalog models
 */
export type CreateAIModelCatalogInput = Omit<AIModelCatalog, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>

export type UpdateAIModelCatalogInput = Partial<Omit<AIModelCatalog, 'id' | 'provider' | 'type' | 'hoster' | 'createdAt' | 'createdBy'>>

/**
 * Input types for creating/updating connections
 */
export type CreateAIConnectionInput = Omit<AIConnection, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
  apiKey: string // API key to store in Key Vault
}

export type UpdateAIConnectionInput = Partial<Omit<AIConnection, 'id' | 'modelId' | 'tenantId' | 'secretId' | 'createdAt' | 'createdBy'>> & {
  apiKey?: string // Optional - only if updating API key
}

/**
 * Legacy AI Model type (for backward compatibility)
 */
export interface AIModel {
  id: string
  name: string
  modelId: string
  modelType: 'LLM' | 'EMBEDDING' | 'IMAGE_GENERATION' | 'TEXT_TO_SPEECH' | 'SPEECH_TO_TEXT' | 'MODERATION'
  provider: string
  hoster: string
  version?: string
  description?: string

  // Availability
  isSystemWide: boolean
  isDefault: boolean
  allowTenantCustom: boolean
  isActive: boolean
  isDeprecated: boolean
  deprecationDate?: string

  // Capabilities
  contextWindow?: number
  maxOutputTokens?: number
  supportsStreaming: boolean
  supportsVision: boolean
  supportsFunctionCalling: boolean
  supportsJSON: boolean

  // Pricing (per million tokens)
  inputPricePerMillion?: number
  outputPricePerMillion?: number

  // Configuration
  endpoint?: string
  deploymentName?: string

  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface AIModelCreate {
  name: string
  modelId: string
  modelType: AIModel['modelType']
  provider: string
  hoster: string
  version?: string
  description?: string
  isSystemWide?: boolean
  isDefault?: boolean
  allowTenantCustom?: boolean
  contextWindow?: number
  maxOutputTokens?: number
  supportsStreaming?: boolean
  supportsVision?: boolean
  supportsFunctionCalling?: boolean
  supportsJSON?: boolean
  inputPricePerMillion?: number
  outputPricePerMillion?: number
  endpoint?: string
  deploymentName?: string
  tags?: string[]
}

export interface AIModelUpdate extends Partial<AIModelCreate> {
  isActive?: boolean
  isDeprecated?: boolean
  deprecationDate?: string
}

export interface ModelSelectionConfig {
  enabled: boolean
  defaultQualityPreference: 'economy' | 'standard' | 'premium' | 'auto'
  scoringWeights: {
    complexityMatching: number
    costOptimization: number
    capabilityMatching: number
    performanceHistory?: number
  }
  complexityThresholds: {
    economyMax: number
    premiumMin: number
  }
  costOptimization: {
    strategy: 'aggressive' | 'balanced' | 'quality-first'
    maxCostMultiplier: number
    preferTenantModels: boolean
  }
  fallback: {
    allowFallback: boolean
    fallbackOrder: ('economy' | 'standard' | 'premium')[]
    maxFallbackAttempts: number
  }
  performanceBasedSelection?: {
    enabled: boolean
    minSampleSize: number
    performanceWeight: number
    considerLatency: boolean
    considerSuccessRate: boolean
    considerUserSatisfaction: boolean
  }
  insightTypePreferences?: {
    [insightType: string]: {
      preferredTier?: 'economy' | 'standard' | 'premium'
      preferredModels?: string[]
      minTier?: 'economy' | 'standard' | 'premium'
    }
  }
  tenantOverrides: {
    allowQualityPreference: boolean
    allowModelBlacklist: boolean
    allowModelWhitelist: boolean
    maxCustomPreferences: number
  }
}

export interface SystemAIConfig {
  defaultLLMModelId?: string
  defaultEmbeddingModelId?: string
  defaultImageModelId?: string
  allowTenantModels: boolean
  maxTokensPerRequest: number
  maxRequestsPerMinute: number
  enabledProviders: string[]
  modelSelection?: ModelSelectionConfig
  updatedAt: string
  updatedBy?: string
}

export interface TenantAIConfig {
  tenantId: string
  defaultLLMModelId?: string
  defaultEmbeddingModelId?: string
  customModels: string[] // Model IDs
  usageLimit?: number
  currentUsage?: number
  allowCustomApiKeys: boolean
  customCredentials?: {
    provider: string
    hasCredentials: boolean
  }[]
  updatedAt: string
  updatedBy?: string
}

export interface AIUsageStats {
  period: 'day' | 'week' | 'month'
  totalRequests: number
  totalTokens: number
  totalCost: number
  byModel: {
    modelId: string
    modelName: string
    requests: number
    tokens: number
    cost: number
  }[]
  byTenant?: {
    tenantId: string
    tenantName: string
    requests: number
    tokens: number
    cost: number
  }[]
}

// ============================================
// API Client
// ============================================

export const aiSettingsApi = {
  // ============================================
  // AI Models API (Super Admin)
  // ============================================

  /**
   * List all AI models
   */
  async listModels(params?: {
    type?: AIModel['modelType']
    provider?: string
    isActive?: boolean
    isSystemWide?: boolean
  }): Promise<{ models: AIModel[]; total: number }> {
    const response = await apiClient.get('/api/v1/admin/ai/models', { params })
    return response.data
  },

  /**
   * Get a single AI model
   */
  async getModel(id: string): Promise<AIModel> {
    const response = await apiClient.get(`/api/v1/admin/ai/models/${id}`)
    return response.data
  },

  /**
   * Create a new AI model
   */
  async createModel(data: AIModelCreate): Promise<AIModel> {
    const response = await apiClient.post('/api/v1/admin/ai/models', data)
    return response.data
  },

  /**
   * Update an AI model
   */
  async updateModel(id: string, data: AIModelUpdate): Promise<AIModel> {
    const response = await apiClient.patch(`/api/v1/admin/ai/models/${id}`, data)
    return response.data
  },

  /**
   * Delete an AI model
   */
  async deleteModel(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/ai/models/${id}`)
  },

  /**
   * Set model as default
   */
  async setDefaultModel(id: string, type: AIModel['modelType']): Promise<void> {
    await apiClient.post(`/api/v1/admin/ai/models/${id}/set-default`, { type })
  },

  // ============================================
  // System AI Config API (Super Admin)
  // ============================================

  /**
   * Get system AI configuration
   */
  async getSystemConfig(): Promise<SystemAIConfig> {
    const response = await apiClient.get('/api/v1/admin/ai/config' as any)
    return response.data
  },

  /**
   * Update system AI configuration
   */
  async updateSystemConfig(data: Partial<SystemAIConfig>): Promise<SystemAIConfig> {
    const response = await apiClient.patch('/api/v1/admin/ai/config', data)
    return response.data
  },

  // ============================================
  // Tenant AI Config API (Tenant Admin)
  // ============================================

  /**
   * Get tenant AI configuration
   */
  async getTenantConfig(tenantId?: string): Promise<TenantAIConfig> {
    const url = tenantId ? `/api/v1/tenant/${tenantId}/ai/config` : '/api/v1/tenant/ai/config'
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Update tenant AI configuration
   */
  async updateTenantConfig(
    data: Partial<Omit<TenantAIConfig, 'tenantId'>>,
    tenantId?: string
  ): Promise<TenantAIConfig> {
    const url = tenantId ? `/api/v1/tenant/${tenantId}/ai/config` : '/api/v1/tenant/ai/config'
    const response = await apiClient.patch(url, data)
    return response.data
  },

  /**
   * Add custom credentials for a provider
   */
  async addCustomCredentials(
    provider: string,
    credentials: { apiKey: string; endpoint?: string },
    tenantId?: string
  ): Promise<void> {
    const url = tenantId
      ? `/api/v1/tenant/${tenantId}/ai/credentials/${provider}`
      : `/api/v1/tenant/ai/credentials/${provider}`
    await apiClient.post(url, credentials)
  },

  /**
   * Remove custom credentials for a provider
   */
  async removeCustomCredentials(provider: string, tenantId?: string): Promise<void> {
    const url = tenantId
      ? `/api/v1/tenant/${tenantId}/ai/credentials/${provider}`
      : `/api/v1/tenant/ai/credentials/${provider}`
    await apiClient.delete(url)
  },

  // ============================================
  // Usage Stats API
  // ============================================

  /**
   * Get AI usage statistics
   */
  async getUsageStats(params?: {
    period?: 'day' | 'week' | 'month'
    tenantId?: string
    modelId?: string
  }): Promise<AIUsageStats> {
    const response = await apiClient.get('/api/v1/admin/ai/usage', { params })
    return response.data
  },

  // ============================================
  // Available Models for Selection
  // ============================================

  /**
   * Get models available for the current tenant
   */
  async getAvailableModels(type?: AIModel['modelType']): Promise<AIModel[]> {
    const response = await apiClient.get('/api/v1/ai/models/available', { params: { type } })
    return response.data.models
  },

  // ============================================
  // NEW: AI Models Catalog API (Super Admin)
  // ============================================

  /**
   * List AI models in catalog
   */
  async listModelsCatalog(params?: {
    type?: 'LLM' | 'Embedding'
    provider?: string
    hoster?: string
    status?: 'active' | 'deprecated' | 'disabled'
    allowTenantConnections?: boolean
  }): Promise<{ models: AIModelCatalog[] }> {
    const response = await apiClient.get('/api/v1/admin/ai/models', { params })
    return response.data
  },

  /**
   * Get a model from catalog
   */
  async getModelCatalog(modelId: string): Promise<{ model: AIModelCatalog }> {
    const response = await apiClient.get(`/api/v1/admin/ai/models/${modelId}`)
    return response.data
  },

  /**
   * Create a model in catalog
   */
  async createModelCatalog(data: {
    name: string
    provider: string
    type: 'LLM' | 'Embedding'
    hoster: string
    allowTenantConnections: boolean
    contextWindow: number
    maxOutputs: number
    streaming: boolean
    vision: boolean
    functions: boolean
    jsonMode: boolean
    description?: string
    modelIdentifier?: string
    pricing?: {
      inputTokenPrice?: number
      outputTokenPrice?: number
      currency?: string
    }
  }): Promise<{ success: boolean; model: AIModelCatalog }> {
    const response = await apiClient.post('/api/v1/admin/ai/models', data)
    return response.data
  },

  /**
   * Update a model in catalog
   */
  async updateModelCatalog(
    modelId: string,
    data: Partial<{
      name: string
      allowTenantConnections: boolean
      contextWindow: number
      maxOutputs: number
      streaming: boolean
      vision: boolean
      functions: boolean
      jsonMode: boolean
      status: 'active' | 'deprecated' | 'disabled'
      description: string
      modelIdentifier: string
      pricing: {
        inputTokenPrice?: number
        outputTokenPrice?: number
        currency?: string
      }
    }>
  ): Promise<{ success: boolean; model: AIModelCatalog }> {
    const response = await apiClient.patch(`/api/v1/admin/ai/models/${modelId}`, data)
    return response.data
  },

  /**
   * Delete a model from catalog
   */
  async deleteModelCatalog(modelId: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/ai/models/${modelId}`)
  },

  /**
   * Get models available for tenant connections
   */
  async getModelsForTenants(): Promise<{ models: AIModelCatalog[] }> {
    const response = await apiClient.get('/api/v1/tenant/ai/available-models' as any)
    return response.data
  },

  // ============================================
  // NEW: AI Connections API (System & Tenant)
  // ============================================

  /**
   * List system AI connections (Super Admin)
   */
  async listSystemConnections(params?: {
    modelId?: string
    status?: 'active' | 'disabled' | 'error'
    isDefaultModel?: boolean
  }): Promise<{ connections: AIConnection[] }> {
    const response = await apiClient.get('/api/v1/admin/ai/connections', { params })
    return response.data
  },

  /**
   * Get a single system AI connection by ID (Super Admin)
   */
  async getSystemConnection(connectionId: string): Promise<{ connection: AIConnection }> {
    const response = await apiClient.get(`/api/v1/admin/ai/connections/${connectionId}`)
    return response.data
  },

  /**
   * Create a system AI connection (Super Admin)
   */
  async createSystemConnection(data: {
    name: string
    modelId: string
    endpoint: string
    version?: string
    deploymentName?: string
    contextWindow?: number
    isDefaultModel?: boolean
    apiKey: string
  }): Promise<{ success: boolean; message: string; connection: AIConnection }> {
    const response = await apiClient.post('/api/v1/admin/ai/connections', data)
    return response.data
  },

  /**
   * Update a system AI connection (Super Admin)
   */
  async updateSystemConnection(
    connectionId: string,
    data: Partial<{
      name: string
      endpoint: string
      version: string
      deploymentName: string
      contextWindow: number
      isDefaultModel: boolean
      status: 'active' | 'disabled' | 'error'
      apiKey: string
    }>
  ): Promise<{ success: boolean; connection: AIConnection }> {
    const response = await apiClient.patch(`/api/v1/admin/ai/connections/${connectionId}`, data)
    return response.data
  },

  /**
   * Toggle connection status (active ↔ disabled)
   */
  async toggleSystemConnectionStatus(connectionId: string): Promise<{ success: boolean; connection: AIConnection }> {
    const response = await apiClient.post(`/api/v1/admin/ai/connections/${connectionId}/toggle-status`, {})
    return response.data
  },

  /**
   * Delete a system AI connection (Super Admin)
   */
  async deleteSystemConnection(connectionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/ai/connections/${connectionId}`)
  },

  /**
   * Test a system AI connection (Super Admin)
   */
  async testSystemConnection(connectionId: string): Promise<{
    connectionId: string
    connectionName: string
    success: boolean
    message: string
    latency?: number
    endpoint?: string
    modelInfo?: any
    error?: string
    modelType?: string
    provider?: string
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }> {
    const response = await apiClient.post(
      `/api/v1/admin/ai/connections/${connectionId}/test`,
      {}
    )
    return response.data
  },

  /**
   * List tenant AI connections (only active)
   */
  async listTenantConnections(): Promise<{ connections: AIConnection[] }> {
    const response = await apiClient.get('/api/v1/tenant/ai/connections' as any)
    // Filter to only active connections for regular users
    return {
      connections: response.data.connections.filter((c: AIConnection) => c.status === 'active')
    }
  },

  /**
   * Create a tenant AI connection (BYOK)
   */
  async createTenantConnection(data: {
    name: string
    modelId: string
    endpoint: string
    version?: string
    deploymentName?: string
    contextWindow?: number
    isDefaultModel?: boolean
    apiKey: string
  }): Promise<{ success: boolean; message: string; connection: AIConnection }> {
    const response = await apiClient.post('/api/v1/tenant/ai/connections', data)
    return response.data
  },

  /**
   * Update a tenant AI connection
   */
  async updateTenantConnection(
    connectionId: string,
    data: Partial<{
      name: string
      endpoint: string
      version: string
      deploymentName: string
      contextWindow: number
      isDefaultModel: boolean
      apiKey: string
    }>
  ): Promise<{ success: boolean; connection: AIConnection }> {
    const response = await apiClient.patch(`/api/v1/tenant/ai/connections/${connectionId}`, data)
    return response.data
  },

  /**
   * Toggle tenant connection status (active ↔ disabled)
   */
  async toggleTenantConnectionStatus(connectionId: string): Promise<{ success: boolean; connection: AIConnection }> {
    const response = await apiClient.post(`/api/v1/tenant/ai/connections/${connectionId}/toggle-status`, {})
    return response.data
  },

  /**
   * Delete a tenant AI connection
   */
  async deleteTenantConnection(connectionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/tenant/ai/connections/${connectionId}`)
  },

  /**
   * Get default connection for tenant
   */
  async getDefaultConnection(type: 'LLM' | 'Embedding'): Promise<{
    connection: AIConnection
    model: AIModelCatalog
  }> {
    const response = await apiClient.get(`/api/v1/tenant/ai/connections/default/${type}`)
    return response.data
  },

  // ============================================
  // Tenant: Billing & Usage
  // ============================================

  /**
   * Get billing summary for current tenant
   */
  async getBillingSummary(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{
    totalCost: number
    totalTokens: number
    insightCount: number
    byModel: Array<{ modelId: string; modelName: string; cost: number; tokens: number; requests: number }>
    byInsightType: Array<{ insightType: string; cost: number; tokens: number; requests: number }>
    byUser: Array<{ userId: string; cost: number; tokens: number; requests: number }>
    dailyBreakdown: Array<{ date: string; cost: number; tokens: number; requests: number }>
    budget?: {
      limit: number
      used: number
      remaining: number
      percentUsed: number
    }
  }> {
    const response = await apiClient.get('/api/v1/tenant/ai/billing', { params })
    return response.data
  },

  /**
   * Get usage statistics for current tenant
   */
  async getTenantUsageStats(params?: {
    startDate?: string
    endDate?: string
  }): Promise<{
    totalTokens: number
    totalCost: number
    requestCount: number
    byModel: Record<string, { tokens: number; cost: number; count: number }>
    byDay: Array<{ date: string; tokens: number; cost: number }>
    byInsightType?: Record<string, { tokens: number; cost: number; count: number }>
    byUser?: Record<string, { tokens: number; cost: number; count: number }>
  }> {
    const response = await apiClient.get('/api/v1/tenant/ai/usage', { params })
    return response.data
  },

  // ============================================
  // AI Tools Management API (Super Admin)
  // ============================================

  /**
   * List all available AI function calling tools
   */
  async listAITools(): Promise<{
    tools: Array<{
      name: string
      description: string
      requiresPermission?: string
      enabledByDefault: boolean
      parameters: Record<string, unknown>
    }>
  }> {
    const response = await apiClient.get('/api/v1/admin/ai/tools' as any)
    return response.data
  },

  /**
   * Get information about a specific AI tool
   */
  async getAITool(toolName: string): Promise<{
    name: string
    description: string
    requiresPermission?: string
    enabledByDefault: boolean
    parameters: Record<string, unknown>
  }> {
    const response = await apiClient.get(`/api/v1/admin/ai/tools/${toolName}`)
    return response.data
  },

  // ============================================
  // Embedding Cache Management API (Super Admin)
  // ============================================

  /**
   * Get embedding content hash cache statistics
   */
  async getEmbeddingCacheStats(): Promise<{
    enabled: boolean
    stats: {
      totalKeys: number
      estimatedSizeMB: number
      hits: number
      misses: number
      hitRate: number
    } | null
  }> {
    const response = await apiClient.get('/api/v1/admin/embeddings/cache/stats' as any)
    return response.data
  },

  /**
   * Clear embedding content hash cache
   */
  async clearEmbeddingCache(): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete('/api/v1/admin/embeddings/cache/clear')
    return response.data
  },
}











