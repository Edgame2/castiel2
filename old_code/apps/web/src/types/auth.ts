// Authentication types
export type ExternalUserIdStatus = 'active' | 'invalid' | 'pending'

export interface ExternalUserId {
  integrationId: string
  externalUserId: string
  integrationName?: string
  connectionId?: string
  connectedAt: string
  lastSyncedAt?: string
  status: ExternalUserIdStatus
  metadata?: Record<string, any>
}

export interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  displayName?: string
  avatarUrl?: string
  tenantId: string
  isDefaultTenant?: boolean
  role?: UserRole
  roles?: string[] // Array of role strings from API
  status: UserStatus
  emailVerified?: boolean
  lastLogin?: string
  createdAt?: string
  updatedAt?: string
  permissions?: string[]
  externalUserIds?: ExternalUserId[]
}

export type UserRole = 'super-admin' | 'super_admin' | 'admin' | 'owner' | 'tenant_admin' | 'director' | 'manager' | 'user' | 'read_only' | 'guest'
export type UserStatus = 'active' | 'inactive' | 'pending'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface OAuthConfig {
  authorizationEndpoint: string
  tokenEndpoint: string
  clientId: string
  redirectUri: string
  scope: string
}
