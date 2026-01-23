/**
 * Session Management Service
 * Handles listing, revoking, and managing user sessions
 */
import { parseUserAgent } from '../../utils/device-detection.js';
export class SessionManagementService {
    sessionService;
    constructor(sessionService) {
        this.sessionService = sessionService;
    }
    /**
     * List all sessions for a user
     */
    async listUserSessions(tenantId, userId, currentSessionId) {
        const sessions = await this.sessionService.getUserSessions(tenantId, userId);
        const sessionResponses = sessions.map(session => this.toSessionResponse(session, currentSessionId));
        // Sort by last activity (most recent first)
        sessionResponses.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
        return {
            sessions: sessionResponses,
            total: sessionResponses.length,
        };
    }
    /**
     * Get session details
     */
    async getSessionDetails(tenantId, userId, sessionId, currentSessionId) {
        const session = await this.sessionService.getSession(tenantId, userId, sessionId);
        if (!session) {
            return null;
        }
        return {
            ...this.toSessionResponse(session, currentSessionId),
            email: session.email,
            name: session.name,
            provider: session.provider,
            metadata: session.metadata,
        };
    }
    /**
     * Revoke a specific session
     */
    async revokeSession(tenantId, userId, sessionId) {
        await this.sessionService.deleteSession(tenantId, userId, sessionId);
        return {
            success: true,
            message: 'Session revoked successfully',
        };
    }
    /**
     * Revoke all sessions for a user except the current one
     */
    async revokeAllSessions(tenantId, userId, exceptSessionId) {
        const sessions = await this.sessionService.getUserSessions(tenantId, userId);
        const sessionsToRevoke = exceptSessionId
            ? sessions.filter(s => s.sessionId !== exceptSessionId)
            : sessions;
        for (const session of sessionsToRevoke) {
            await this.sessionService.deleteSession(tenantId, userId, session.sessionId);
        }
        return {
            success: true,
            revokedCount: sessionsToRevoke.length,
            message: exceptSessionId
                ? `Revoked ${sessionsToRevoke.length} other session(s)`
                : `Revoked all ${sessionsToRevoke.length} session(s)`,
        };
    }
    /**
     * Revoke all sessions for a user (admin action)
     */
    async adminRevokeAllSessions(tenantId, userId) {
        const count = await this.sessionService.deleteAllUserSessions(tenantId, userId);
        return {
            success: true,
            revokedCount: count,
            message: `Revoked all ${count} session(s) for user`,
        };
    }
    /**
     * Convert UserSession to SessionResponse
     */
    toSessionResponse(session, currentSessionId) {
        return {
            sessionId: session.sessionId,
            userId: session.userId,
            tenantId: session.tenantId,
            createdAt: session.createdAt,
            lastActivityAt: session.lastActivityAt,
            expiresAt: session.expiresAt,
            isCurrent: session.sessionId === currentSessionId,
            deviceInfo: session.deviceInfo,
            locationInfo: session.locationInfo,
        };
    }
    /**
     * Extract device and location info from request
     */
    static extractSessionMetadata(request) {
        const userAgent = request.headers['user-agent'] || '';
        const ip = request.ip || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || '';
        return {
            deviceInfo: userAgent ? parseUserAgent(userAgent) : undefined,
            locationInfo: ip ? { ip } : undefined,
        };
    }
}
//# sourceMappingURL=session-management.service.js.map