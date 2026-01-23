// API types - to be populated from backend OpenAPI specs
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ShardListResponse {
  shards: Shard[]
  continuationToken?: string
  count: number
}

export interface Shard {
  id: string
  name: string
  description?: string
  content?: string
  shardTypeId: string
  shardTypeName?: string
  shardType?: ShardType
  metadata?: Record<string, unknown>
  structuredData?: Record<string, unknown>
  unstructuredData?: Record<string, unknown>
  tags?: string[]
  tenantId: string
  createdBy: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  attachments?: Attachment[]
  internal_relationships?: InternalRelationship[]
  external_relationships?: ExternalRelationship[]
}

export interface InternalRelationship {
  shardId: string
  shardTypeId: string
  shardTypeName?: string
  shardName: string
  createdAt: string
}

export interface ExternalRelationship {
  externalId: string
  integrationConnectionId: string
  createdAt: string
}

export interface Project extends Shard {
  structuredData: {
    name?: string
    description?: string
    status: string
    priority: string
    startDate?: string
    endDate?: string
    ownerId?: string
    ownerName?: string
    managerId?: string // Legacy
    teamMembers?: { id: string; name: string; avatarUrl?: string; email?: string }[]
    team?: string[] // Legacy
    linkedShardIds?: string[]
  }
}

export enum ShardTypeCategory {
  DOCUMENT = 'document',
  DATA = 'data',
  MEDIA = 'media',
  CONFIGURATION = 'configuration',
  CUSTOM = 'custom',
}

export enum ShardTypeStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  DELETED = 'deleted',
}

export interface ShardType {
  id: string
  name: string
  displayName: string
  description?: string
  schema: Record<string, unknown> // JSON Schema
  uiSchema?: Record<string, unknown>
  version: number
  tenantId: string
  isGlobal: boolean
  isSystem: boolean
  isActive: boolean
  isCustom: boolean
  isBuiltIn: boolean
  icon?: string
  color?: string
  tags: string[]
  category: ShardTypeCategory
  status: ShardTypeStatus
  parentShardTypeId?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  deletedAt?: string
}

export interface CreateShardTypeInput {
  name: string
  displayName: string
  description?: string
  category: ShardTypeCategory
  schema: Record<string, unknown>
  uiSchema?: Record<string, unknown>
  icon?: string
  color?: string
  tags?: string[]
  parentShardTypeId?: string
  isGlobal?: boolean
}

export interface UpdateShardTypeInput {
  name?: string
  displayName?: string
  description?: string
  category?: ShardTypeCategory
  schema?: Record<string, unknown>
  uiSchema?: Record<string, unknown>
  icon?: string
  color?: string
  tags?: string[]
  parentShardTypeId?: string
  isGlobal?: boolean
  status?: ShardTypeStatus
}

export interface ShardTypeUsage {
  shardTypeId: string
  shardCount: number
  usageCount?: number
  inUse: boolean
  canDelete: boolean
}

export interface SchemaValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  parentCompatible?: boolean
}

export interface ShardTypeListParams {
  page?: number
  limit?: number
  search?: string
  category?: ShardTypeCategory
  status?: ShardTypeStatus
  isGlobal?: boolean
  tags?: string[]
}

export interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export interface CreateShardDto {
  name: string
  description?: string
  content?: string
  shardTypeId: string
  shardTypeName?: string
  structuredData?: Record<string, unknown>
  metadata?: Record<string, unknown>
  unstructuredData?: Record<string, unknown>
  tags?: string[]
  internal_relationships?: InternalRelationship[]
  external_relationships?: ExternalRelationship[]
  isPublic?: boolean
}

export type UpdateShardDto = Partial<CreateShardDto>

// User Management Types (matching backend UserManagementService)
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'deleted'

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
  tenantId: string
  email: string
  firstName?: string
  lastName?: string
  roles: string[]
  status: UserStatus
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  metadata?: Record<string, any>
  externalUserIds?: ExternalUserId[]
}

export interface UserListResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserDto {
  email: string
  password: string
  firstName?: string
  lastName?: string
  roles: string[]
  metadata?: Record<string, any>
  sendInvite?: boolean
}

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  roles?: string[]
  metadata?: Record<string, any>
}

export interface InviteUserDto {
  email: string
  message?: string
  roles?: string[]
  rolesPreset?: string
  expiresAt?: string
}

export type TenantInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export interface InviteUserResponse {
  id: string
  tenantId: string
  email: string
  status: TenantInvitationStatus
  message?: string
  createdAt: string
  updatedAt: string
  respondedAt?: string
  expiresAt: string
  reminderSentAt?: string
  roles?: string[]
  rolesPreset?: string
  token?: string
}

export interface InvitationMembershipInfo {
  userId: string
  tenantId: string
  requiresVerification?: boolean
}

export interface TenantInvitationPreview {
  id: string
  tenantId: string
  tenantName?: string
  email: string
  message?: string
  expiresAt: string
  issuedAt: string
  issuerUserId: string
  issuerDisplayName?: string
  roles?: string[]
  rolesPreset?: string
  status: TenantInvitationStatus
  isExpired: boolean
  isRedeemable: boolean
}

export type TenantJoinRequestStatus = 'pending' | 'approved' | 'declined' | 'expired'

export interface TenantJoinRequest {
  id: string
  tenantId: string
  requesterUserId: string
  requesterEmail: string
  status: TenantJoinRequestStatus
  message?: string
  createdAt: string
  updatedAt: string
  decisionAt?: string
  decisionBy?: string
}

export interface TenantJoinRequestListResponse {
  items: TenantJoinRequest[]
  total: number
}

export interface TenantJoinRequestMutationResponse {
  success: boolean
  request: TenantJoinRequest
}

export interface MembershipSummaryResponse {
  joinRequests: {
    pending: number
  }
  invitations: {
    pending: number
    expiringSoon: number
  }
}

export interface TenantMembership {
  tenantId: string
  tenantName?: string
  domain?: string
  status?: string
  isDefault: boolean
  roles: string[]
}

export interface TenantMembershipResponse {
  tenants: TenantMembership[]
  defaultTenantId: string | null
}

export interface UpdateDefaultTenantResponse extends TenantMembershipResponse {
  message: string
}

export interface AdminPasswordResetRequest {
  sendEmail?: boolean
}

export interface AdminPasswordResetResponse {
  resetToken: string
  expiresAt: string
  message: string
}

export interface UserActivityEntry {
  id: string
  type: string
  description: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface UserActivityResponse {
  activities: UserActivityEntry[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  maxUsers: number
  maxShards: number
  features: string[]
  createdAt: string
  updatedAt: string
}

export interface UpdateTenantDto {
  name?: string
  logoUrl?: string
  plan?: 'free' | 'starter' | 'professional' | 'enterprise'
  status?: 'active' | 'suspended' | 'trial'
  maxUsers?: number
  maxShards?: number
  features?: string[]
}

export interface FeatureFlag {
  id: string
  name: string
  key: string
  description?: string
  enabled: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface ApiKey {
  id: string
  name: string
  key: string
  prefix: string
  lastUsed?: string
  expiresAt?: string
  tenantId: string
  createdAt: string
}

export interface CreateApiKeyDto {
  name: string
  expiresAt?: string
}

export interface UsageStats {
  tenantId: string
  period: string
  users: {
    total: number
    active: number
    limit: number
  }
  shards: {
    total: number
    created: number
    createdThisPeriod: number
    limit: number
  }
  apiCalls: {
    total: number
    limit: number
    resetInDays: number
    byDay: Array<{ date: string; count: number }>
  }
  storage: {
    used: number
    limit: number
    available: number
  }
}

export interface SSOConfig {
  id: string
  tenantId: string
  provider: 'saml' | 'oidc'
  enabled: boolean
  entityId: string
  ssoUrl: string
  certificate: string
  attributeMapping: {
    email: string
    firstName?: string
    lastName?: string
  }
  createdAt: string
  updatedAt: string
}

export interface UpdateSSOConfigDto {
  provider?: 'saml' | 'oidc'
  enabled?: boolean
  entityId?: string
  ssoUrl?: string
  certificate?: string
  attributeMapping?: {
    email: string
    firstName?: string
    lastName?: string
  }
}

// Admin types
export interface PlatformStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  activeUsers: number
  totalShards: number
  totalApiCalls: number
  storageUsed: number
  enrichmentJobsToday: number
}

export interface TenantListItem {
  id: string
  name: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  userCount: number
  shardCount: number
  createdAt: string
  lastActivityAt: string
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  services: Array<{
    name: string
    status: 'healthy' | 'degraded' | 'down'
    responseTime?: number
    lastChecked: string
    message?: string
  }>
  uptime: number
  lastIncident?: {
    timestamp: string
    description: string
  }
}

export interface SystemLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'critical'
  service: string
  message: string
  metadata?: Record<string, unknown>
}

// Enrichment types
export interface EnrichmentJob {
  id: string
  shardId: string
  shardName: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startedAt?: string
  completedAt?: string
  duration?: number
  error?: string
  processors: string[]
  createdAt: string
  updatedAt: string
}

export interface EnrichmentStats {
  total: number
  queued: number
  processing: number
  completed: number
  failed: number
  averageDuration: number
}

export interface EnrichmentLogEntry {
  id: string
  jobId: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  processor?: string
  metadata?: Record<string, unknown>
}

// Audit log types
export interface AuditLog {
  id: string
  tenantId: string
  userId: string
  userName: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  changes?: Record<string, { old: unknown; new: unknown }>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure'
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface AuditLogFilters {
  userId?: string
  action?: string
  resource?: string
  status?: string
  startDate?: string
  endDate?: string
}

// Data export types
export interface DataExport {
  id: string
  userId: string
  tenantId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  format: 'json' | 'csv'
  requestedAt: string
  completedAt?: string
  expiresAt?: string
  downloadUrl?: string
  fileSize?: number
  error?: string
}

export interface DataExportRequest {
  format?: 'json' | 'csv'
  includeShards?: boolean
  includeAuditLogs?: boolean
  includeProfile?: boolean
}
