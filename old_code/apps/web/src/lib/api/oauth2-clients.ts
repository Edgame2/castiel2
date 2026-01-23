/**
 * OAuth2 Client Management API Client
 * API functions for managing OAuth2 client applications
 */

import { apiClient } from './client'

/**
 * OAuth2 Client Type
 */
export type OAuth2ClientType = 'confidential' | 'public'

/**
 * OAuth2 Client Status
 */
export type OAuth2ClientStatus = 'active' | 'inactive' | 'suspended'

/**
 * OAuth2 Grant Type
 */
export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'refresh_token'

/**
 * OAuth2 Client Response (public view - excludes secret)
 */
export interface OAuth2Client {
  id: string
  name: string
  type: OAuth2ClientType
  status: OAuth2ClientStatus
  tenantId: string
  redirectUris: string[]
  allowedGrantTypes: OAuth2GrantType[]
  allowedScopes: string[]
  accessTokenTTL?: number
  refreshTokenTTL?: number
  description?: string
  logoUri?: string
  metadata: {
    createdAt: string
    updatedAt?: string
    lastUsedAt?: string
  }
}

/**
 * OAuth2 Client with Secret (only returned on creation/rotation)
 */
export interface OAuth2ClientWithSecret extends OAuth2Client {
  clientSecret: string
}

/**
 * Create OAuth2 Client Request
 */
export interface CreateOAuth2ClientRequest {
  name: string
  type: OAuth2ClientType
  redirectUris: string[]
  allowedGrantTypes: OAuth2GrantType[]
  allowedScopes: string[]
  description?: string
  logoUri?: string
  accessTokenTTL?: number
  refreshTokenTTL?: number
}

/**
 * Update OAuth2 Client Request
 */
export interface UpdateOAuth2ClientRequest {
  name?: string
  status?: OAuth2ClientStatus
  redirectUris?: string[]
  allowedGrantTypes?: OAuth2GrantType[]
  allowedScopes?: string[]
  description?: string
  logoUri?: string
  accessTokenTTL?: number
  refreshTokenTTL?: number
}

/**
 * OAuth2 Client List Response
 */
export interface OAuth2ClientListResponse {
  clients: OAuth2Client[]
  total: number
}

/**
 * OAuth2 Scope
 */
export interface OAuth2Scope {
  name: string
  description: string
}

/**
 * OAuth2 Scopes Response
 */
export interface OAuth2ScopesResponse {
  scopes: OAuth2Scope[]
}

/**
 * List OAuth2 clients for a tenant
 */
export async function listOAuth2Clients(tenantId: string, limit?: number): Promise<OAuth2ClientListResponse> {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())

  const response = await apiClient.get<OAuth2ClientListResponse>(
    `/api/tenants/${tenantId}/oauth2/clients${params.toString() ? `?${params.toString()}` : ''}`
  )
  return response.data
}

/**
 * Get OAuth2 client by ID
 */
export async function getOAuth2Client(tenantId: string, clientId: string): Promise<OAuth2Client> {
  const response = await apiClient.get<OAuth2Client>(
    `/api/tenants/${tenantId}/oauth2/clients/${clientId}`
  )
  return response.data
}

/**
 * Create OAuth2 client
 */
export async function createOAuth2Client(
  tenantId: string,
  data: CreateOAuth2ClientRequest
): Promise<OAuth2ClientWithSecret> {
  const response = await apiClient.post<OAuth2ClientWithSecret>(
    `/api/tenants/${tenantId}/oauth2/clients`,
    data
  )
  return response.data
}

/**
 * Update OAuth2 client
 */
export async function updateOAuth2Client(
  tenantId: string,
  clientId: string,
  data: UpdateOAuth2ClientRequest
): Promise<OAuth2Client> {
  const response = await apiClient.patch<OAuth2Client>(
    `/api/tenants/${tenantId}/oauth2/clients/${clientId}`,
    data
  )
  return response.data
}

/**
 * Delete OAuth2 client
 */
export async function deleteOAuth2Client(tenantId: string, clientId: string): Promise<void> {
  await apiClient.delete(`/api/tenants/${tenantId}/oauth2/clients/${clientId}`)
}

/**
 * Rotate OAuth2 client secret
 */
export async function rotateOAuth2ClientSecret(
  tenantId: string,
  clientId: string
): Promise<OAuth2ClientWithSecret> {
  const response = await apiClient.post<OAuth2ClientWithSecret>(
    `/api/tenants/${tenantId}/oauth2/clients/${clientId}/rotate-secret`
  )
  return response.data
}

/**
 * List available OAuth2 scopes
 */
export async function listOAuth2Scopes(): Promise<OAuth2ScopesResponse> {
  const response = await apiClient.get<OAuth2ScopesResponse>('/api/oauth2/scopes')
  return response.data
}








