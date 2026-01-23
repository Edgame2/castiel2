import { getUser } from '../middleware/authenticate.js';
export class SessionManagementController {
    sessionManagementService;
    constructor(sessionManagementService) {
        this.sessionManagementService = sessionManagementService;
    }
    async listCurrentSessions(request, reply) {
        try {
            const user = getUser(request);
            const currentSessionId = this.extractSessionId(request);
            const result = await this.sessionManagementService.listUserSessions(user.tenantId, user.id, currentSessionId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to list user sessions');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to list sessions',
            });
        }
    }
    async getCurrentSession(request, reply) {
        try {
            const user = getUser(request);
            const { sessionId } = request.params;
            const currentSessionId = this.extractSessionId(request);
            const session = await this.sessionManagementService.getSessionDetails(user.tenantId, user.id, sessionId, currentSessionId);
            if (!session) {
                reply.status(404).send({ error: 'Session not found' });
                return;
            }
            reply.send(session);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to fetch session details');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to fetch session details',
            });
        }
    }
    async terminateSession(request, reply) {
        try {
            const user = getUser(request);
            const { sessionId } = request.params;
            const session = await this.sessionManagementService.getSessionDetails(user.tenantId, user.id, sessionId, this.extractSessionId(request));
            if (!session) {
                reply.status(404).send({ error: 'Session not found' });
                return;
            }
            const result = await this.sessionManagementService.revokeSession(user.tenantId, user.id, sessionId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to terminate session');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to terminate session',
            });
        }
    }
    async terminateAllSessions(request, reply) {
        try {
            const user = getUser(request);
            const { excludeCurrentSessionId } = request.body || {};
            const currentSessionId = excludeCurrentSessionId || this.extractSessionId(request);
            const result = await this.sessionManagementService.revokeAllSessions(user.tenantId, user.id, currentSessionId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to revoke all sessions');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to revoke sessions',
            });
        }
    }
    async listUserSessions(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const result = await this.sessionManagementService.listUserSessions(tenantId, userId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to list tenant user sessions');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to list sessions',
            });
        }
    }
    async adminTerminateSession(request, reply) {
        try {
            const { tenantId, userId, sessionId } = request.params;
            const result = await this.sessionManagementService.revokeSession(tenantId, userId, sessionId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to admin terminate session');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to terminate session',
            });
        }
    }
    async adminTerminateAllSessions(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const result = await this.sessionManagementService.adminRevokeAllSessions(tenantId, userId);
            reply.send(result);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to admin revoke sessions');
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Unable to revoke sessions',
            });
        }
    }
    extractSessionId(request) {
        const fromHeader = request.headers['x-session-id'];
        if (typeof fromHeader === 'string' && fromHeader.length > 0) {
            return fromHeader;
        }
        const user = request.user;
        if (user?.claims?.sid && typeof user.claims.sid === 'string') {
            return user.claims.sid;
        }
        return undefined;
    }
}
//# sourceMappingURL=session-management.controller.js.map