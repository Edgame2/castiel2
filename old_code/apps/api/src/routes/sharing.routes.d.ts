/**
 * Project Sharing & Collaboration Routes
 * Endpoints for managing project sharing, collaborators, and ownership
 */
import { FastifyInstance } from 'fastify';
import { ProjectSharingService } from '../services/project-sharing.service';
import { ProjectActivityService } from '../services/project-activity.service';
export declare function registerSharingRoutes(fastify: FastifyInstance, sharingService: ProjectSharingService, activityService: ProjectActivityService): Promise<void>;
/**
 * Project Activity Routes
 * Endpoints for activity logging, querying, and reporting
 */
export declare function registerActivityRoutes(fastify: FastifyInstance, activityService: ProjectActivityService): Promise<void>;
//# sourceMappingURL=sharing.routes.d.ts.map