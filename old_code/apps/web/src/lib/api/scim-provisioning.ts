/**
 * SCIM Provisioning API Client
 * API functions for tenant SCIM provisioning management
 */

import { apiClient } from './client'

/**
 * SCIM Configuration Response
 */
export interface SCIMConfigResponse {
  enabled: boolean
  endpointUrl: string
  token?: string // Only returned on creation/rotation
  createdAt: string
  lastRotatedAt?: string
}

/**
 * SCIM Activity Log Entry
 */
export interface SCIMActivityLog {
  id: string
  tenantId: string
  timestamp: string
  operation: 'create' | 'update' | 'delete' | 'get' | 'list' | 'patch'
  resourceType: 'User' | 'Group'
  resourceId?: string
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

/**
 * SCIM Activity Logs Response
 */
export interface SCIMActivityLogsResponse {
  logs: SCIMActivityLog[]
  total: number
}

/**
 * Enable SCIM Response
 */
export interface EnableSCIMResponse {
  enabled: boolean
  endpointUrl: string
  token: string // Only shown once
  createdAt: string
}

/**
 * Rotate Token Response
 */
export interface RotateTokenResponse {
  token: string // Only shown once
  message: string
}

/**
 * Test Connection Response
 */
export interface TestConnectionResponse {
  success: boolean
  message: string
  endpointUrl?: string
}

/**
 * Get SCIM configuration for tenant
 */
export async function getSCIMConfig(tenantId: string): Promise<SCIMConfigResponse> {
  const response = await apiClient.get<SCIMConfigResponse>(
    `/api/tenants/${tenantId}/provisioning`
  )
  return response.data
}

/**
 * Enable SCIM for tenant
 */
export async function enableSCIM(tenantId: string): Promise<EnableSCIMResponse> {
  const response = await apiClient.post<EnableSCIMResponse>(
    `/api/tenants/${tenantId}/provisioning/enable`
  )
  return response.data
}

/**
 * Disable SCIM for tenant
 */
export async function disableSCIM(tenantId: string): Promise<void> {
  await apiClient.post(`/api/tenants/${tenantId}/provisioning/disable`)
}

/**
 * Rotate SCIM token
 */
export async function rotateSCIMToken(tenantId: string): Promise<RotateTokenResponse> {
  const response = await apiClient.post<RotateTokenResponse>(
    `/api/tenants/${tenantId}/provisioning/rotate`
  )
  return response.data
}

/**
 * Test SCIM connection
 */
export async function testSCIMConnection(tenantId: string): Promise<TestConnectionResponse> {
  const response = await apiClient.post<TestConnectionResponse>(
    `/api/tenants/${tenantId}/provisioning/test`
  )
  return response.data
}

/**
 * Get SCIM activity logs
 */
export async function getSCIMActivityLogs(
  tenantId: string,
  limit?: number
): Promise<SCIMActivityLogsResponse> {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())

  const response = await apiClient.get<SCIMActivityLogsResponse>(
    `/api/tenants/${tenantId}/provisioning/logs?${params.toString()}`
  )
  return response.data
}

