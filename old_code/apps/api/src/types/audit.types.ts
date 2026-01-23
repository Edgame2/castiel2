/**
 * Centralized Audit Log Types
 * Used for logging all application events across the system
 */

/**
 * Categories of audit events
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  USER_MANAGEMENT = 'user_management',
  TENANT_MANAGEMENT = 'tenant_management',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM = 'system',
  SECURITY = 'security',
  API = 'api',
}

/**
 * Specific audit event types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENROLL = 'mfa_enroll',
  MFA_VERIFY = 'mfa_verify',
  MFA_DISABLE = 'mfa_disable',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REVOKE = 'token_revoke',
  SESSION_CREATE = 'session_create',
  SESSION_TERMINATE = 'session_terminate',

  // User management events
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_ACTIVATE = 'user_activate',
  USER_DEACTIVATE = 'user_deactivate',
  USER_ROLE_CHANGE = 'user_role_change',
  USER_INVITE = 'user_invite',
  USER_JOIN_REQUEST = 'user_join_request',
  USER_JOIN_APPROVE = 'user_join_approve',
  USER_JOIN_REJECT = 'user_join_reject',

  // Tenant management events
  TENANT_CREATE = 'tenant_create',
  TENANT_UPDATE = 'tenant_update',
  TENANT_DELETE = 'tenant_delete',
  TENANT_ACTIVATE = 'tenant_activate',
  TENANT_SUSPEND = 'tenant_suspend',
  TENANT_SWITCH = 'tenant_switch',
  TENANT_SSO_CONFIG = 'tenant_sso_config',

  // Data events
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  DATA_DELETE = 'data_delete',
  DOCUMENT_UPLOAD = 'document_upload',

  // System events
  CONFIG_CHANGE = 'config_change',
  PERMISSION_CHANGE = 'permission_change',
  API_KEY_CREATE = 'api_key_create',
  API_KEY_REVOKE = 'api_key_revoke',

  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  ACCOUNT_LOCKOUT = 'account_lockout',
  IP_BLOCKED = 'ip_blocked',
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Outcome of an audit event
 */
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
}

/**
 * Audit log entry stored in database
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  partitionKey: string; // tenantId for partitioning

  // Event classification
  category: AuditCategory;
  eventType: AuditEventType;
  severity: AuditSeverity;
  outcome: AuditOutcome;

  // Timestamp
  timestamp: string;

  // Actor information
  actorId?: string;
  actorEmail?: string;
  actorType: 'user' | 'system' | 'api' | 'service';

  // Target information
  targetId?: string;
  targetType?: string;
  targetName?: string;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;

  // Event details
  message: string;
  details?: Record<string, any>;

  // Error information (if applicable)
  errorCode?: string;
  errorMessage?: string;

  // Metadata
  metadata?: {
    source?: string;
    version?: string;
    environment?: string;
    correlationId?: string;
  };
}

/**
 * Input for creating audit log entry
 */
export interface CreateAuditLogInput {
  tenantId: string;
  category: AuditCategory;
  eventType: AuditEventType;
  severity?: AuditSeverity;
  outcome: AuditOutcome;

  actorId?: string;
  actorEmail?: string;
  actorType?: 'user' | 'system' | 'api' | 'service';

  targetId?: string;
  targetType?: string;
  targetName?: string;

  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;

  message: string;
  details?: Record<string, any>;

  errorCode?: string;
  errorMessage?: string;
}

/**
 * Query parameters for audit logs
 */
export interface AuditLogQuery {
  tenantId: string;

  // Filters
  category?: AuditCategory;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetType?: string;

  // Date range
  startDate?: string;
  endDate?: string;

  // Search
  search?: string;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'timestamp' | 'severity' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response for audit log list query
 */
export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  topEventTypes: Array<{ type: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

/**
 * Audit log retention policy
 */
export interface AuditRetentionPolicy {
  tenantId: string;
  retentionDays: number;
  archiveEnabled: boolean;
  archiveDestination?: string;
}

