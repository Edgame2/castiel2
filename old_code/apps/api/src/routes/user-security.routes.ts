/**
 * User Security Routes
 * 
 * Admin routes for managing user security
 */

import type { FastifyInstance } from 'fastify';
import type { UserSecurityController } from '../controllers/user-security.controller.js';

const forceResetSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      sendEmail: { type: 'boolean', default: true },
    },
  },
};

const revokeSessionsSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};

const disableMFASchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['totp', 'sms', 'email'] },
    },
  },
};

const lockAccountSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string', maxLength: 500 },
    },
  },
};

const unlockAccountSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};

const getUserSecuritySchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};

export function registerUserSecurityRoutes(
  server: FastifyInstance,
  userSecurityController: UserSecurityController
) {
  // Get user security status
  server.get(
    '/api/admin/users/:userId/security',
    { schema: getUserSecuritySchema },
    (request, reply) => userSecurityController.getUserSecurity(request, reply)
  );

  // Force password reset
  server.post(
    '/api/admin/users/:userId/force-password-reset',
    { schema: forceResetSchema },
    (request, reply) => userSecurityController.forcePasswordReset(request, reply)
  );

  // Revoke all sessions
  server.post(
    '/api/admin/users/:userId/revoke-sessions',
    { schema: revokeSessionsSchema },
    (request, reply) => userSecurityController.revokeSessions(request, reply)
  );

  // Disable MFA
  server.post(
    '/api/admin/users/:userId/disable-mfa',
    { schema: disableMFASchema },
    (request, reply) => userSecurityController.disableMFA(request, reply)
  );

  // Lock account
  server.post(
    '/api/admin/users/:userId/lock',
    { schema: lockAccountSchema },
    (request, reply) => userSecurityController.lockAccount(request, reply)
  );

  // Unlock account
  server.post(
    '/api/admin/users/:userId/unlock',
    { schema: unlockAccountSchema },
    (request, reply) => userSecurityController.unlockAccount(request, reply)
  );
}

