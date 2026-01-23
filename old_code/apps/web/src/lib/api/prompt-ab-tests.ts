/**
 * Prompt A/B Testing API Client
 * Frontend API client for prompt A/B test management
 */

import { apiClient } from './client'

export enum PromptABTestStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export interface PromptVariant {
  variantId: string
  promptId: string
  promptSlug: string
  name: string
  trafficPercentage: number
  description?: string
}

export interface VariantMetrics {
  impressions: number
  successfulResponses: number
  failedResponses: number
  averageTokens: number
  averageLatencyMs: number
  userFeedbackScore: number
  positiveFeedback: number
  negativeFeedback: number
  totalCost: number
  lastUsedAt?: string
}

export interface PromptABTest {
  id: string
  tenantId: string
  type: 'promptABTest'
  name: string
  description?: string
  hypothesis?: string
  insightType: string
  slug?: string
  variants: PromptVariant[]
  trafficSplit: Record<string, number>
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate'
  successCriteria?: {
    metric: string
    operator: '>' | '>=' | '<' | '<='
    threshold: number
    confidenceLevel: number
  }
  targeting?: {
    tenantIds?: string[]
    userIds?: string[]
    tags?: string[]
  }
  status: PromptABTestStatus
  startDate?: string
  endDate?: string
  minDuration?: number
  minSamplesPerVariant?: number
  metrics: Record<string, VariantMetrics>
  results?: {
    winner?: string
    statisticalSignificance?: number
    confidenceLevel?: number
    improvement?: number
    completedAt?: string
  }
  createdAt: string
  updatedAt: string
  createdBy: {
    userId: string
    at: string
  }
  updatedBy?: {
    userId: string
    at: string
  }
}

export interface CreatePromptABTestInput {
  name: string
  description?: string
  hypothesis?: string
  insightType: string
  slug?: string
  variants: Array<{
    variantId: string
    promptId: string
    promptSlug: string
    name: string
    trafficPercentage: number
    description?: string
  }>
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate'
  successCriteria?: {
    metric: string
    operator: '>' | '>=' | '<' | '<='
    threshold: number
    confidenceLevel: number
  }
  targeting?: {
    tenantIds?: string[]
    userIds?: string[]
    tags?: string[]
  }
  minDuration?: number
  minSamplesPerVariant?: number
}

export interface UpdatePromptABTestInput {
  name?: string
  description?: string
  hypothesis?: string
  insightType?: string
  slug?: string
  status?: PromptABTestStatus
  variants?: Array<{
    variantId: string
    promptId: string
    promptSlug: string
    name: string
    trafficPercentage: number
    description?: string
  }>
  trafficSplit?: Record<string, number>
  primaryMetric?: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate'
  successCriteria?: {
    metric: string
    operator: '>' | '>=' | '<' | '<='
    threshold: number
    confidenceLevel: number
  }
  targeting?: {
    tenantIds?: string[]
    userIds?: string[]
    tags?: string[]
  }
  minDuration?: number
  minSamplesPerVariant?: number
  endDate?: string
}

export interface PromptABTestListParams {
  status?: PromptABTestStatus
  insightType?: string
  limit?: number
  continuationToken?: string
}

export interface PromptABTestListResponse {
  items: PromptABTest[]
  continuationToken?: string
  hasMore: boolean
}

/**
 * List prompt A/B test experiments
 */
export async function listPromptABTests(
  params?: PromptABTestListParams
): Promise<PromptABTestListResponse> {
  const response = await apiClient.get<PromptABTestListResponse>('/api/v1/prompts/ab-tests', {
    params,
  })
  return response.data
}

/**
 * Get prompt A/B test experiment by ID
 */
export async function getPromptABTest(experimentId: string): Promise<PromptABTest> {
  const response = await apiClient.get<PromptABTest>(`/api/v1/prompts/ab-tests/${experimentId}`)
  return response.data
}

/**
 * Create a new prompt A/B test experiment
 */
export async function createPromptABTest(
  input: CreatePromptABTestInput
): Promise<PromptABTest> {
  const response = await apiClient.post<PromptABTest>('/api/v1/prompts/ab-tests', input)
  return response.data
}

/**
 * Update a prompt A/B test experiment
 */
export async function updatePromptABTest(
  experimentId: string,
  input: UpdatePromptABTestInput
): Promise<PromptABTest> {
  const response = await apiClient.put<PromptABTest>(
    `/api/v1/prompts/ab-tests/${experimentId}`,
    input
  )
  return response.data
}

/**
 * Delete a prompt A/B test experiment
 */
export async function deletePromptABTest(experimentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/prompts/ab-tests/${experimentId}`)
}

/**
 * Get experiment results/analytics
 */
export async function getPromptABTestResults(experimentId: string): Promise<PromptABTest> {
  const response = await apiClient.get<PromptABTest>(
    `/api/v1/prompts/ab-tests/${experimentId}/results`
  )
  return response.data
}

/**
 * Export A/B test results as CSV or JSON
 */
export async function exportPromptABTestResults(
  experimentId: string,
  format: 'csv' | 'json' = 'json'
): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/api/v1/prompts/ab-tests/${experimentId}/export`, {
    params: { format },
    responseType: 'blob',
  })
  return response.data
}

