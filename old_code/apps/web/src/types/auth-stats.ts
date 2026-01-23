/**
 * Auth Statistics Types for Admin Dashboard
 */

/**
 * Overall authentication statistics
 */
export interface AuthOverviewStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  usersWithMFA: number;
  mfaAdoptionRate: number;
  totalLogins: number;
  failedLogins: number;
  uniqueLoginUsers: number;
  oauthUsers: number;
  ssoUsers: number;
  magicLinkUsers: number;
}

/**
 * Login trend data
 */
export interface LoginTrend {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

/**
 * Authentication method breakdown
 */
export interface AuthMethodBreakdown {
  password: number;
  oauth: number;
  sso: number;
  magicLink: number;
  mfa: number;
}

/**
 * OAuth provider statistics
 */
export interface OAuthProviderStats {
  google: number;
  github: number;
  microsoft: number;
}

/**
 * Security alert
 */
export interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tenant auth statistics
 */
export interface TenantAuthStats {
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  activeUsers: number;
  mfaEnabled: number;
  ssoEnabled: boolean;
  lastActivity: string;
}

/**
 * Complete dashboard data
 */
export interface AuthDashboardData {
  overview: AuthOverviewStats;
  loginTrends: LoginTrend[];
  methodBreakdown: AuthMethodBreakdown;
  oauthProviders: OAuthProviderStats;
  recentAlerts: SecurityAlert[];
  topTenants?: TenantAuthStats[];
}

