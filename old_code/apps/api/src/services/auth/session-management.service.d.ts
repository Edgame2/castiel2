/**
 * Session Management Service
 * Handles listing, revoking, and managing user sessions
 */
import { SessionService } from './session.service.js';
import { SessionDeviceInfo, SessionLocationInfo } from '../../types/index.js';
import { ListSessionsResponse, SessionDetailsResponse, RevokeSessionResponse, RevokeAllSessionsResponse } from '../../types/session-management.types.js';
export declare class SessionManagementService {
    private sessionService;
    constructor(sessionService: SessionService);
    /**
     * List all sessions for a user
     */
    listUserSessions(tenantId: string, userId: string, currentSessionId?: string): Promise<ListSessionsResponse>;
    /**
     * Get session details
     */
    getSessionDetails(tenantId: string, userId: string, sessionId: string, currentSessionId?: string): Promise<SessionDetailsResponse | null>;
    /**
     * Revoke a specific session
     */
    revokeSession(tenantId: string, userId: string, sessionId: string): Promise<RevokeSessionResponse>;
    /**
     * Revoke all sessions for a user except the current one
     */
    revokeAllSessions(tenantId: string, userId: string, exceptSessionId?: string): Promise<RevokeAllSessionsResponse>;
    /**
     * Revoke all sessions for a user (admin action)
     */
    adminRevokeAllSessions(tenantId: string, userId: string): Promise<RevokeAllSessionsResponse>;
    /**
     * Convert UserSession to SessionResponse
     */
    private toSessionResponse;
    /**
     * Extract device and location info from request
     */
    static extractSessionMetadata(request: any): {
        deviceInfo?: SessionDeviceInfo;
        locationInfo?: SessionLocationInfo;
    };
}
//# sourceMappingURL=session-management.service.d.ts.map