import { apiClient } from '@/lib/api/client'

export interface EmbeddingFieldConfig {
  name: string
  weight: number
  include: boolean
  preprocess?: {
    maxLength?: number
    lowercase?: boolean
    stripFormatting?: boolean
    extractSections?: string[]
  }
  nestedFields?: string[]
  asContextPrefix?: boolean
  maxLength?: number
}

export interface EmbeddingPreprocessingConfig {
  combineFields: boolean
  fieldSeparator?: string
  chunking?: {
    chunkSize: number
    overlap: number
    splitBySentence: boolean
    minChunkSize?: number
    maxChunkSize?: number
  }
  language?: string
  removeStopWords?: boolean
  normalize?: boolean
  contextPrefixSeparator?: string
}

export interface EmbeddingNormalizationConfig {
  l2Normalize: boolean
  minMaxScale?: boolean
  removeOutliers?: boolean
  reduction?: { enabled: boolean; targetDimensions?: number }
}

export type ModelSelectionStrategy = 'default' | 'fast' | 'quality' | 'custom'

export interface EmbeddingModelConfig {
  strategy: ModelSelectionStrategy
  modelId?: string
  fallbackModelId?: string
  parameters?: { dimensions?: number; encodingFormat?: 'float' | 'base64' }
}

export interface ParentContextConfig {
  mode: 'whenScoped' | 'always' | 'never'
  sourceShardType?: string
  weight?: number
  fields?: string[]
  asContextPrefix?: boolean
  separator?: string
  maxLength?: number
}

export interface EmbeddingTemplate {
  id: string
  version: number
  name: string
  description?: string
  isDefault: boolean
  fields: EmbeddingFieldConfig[]
  preprocessing: EmbeddingPreprocessingConfig
  normalization: EmbeddingNormalizationConfig
  modelConfig: EmbeddingModelConfig
  parentContext?: ParentContextConfig
  storeInShard: boolean
  enableVectorSearch: boolean
  createdAt: string | Date
  createdBy: string
  updatedAt: string | Date
  updatedBy?: string
}

export interface ShardTypeWithTemplate {
  id: string
  name: string
  description?: string
  tenantId: string
  embeddingTemplate?: EmbeddingTemplate
  updatedAt?: string
}

export const embeddingTemplatesApi = {
  async list() {
    const { data } = await apiClient.get<{ items: ShardTypeWithTemplate[]; count: number }>(
      '/api/v1/embedding-templates'
    )
    return data
  },
  async get(shardTypeId: string) {
    const { data } = await apiClient.get<{ shardTypeId: string; template: EmbeddingTemplate | null; isDefault: boolean }>(
      `/api/v1/shard-types/${encodeURIComponent(shardTypeId)}/embedding-template`
    )
    return data
  },
  async update(shardTypeId: string, template: EmbeddingTemplate) {
    const { data } = await apiClient.put<{ success: boolean; shardType: ShardTypeWithTemplate }>(
      `/api/v1/shard-types/${encodeURIComponent(shardTypeId)}/embedding-template`,
      template
    )
    return data
  },
}

export function buildDefaultEmbeddingTemplate(init?: Partial<EmbeddingTemplate>): EmbeddingTemplate {
  const now = new Date().toISOString()
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
  return {
    id,
    version: 1,
    name: init?.name || 'Custom Embedding Template',
    description: init?.description || 'Tenant-specific embedding template',
    isDefault: false,
    fields: [
      {
        name: 'all',
        weight: 1.0,
        include: true,
        preprocess: { maxLength: 8000 },
      },
    ],
    preprocessing: {
      combineFields: true,
      fieldSeparator: ' ',
      chunking: { chunkSize: 512, overlap: 50, splitBySentence: true, minChunkSize: 100, maxChunkSize: 1000 },
      removeStopWords: false,
      normalize: false,
      contextPrefixSeparator: ' — ',
    },
    normalization: { l2Normalize: true, minMaxScale: false, removeOutliers: false, reduction: { enabled: false } },
    modelConfig: { strategy: 'default', modelId: 'text-embedding-3-small', fallbackModelId: 'text-embedding-ada-002' },
    parentContext: {
      mode: 'whenScoped',
      sourceShardType: 'c_project',
      weight: 0.25,
      fields: ['name', 'tags', 'summary'],
      asContextPrefix: true,
      separator: ' — ',
      maxLength: 120,
    },
    storeInShard: true,
    enableVectorSearch: true,
    createdAt: now,
    createdBy: init?.createdBy || 'ui',
    updatedAt: now,
    updatedBy: init?.updatedBy || 'ui',
  }
}
