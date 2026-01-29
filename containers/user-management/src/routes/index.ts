/**
 * Route Registration
 * Per ModuleImplementationGuide Section 7
 */

import { FastifyInstance } from 'fastify';
import { UserManagementConfig } from '../types/config.types';
import { log } from '../utils/logger';
import { setupUserRoutes } from './users';
import { setupOrganizationRoutes } from './organizations';
import { setupTeamRoutes } from './teams';
import { setupRoleRoutes } from './roles';
import { setupInvitationRoutes } from './invitations';

export async function registerRoutes(fastify: FastifyInstance, _config: UserManagementConfig): Promise<void> {
  log.info('Registering user management routes', { service: 'user-management' });

  // Setup user management routes
  await setupUserRoutes(fastify);
  
  // Setup organization routes
  await setupOrganizationRoutes(fastify);
  
  // Setup team routes
  await setupTeamRoutes(fastify);
  
  // Setup role routes
  await setupRoleRoutes(fastify);
  
  // Setup invitation routes
  await setupInvitationRoutes(fastify);
}

