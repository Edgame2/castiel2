import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionManagementService } from '../services/auth/session-management.service.js';
export declare class SessionManagementController {
    private readonly sessionManagementService;
    constructor(sessionManagementService: SessionManagementService);
    listCurrentSessions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCurrentSession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    terminateSession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    terminateAllSessions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    listUserSessions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    adminTerminateSession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    adminTerminateAllSessions(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    private extractSessionId;
}
//# sourceMappingURL=session-management.controller.d.ts.map