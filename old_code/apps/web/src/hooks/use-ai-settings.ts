/**
 * AI Settings React Hooks
 * React Query hooks for AI configuration management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'
import {
  aiSettingsApi,
  AIModel,
  AIModelCreate,
  AIModelUpdate,
  SystemAIConfig,
  TenantAIConfig,
  // New two-part system types
  AIModelCatalog,
  AIConnection,
  CreateAIModelCatalogInput,
  UpdateAIModelCatalogInput,
  CreateAIConnectionInput,
  UpdateAIConnectionInput,
} from '@/lib/api/ai-settings'

// ============================================
// Query Keys
// ============================================

export const aiSettingsKeys = {
  all: ['ai-settings'] as const,
  // Legacy model keys
  models: () => [...aiSettingsKeys.all, 'models'] as const,
  modelList: (params?: Record<string, unknown>) => [...aiSettingsKeys.models(), 'list', params] as const,
  modelDetail: (id: string) => [...aiSettingsKeys.models(), 'detail', id] as const,
  // New catalog keys
  catalog: () => [...aiSettingsKeys.all, 'catalog'] as const,
  catalogList: (params?: Record<string, unknown>) => [...aiSettingsKeys.catalog(), 'list', params] as const,
  catalogDetail: (id: string) => [...aiSettingsKeys.catalog(), 'detail', id] as const,
  catalogForTenants: () => [...aiSettingsKeys.catalog(), 'for-tenants'] as const,
  // Connection keys
  connections: () => [...aiSettingsKeys.all, 'connections'] as const,
  systemConnections: (params?: Record<string, unknown>) => [...aiSettingsKeys.connections(), 'system', params] as const,
  systemConnection: (id: string) => [...aiSettingsKeys.connections(), 'system', 'detail', id] as const,
  tenantConnections: (params?: Record<string, unknown>) => [...aiSettingsKeys.connections(), 'tenant', params] as const,
  defaultConnection: (type: 'LLM' | 'Embedding') => [...aiSettingsKeys.connections(), 'default', type] as const,
  // Other keys
  availableModels: (type?: string) => [...aiSettingsKeys.all, 'available', type] as const,
  systemConfig: () => [...aiSettingsKeys.all, 'system-config'] as const,
  tenantConfig: (tenantId?: string) => [...aiSettingsKeys.all, 'tenant-config', tenantId] as const,
  usage: (params?: Record<string, unknown>) => [...aiSettingsKeys.all, 'usage', params] as const,
  // AI Tools keys
  aiTools: () => [...aiSettingsKeys.all, 'ai-tools'] as const,
  aiTool: (toolName: string) => [...aiSettingsKeys.aiTools(), 'detail', toolName] as const,
  // Embedding Cache keys
  embeddingCache: () => [...aiSettingsKeys.all, 'embedding-cache'] as const,
  billing: (params?: Record<string, unknown>) => [...aiSettingsKeys.all, 'billing', params] as const,
  tenantUsage: (params?: Record<string, unknown>) => [...aiSettingsKeys.all, 'tenant-usage', params] as const,
}

// ============================================
// AI Models Hooks (Super Admin)
// ============================================

/**
 * Hook to list AI models
 */
export function useAIModels(params?: {
  type?: AIModel['modelType']
  provider?: string
  isActive?: boolean
  isSystemWide?: boolean
}) {
  return useQuery({
    queryKey: aiSettingsKeys.modelList(params),
    queryFn: () => aiSettingsApi.listModels(params),
  })
}

/**
 * Hook to get a single AI model
 */
export function useAIModel(id: string) {
  return useQuery({
    queryKey: aiSettingsKeys.modelDetail(id),
    queryFn: () => aiSettingsApi.getModel(id),
    enabled: !!id,
  })
}

/**
 * Hook to create an AI model
 */
export function useCreateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AIModelCreate) => aiSettingsApi.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.models() })
      toast.success('AI model created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to update an AI model
 */
export function useUpdateAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AIModelUpdate }) =>
      aiSettingsApi.updateModel(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.models() })
      queryClient.setQueryData(aiSettingsKeys.modelDetail(data.id), data)
      toast.success('AI model updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete an AI model
 */
export function useDeleteAIModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => aiSettingsApi.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.models() })
      toast.success('AI model deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to set a model as default
 */
export function useSetDefaultModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: AIModel['modelType'] }) =>
      aiSettingsApi.setDefaultModel(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.models() })
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.systemConfig() })
      toast.success('Default model updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// System Config Hooks (Super Admin)
// ============================================

/**
 * Hook to get system AI configuration
 */
export function useSystemAIConfig() {
  return useQuery({
    queryKey: aiSettingsKeys.systemConfig(),
    queryFn: () => aiSettingsApi.getSystemConfig(),
  })
}

/**
 * Hook to update system AI configuration
 */
export function useUpdateSystemAIConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<SystemAIConfig>) => aiSettingsApi.updateSystemConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.systemConfig() })
      toast.success('System AI configuration updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Tenant Config Hooks (Tenant Admin)
// ============================================

/**
 * Hook to get tenant AI configuration
 */
export function useTenantAIConfig(tenantId?: string) {
  return useQuery({
    queryKey: aiSettingsKeys.tenantConfig(tenantId),
    queryFn: () => aiSettingsApi.getTenantConfig(tenantId),
  })
}

/**
 * Hook to update tenant AI configuration
 */
export function useUpdateTenantAIConfig(tenantId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Omit<TenantAIConfig, 'tenantId'>>) =>
      aiSettingsApi.updateTenantConfig(data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.tenantConfig(tenantId) })
      toast.success('Tenant AI configuration updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to add custom credentials
 */
export function useAddCustomCredentials(tenantId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      provider,
      credentials,
    }: {
      provider: string
      credentials: { apiKey: string; endpoint?: string }
    }) => aiSettingsApi.addCustomCredentials(provider, credentials, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.tenantConfig(tenantId) })
      toast.success('Credentials added successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to remove custom credentials
 */
export function useRemoveCustomCredentials(tenantId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider: string) => aiSettingsApi.removeCustomCredentials(provider, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.tenantConfig(tenantId) })
      toast.success('Credentials removed')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// Available Models Hook
// ============================================

/**
 * Hook to get available models for current tenant
 */
export function useAvailableModels(type?: AIModel['modelType']) {
  return useQuery({
    queryKey: aiSettingsKeys.availableModels(type),
    queryFn: () => aiSettingsApi.getAvailableModels(type),
  })
}

// ============================================
// Usage Stats Hook
// ============================================

/**
 * Hook to get AI usage statistics
 */
export function useAIUsageStats(params?: {
  period?: 'day' | 'week' | 'month'
  tenantId?: string
  modelId?: string
}) {
  return useQuery({
    queryKey: aiSettingsKeys.usage(params),
    queryFn: () => aiSettingsApi.getUsageStats(params),
  })
}

// ============================================
// AI Models Catalog Hooks (New Two-Part System)
// ============================================

/**
 * Hook to list models catalog (super admin)
 */
export function useAIModelsCatalog(params?: {
  type?: 'LLM' | 'Embedding'
  provider?: string
  hoster?: string
  status?: 'active' | 'deprecated' | 'disabled'
  allowTenantConnections?: boolean
}) {
  return useQuery({
    queryKey: aiSettingsKeys.catalogList(params),
    queryFn: () => aiSettingsApi.listModelsCatalog(params),
  })
}

/**
 * Hook to get models available for tenant connections
 */
export function useModelsForTenants() {
  return useQuery({
    queryKey: aiSettingsKeys.catalogForTenants(),
    queryFn: () => aiSettingsApi.getModelsForTenants(),
  })
}

/**
 * Hook to create a model in the catalog
 */
export function useCreateModelCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAIModelCatalogInput) => aiSettingsApi.createModelCatalog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.catalog() })
      toast.success('AI model added to catalog')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a model in the catalog
 */
export function useUpdateModelCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAIModelCatalogInput }) =>
      aiSettingsApi.updateModelCatalog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.catalog() })
      toast.success('Model catalog updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a model from the catalog
 */
export function useDeleteModelCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => aiSettingsApi.deleteModelCatalog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.catalog() })
      toast.success('Model removed from catalog')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

// ============================================
// System Connections Hooks (Super Admin)
// ============================================

/**
 * Hook to list system-wide connections
 */
export function useSystemConnections(params?: {
  modelId?: string
  status?: 'active' | 'disabled' | 'error'
  isDefaultModel?: boolean
}) {
  return useQuery({
    queryKey: aiSettingsKeys.systemConnections(params),
    queryFn: () => aiSettingsApi.listSystemConnections(params),
  })
}

/**
 * Hook to get a single system connection by ID
 */
export function useSystemConnection(id: string) {
  return useQuery({
    queryKey: aiSettingsKeys.systemConnection(id),
    queryFn: () => aiSettingsApi.getSystemConnection(id).then((res) => res.connection),
    enabled: !!id,
  })
}

/**
 * Hook to create a system connection
 */
export function useCreateSystemConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAIConnectionInput) => aiSettingsApi.createSystemConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('System connection created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a system connection
 */
export function useUpdateSystemConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAIConnectionInput }) =>
      aiSettingsApi.updateSystemConnection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('System connection updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to toggle a system connection status
 */
export function useToggleSystemConnectionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) =>
      aiSettingsApi.toggleSystemConnectionStatus(connectionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      const status = data.connection.status === 'active' ? 'enabled' : 'disabled'
      toast.success(`Connection ${status}`)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a system connection
 */
export function useDeleteSystemConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => aiSettingsApi.deleteSystemConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('System connection deleted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to test a system AI connection
 */
export function useTestSystemConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) =>
      aiSettingsApi.testSystemConnection(connectionId),
    onSuccess: (data) => {
      const latencyMs = data.latency ? `${data.latency}ms` : 'unknown'
      const endpoint = data.endpoint || 'unknown'
      const modelType = data.modelType || 'unknown'
      const provider = data.provider || 'unknown'
      const usage = data.usage
        ? `tokens: ${usageString(data.usage)}`
        : undefined

      // Log connection test result in development only
      if (process.env.NODE_ENV === 'development') {
        trackTrace('Connection test result', 1, {
          connectionName: data.connectionName,
          endpoint,
          modelType,
          provider,
          success: data.success,
          latency: latencyMs,
          usage,
          message: data.message,
        })
      }

      const prefix = data.success ? '✓' : '✗'
      const extra = usage ? ` • ${usage}` : ''
      const msg = `${prefix} ${data.connectionName} [${modelType} • ${provider}] (${endpoint}) - ${data.message} • Latency: ${latencyMs}${extra}`
      if (data.success) {
        toast.success(msg)
      } else {
        toast.error(typeof msg === 'string' ? msg : (msg as any).message || 'An error occurred')
      }
      queryClient.invalidateQueries({
        queryKey: aiSettingsKeys.systemConnections(),
      })
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Connection test failed', 3, {
        errorMessage: typeof message === 'string' ? message : String(message),
      })
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Unknown error'
      toast.error(`Connection test failed: ${errorMsg}`)
    },
  })
}

function usageString(usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) {
  const parts: string[] = []
  if (usage.promptTokens !== undefined) parts.push(`prompt=${usage.promptTokens}`)
  if (usage.completionTokens !== undefined) parts.push(`completion=${usage.completionTokens}`)
  if (usage.totalTokens !== undefined) parts.push(`total=${usage.totalTokens}`)
  return parts.join(', ')
}

// ============================================
// Tenant Connections Hooks (Tenant Admin BYOK)
// ============================================

/**
 * Hook to list connections available to tenant (system + tenant)
 */
export function useTenantConnections() {
  return useQuery({
    queryKey: aiSettingsKeys.tenantConnections(),
    queryFn: () => aiSettingsApi.listTenantConnections(),
  })
}

/**
 * Hook to create a tenant BYOK connection
 */
export function useCreateTenantConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAIConnectionInput) => aiSettingsApi.createTenantConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('Custom connection created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a tenant connection
 */
export function useUpdateTenantConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAIConnectionInput }) =>
      aiSettingsApi.updateTenantConnection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('Connection updated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to toggle a tenant connection status
 */
export function useToggleTenantConnectionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) =>
      aiSettingsApi.toggleTenantConnectionStatus(connectionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      const status = data.connection.status === 'active' ? 'enabled' : 'disabled'
      toast.success(`Connection ${status}`)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a tenant connection
 */
export function useDeleteTenantConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => aiSettingsApi.deleteTenantConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.connections() })
      toast.success('Connection deleted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to get the default connection for a type
 */
export function useDefaultConnection(type: 'LLM' | 'Embedding') {
  return useQuery({
    queryKey: aiSettingsKeys.defaultConnection(type),
    queryFn: () => aiSettingsApi.getDefaultConnection(type),
    enabled: !!type,
  })
}

/**
 * Hook to get billing summary for current tenant
 */
export function useBillingSummary(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: aiSettingsKeys.billing(params),
    queryFn: () => aiSettingsApi.getBillingSummary(params),
  })
}

/**
 * Hook to get usage statistics for current tenant
 */
export function useTenantUsageStats(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: aiSettingsKeys.tenantUsage(params),
    queryFn: () => aiSettingsApi.getTenantUsageStats(params),
  })
}

// ============================================
// AI Tools Hooks (Super Admin)
// ============================================

/**
 * Hook to list all available AI function calling tools
 */
export function useAITools() {
  return useQuery({
    queryKey: aiSettingsKeys.aiTools(),
    queryFn: () => aiSettingsApi.listAITools(),
  })
}

/**
 * Hook to get information about a specific AI tool
 */
export function useAITool(toolName: string) {
  return useQuery({
    queryKey: aiSettingsKeys.aiTool(toolName),
    queryFn: () => aiSettingsApi.getAITool(toolName),
    enabled: !!toolName,
  })
}

// ============================================
// Embedding Cache Hooks (Super Admin)
// ============================================

/**
 * Hook to get embedding content hash cache statistics
 */
export function useEmbeddingCacheStats() {
  return useQuery({
    queryKey: aiSettingsKeys.embeddingCache(),
    queryFn: () => aiSettingsApi.getEmbeddingCacheStats(),
  })
}

/**
 * Hook to clear embedding content hash cache
 */
export function useClearEmbeddingCache() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aiSettingsApi.clearEmbeddingCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.embeddingCache() })
      toast.success('Embedding cache cleared successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clear embedding cache')
    },
  })
}










