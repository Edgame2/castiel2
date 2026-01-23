/**
 * Session Management Types
 * API types for listing and managing user sessions
 */

/**
 * Session response for API (omits sensitive data)
 */
export interface SessionResponse {
  sessionId: string;
  userId: string;
  tenantId: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  isCurrent: boolean;  // Is this the current session making the request
  deviceInfo?: {
    userAgent: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    device?: string;
    isMobile: boolean;
  };
  locationInfo?: {
    ip: string;
    country?: string;
    region?: string;
    city?: string;
  };
}

/**
 * List sessions response
 */
export interface ListSessionsResponse {
  sessions: SessionResponse[];
  total: number;
}

/**
 * Revoke session request
 */
export interface RevokeSessionRequest {
  sessionId: string;
}

/**
 * Revoke session response
 */
export interface RevokeSessionResponse {
  success: boolean;
  message: string;
}

/**
 * Revoke all sessions response
 */
export interface RevokeAllSessionsResponse {
  success: boolean;
  revokedCount: number;
  message: string;
}

/**
 * Get session details response
 */
export interface SessionDetailsResponse extends SessionResponse {
  email: string;
  name?: string;
  provider: string;
  metadata?: Record<string, any>;
}
