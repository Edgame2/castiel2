/**
 * Access Controller
 * 
 * Checks access permissions for secret operations.
 */

import { getDatabaseClient } from '@coder/shared';
import { SecretAction, AccessCheckResult, SecretContext } from '../../types';
import { ScopeValidator } from './ScopeValidator';
import { AccessDeniedError, SecretNotFoundError } from '../../errors/SecretErrors';
import { SecretMetadata } from '../../types';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';
import { getUserRoles, isSuperAdmin } from './RoleService';

export class AccessController {
  private db = getDatabaseClient();
  private auditService: AuditService;
  
  constructor() {
    this.auditService = new AuditService();
  }
  
  /**
   * Check if user can perform action on secret
   */
  async checkAccess(
    secretId: string,
    action: SecretAction,
    context: SecretContext
  ): Promise<AccessCheckResult> {
    // Get secret metadata
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    // Check if secret is deleted
    if (secret.deletedAt) {
      return {
        allowed: false,
        reason: 'Secret has been deleted',
      };
    }
    
    // Check if secret is expired (for READ operations)
    if (action === 'READ' && secret.expiresAt && secret.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'Secret has expired',
      };
    }
    
    // Get user roles
    const userRoles = await getUserRoles(context.userId, secret.organizationId || undefined);
    const roleNames = userRoles.map(r => r.name);
    const roleIds = userRoles.map(r => r.id);
    const userIsSuperAdmin = await isSuperAdmin(context.userId, secret.organizationId || undefined);
    
    // Check scope access
    const canAccessScope = ScopeValidator.canAccessScope(
      secret.scope,
      {
        userId: context.userId,
        organizationId: context.organizationId,
        teamId: context.teamId,
        projectId: context.projectId,
      },
      roleNames
    );
    
    if (!canAccessScope) {
      return {
        allowed: false,
        reason: `User does not have access to ${secret.scope} scope`,
      };
    }
    
    // Check if user is the creator/owner
    const isOwner = secret.createdById === context.userId;
    
    // Owner has all permissions
    if (isOwner) {
      return { allowed: true };
    }
    
    // Check explicit access grants
    const grantWhere: any = {
      secretId,
      AND: [
        {
          OR: [
            { granteeType: 'USER', granteeId: context.userId },
            ...(roleIds.length > 0 ? [{ granteeType: 'ROLE', granteeId: { in: roleIds } }] : []),
            ...(context.teamId ? [{ granteeType: 'TEAM', granteeId: context.teamId }] : []),
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    };
    
    const explicitGrant = await this.db.secret_access_grants.findFirst({
      where: grantWhere,
    });
    
    if (explicitGrant) {
      // Check if grant has required permission
      let hasPermission = false;
      switch (action) {
        case 'READ':
        case 'VIEW_METADATA':
          hasPermission = explicitGrant.canRead;
          break;
        case 'UPDATE':
          hasPermission = explicitGrant.canUpdate;
          break;
        case 'DELETE':
          hasPermission = explicitGrant.canDelete;
          break;
        case 'GRANT':
          hasPermission = explicitGrant.canGrant;
          break;
      }
      
      if (hasPermission) {
        return { allowed: true };
      }
    }
    
    // Check role-based permissions
    const hasRolePermission = await this.checkRolePermission(
      context.userId,
      secret,
      action,
      userIsSuperAdmin
    );
    
    if (hasRolePermission) {
      return { allowed: true };
    }
    
    // Log access denial
    await getLoggingClient().sendLog({
      level: 'warn',
      message: 'Access denied',
      service: 'secret-management',
      metadata: {
        secretId,
        userId: context.userId,
        action,
        reason: 'No access grant found for this user',
        organizationId: secret.organizationId || undefined,
      },
    });
    
    // Audit log access denial
    await this.auditService.log({
      eventType: 'ACCESS_DENIED',
      actorId: context.userId,
      organizationId: secret.organizationId || undefined,
      secretId,
      secretName: secret.name,
      secretScope: secret.scope,
      action: `Access denied: ${action}`,
      outcome: 'DENIED',
      details: { reason: 'No access grant found for this user' },
    });
    
    return {
      allowed: false,
      reason: 'No access grant found for this user',
    };
  }
  
  /**
   * Check if user can create secret at scope
   */
  async canCreateSecret(
    scope: string,
    context: SecretContext
  ): Promise<AccessCheckResult> {
    // Get user roles
    const userIsSuperAdmin = await isSuperAdmin(context.userId, context.organizationId);
    const userRoles = await getUserRoles(context.userId, context.organizationId);
    const roleNames = userRoles.map(r => r.name);
    
    // Check scope access
    const canAccessScope = ScopeValidator.canAccessScope(
      scope as any,
      {
        userId: context.userId,
        organizationId: context.organizationId,
        teamId: context.teamId,
        projectId: context.projectId,
      },
      roleNames
    );
    
    if (!canAccessScope) {
      return {
        allowed: false,
        reason: `User does not have access to ${scope} scope`,
      };
    }
    
    // Additional permission checks based on scope
    switch (scope) {
      case 'GLOBAL':
        // Only super admin
        if (!userIsSuperAdmin) {
          return {
            allowed: false,
            reason: 'Only Super Admin can create global secrets',
          };
        }
        return { allowed: true };
      
      case 'ORGANIZATION':
        // Org admin or member with create permission
        // Check for secrets.secret.create permission
        const hasCreatePermission = userRoles.some(r =>
          r.permissions.includes('secrets.secret.create.organization')
        );
        if (hasCreatePermission || userIsSuperAdmin) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'User does not have permission to create organization secrets',
        };
      
      case 'TEAM':
      case 'PROJECT':
      case 'USER':
        // User can create secrets in their own scope
        return { allowed: true };
      
      default:
        return {
          allowed: false,
          reason: `Invalid scope: ${scope}`,
        };
    }
  }
  
  /**
   * Check role-based permission for secret operation
   */
  private async checkRolePermission(
    userId: string,
    secret: any,
    action: string,
    isSuperAdmin: boolean
  ): Promise<boolean> {
    if (isSuperAdmin) {
      return true;
    }
    
    // Get user roles
    const userRoles = await getUserRoles(userId, secret.organizationId || undefined);
    
    // Check for specific permissions
    const permissionMap: Record<string, string> = {
      'READ': 'secrets.secret.read',
      'UPDATE': 'secrets.secret.update',
      'DELETE': 'secrets.secret.delete',
      'GRANT': 'secrets.secret.grant',
      'VIEW_METADATA': 'secrets.secret.read',
    };
    
    const requiredPermission = permissionMap[action];
    if (!requiredPermission) {
      return false;
    }
    
    // Check if user has permission for the scope
    const scopePermission = `${requiredPermission}.${secret.scope.toLowerCase()}`;
    
    return userRoles.some(r =>
      r.permissions.includes(scopePermission) ||
      r.permissions.includes(requiredPermission) ||
      r.permissions.includes('secrets.secret.*')
    );
  }
}
