/**
 * Route Registration
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance } from 'fastify';
import { UserManagementConfig } from '../types/config.types';
import { log } from '../utils/logger';
import { setupUserRoutes } from './users';
import { setupTeamRoutes } from './teams';
import { setupRoleRoutes } from './roles';
import { setupInvitationRoutes } from './invitations';

export async function registerRoutes(fastify: FastifyInstance, _config: UserManagementConfig): Promise<void> {
  log.info('Registering user management routes', { service: 'user-management' });

  await setupUserRoutes(fastify);
  await setupTeamRoutes(fastify);
  await setupRoleRoutes(fastify);
  await setupInvitationRoutes(fastify);
}

