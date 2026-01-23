/**
 * SCIM Authentication Middleware
 * Validates SCIM bearer tokens for SCIM 2.0 endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
/**
 * SCIM Authentication Middleware
 * Validates SCIM bearer token and extracts tenant ID
 */
export declare function scimAuthenticate(scimService: SCIMService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=scim-auth.d.ts.map