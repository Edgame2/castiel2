/**
 * RBAC Middleware
 * 
 * Permission checking middleware for auth routes.
 * Per ModuleImplementationGuide Section 11.2
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

export interface PermissionCheck {
  permission: string;
  resourceType?: 'project' | 'team' | 'user' | 'organization';
  resourceId?: string;
}

/**
 * Check if user has a permission
 * 
 * @param request - Fastify request
 * @param reply - Fastify reply
 * @param check - Permission check configuration
 * @returns Promise resolving to true if user has permission, false otherwise
 */
export async function checkPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  check: PermissionCheck
): Promise<boolean> {
  const user = (request as any).user;
  if (!user) {
    reply.code(401).send({ error: 'Authentication required' });
    return false;
  }

  const userId = user.id as string;
  if (!userId) {
    reply.code(401).send({ error: 'Invalid user session' });
    return false;
  }

  // Extract organization ID from request
  const params = request.params as any;
  const orgId = params?.orgId || params?.organizationId;
  const organizationId = orgId || (check.resourceType === 'organization' ? check.resourceId : undefined) || (request as any).organizationId;

  if (!organizationId) {
    reply.code(400).send({ error: 'Organization context required' });
    return false;
  }

  // Determine resource ID for scope checking
  const resourceId = check.resourceId || params?.id || params?.projectId || params?.teamId || params?.userId;

  try {
    const db = getDatabaseClient();
    
    // Check if user is Super Admin (bypass all permissions)
    const membership = await db.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'active',
      },
      include: { role: true },
    });

    if (membership?.role.isSuperAdmin) {
      return true;
    }

    if (!membership) {
      reply.code(403).send({ error: `Permission denied: ${check.permission}` });
      return false;
    }

    // Get role permissions
    const rolePermissions = await db.rolePermission.findMany({
      where: {
        roleId: membership.roleId,
      },
      include: {
        permission: true,
      },
    });

    const permissionCodes = rolePermissions.map(rp => rp.permission.code);

    // Check for wildcard permission
    if (permissionCodes.includes('*')) {
      return true;
    }

    // Check exact permission match
    if (permissionCodes.includes(check.permission)) {
      return true;
    }

    // Check wildcard matches (simplified - matches patterns like "organizations.*" or "organizations.sso.*")
    const requiredParts = check.permission.split('.');
    for (const perm of permissionCodes) {
      if (perm.includes('*')) {
        const permParts = perm.split('.');
        let matches = true;
        
        for (let i = 0; i < Math.max(permParts.length, requiredParts.length); i++) {
          const permPart = permParts[i];
          const requiredPart = requiredParts[i];
          
          if (permPart === '*') {
            break; // Wildcard matches anything at this level
          }
          
          if (!requiredPart || permPart !== requiredPart) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          return true;
        }
      }
    }

    // Permission denied - log for audit
    log.warn('Permission denied', {
      userId,
      organizationId,
      permission: check.permission,
      resourceId: check.resourceId,
      service: 'auth',
    });

    reply.code(403).send({ error: `Permission denied: ${check.permission}` });
    return false;
  } catch (error: any) {
    log.error('Error checking permission', error, {
      userId,
      organizationId,
      permission: check.permission,
      service: 'auth',
    });
    reply.code(500).send({ error: 'Failed to check permissions' });
    return false;
  }
}

/**
 * Middleware factory to require a specific permission
 * 
 * @param permission - Permission code
 * @param resourceType - Optional resource type for scope checking
 * @returns Fastify preHandler middleware function
 * 
 * @example
 * fastify.get('/api/v1/auth/organizations/:orgId/sso/config', {
 *   preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')]
 * }, handler);
 */
export function requirePermission(
  permission: string,
  resourceType?: 'project' | 'team' | 'user' | 'organization'
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    // Extract resource ID from params based on resource type
    let resourceId: string | undefined;
    
    if (resourceType === 'project') {
      resourceId = params?.id || params?.projectId;
    } else if (resourceType === 'team') {
      resourceId = params?.id || params?.teamId;
    } else if (resourceType === 'user') {
      resourceId = params?.id || params?.userId;
    } else if (resourceType === 'organization') {
      resourceId = params?.id || params?.orgId || params?.organizationId;
    } else {
      // Try to infer from params
      resourceId = params?.id || params?.projectId || params?.teamId || params?.userId;
    }
    
    const hasPermission = await checkPermission(request, reply, {
      permission,
      resourceType,
      resourceId,
    });

    if (!hasPermission) {
      return; // Error already sent by checkPermission
    }
  };
}

