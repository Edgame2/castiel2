/**
 * Session Management API Client
 * Provides functions to interact with session management endpoints
 */

import { apiClient } from './client';

// Types
export interface SessionDeviceInfo {
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  isMobile?: boolean;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

export interface SessionLocationInfo {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface Session {
  sessionId: string;
  email: string;
  tenantId: string;
  provider: string;
  createdAt: string;
  lastActivityAt: string;
  deviceInfo?: SessionDeviceInfo;
  locationInfo?: SessionLocationInfo;
  isCurrent?: boolean;
}

export interface SessionDetails extends Session {
  metadata?: Record<string, any>;
}

export interface ListSessionsResponse {
  sessions: Session[];
  total: number;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
  sessionId: string;
}

export interface RevokeAllSessionsResponse {
  success: boolean;
  message: string;
  revokedCount: number;
}

/**
 * List all sessions for the authenticated user
 */
export async function getSessions(
  tenantId: string,
  userId: string,
  sessionId?: string
): Promise<ListSessionsResponse> {
  const params = new URLSearchParams({
    tenantId,
    userId,
    ...(sessionId && { sessionId }),
  });

  const response = await apiClient.get(`/api/sessions?${params}`);
  return response.data;
}

/**
 * List all sessions for a specific user (admin only)
 */
export async function getUserSessions(
  tenantId: string,
  userId: string
): Promise<ListSessionsResponse> {
  const response = await apiClient.get(
    `/api/tenants/${tenantId}/users/${userId}/sessions`
  );
  return response.data;
}

/**
 * Get details for a specific session
 */
export async function getSessionDetails(
  sessionId: string,
  tenantId: string,
  userId: string
): Promise<SessionDetails> {
  const params = new URLSearchParams({ tenantId, userId });
  const response = await apiClient.get(`/api/sessions/${sessionId}?${params}`);
  return response.data;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  tenantId: string,
  userId: string
): Promise<RevokeSessionResponse> {
  const response = await apiClient.post(`/api/sessions/${sessionId}/terminate`, {
    tenantId,
    userId,
  });
  return response.data;
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeAllSessions(
  tenantId: string,
  userId: string,
  currentSessionId?: string
): Promise<RevokeAllSessionsResponse> {
  const response = await apiClient.post('/api/sessions/terminate-all', {
    tenantId,
    userId,
    currentSessionId,
  });
  return response.data;
}

/**
 * Admin: Revoke all sessions for a user (including current)
 */
export async function adminRevokeAllSessions(
  tenantId: string,
  userId: string
): Promise<RevokeAllSessionsResponse> {
  const response = await apiClient.post(
    `/api/tenants/${tenantId}/users/${userId}/sessions/terminate-all`
  );
  return response.data;
}
