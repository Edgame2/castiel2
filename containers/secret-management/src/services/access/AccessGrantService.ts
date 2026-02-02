/**
 * Access Grant Service
 * 
 * Manages explicit access grants for secrets.
 */

import { getDatabaseClient } from '@coder/shared';
import {
  GrantAccessParams,
  SecretAccessGrant,
  GranteeType,
} from '../../types';
import {
  SecretNotFoundError,
  GrantNotFoundError,
  InvalidGranteeError,
  AccessDeniedError,
} from '../../errors/SecretErrors';
import { AccessController } from './AccessController';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export class AccessGrantService {
  private db = getDatabaseClient() as any;
  private accessController: AccessController;
  private auditService: AuditService;
  
  constructor() {
    this.accessController = new AccessController();
    this.auditService = new AuditService();
  }
  
  /**
   * Grant access to a secret
   */
  async grantAccess(
    params: GrantAccessParams,
    grantedById: string
  ): Promise<SecretAccessGrant> {
    // Verify secret exists
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: params.secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(params.secretId);
    }
    
    // Check if grantor has GRANT permission
    const canGrant = await this.accessController.checkAccess(
      params.secretId,
      'GRANT',
      {
        userId: grantedById,
        organizationId: secret.organizationId || undefined,
        teamId: secret.teamId || undefined,
        projectId: secret.projectId || undefined,
        consumerModule: 'secret-management',
      }
    );
    
    if (!canGrant.allowed) {
      throw new AccessDeniedError(
        params.secretId,
        grantedById,
        'GRANT',
        canGrant.reason
      );
    }
    
    // Validate grantee
    await this.validateGrantee(params.granteeType, params.granteeId);
    
    // Check for existing grant
    const existingGrant = await this.db.secret_access_grants.findFirst({
      where: {
        secretId: params.secretId,
        granteeType: params.granteeType,
        userId: params.granteeType === 'USER' ? params.granteeId : undefined,
        teamId: params.granteeType === 'TEAM' ? params.granteeId : undefined,
        roleId: params.granteeType === 'ROLE' ? params.granteeId : undefined,
      },
    });
    
    if (existingGrant) {
      // Update existing grant
      const updated = await this.db.secret_access_grants.update({
        where: { id: existingGrant.id },
        data: {
          canRead: params.permissions.canRead,
          canUpdate: params.permissions.canUpdate,
          canDelete: params.permissions.canDelete,
          canGrant: params.permissions.canGrant,
          expiresAt: params.expiresAt || null,
        },
      });
      
      return this.mapToGrant(updated);
    }
    
    // Create new grant
    const grant = await this.db.secret_access_grants.create({
      data: {
        secretId: params.secretId,
        granteeType: params.granteeType,
        userId: params.granteeType === 'USER' ? params.granteeId : null,
        teamId: params.granteeType === 'TEAM' ? params.granteeId : null,
        roleId: params.granteeType === 'ROLE' ? params.granteeId : null,
        canRead: params.permissions.canRead,
        canUpdate: params.permissions.canUpdate,
        canDelete: params.permissions.canDelete,
        canGrant: params.permissions.canGrant,
        expiresAt: params.expiresAt || null,
        grantedById,
      },
    });
    
    const mappedGrant = this.mapToGrant(grant);
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.accessGranted({
        secretId: params.secretId,
        secretName: secret.name,
        granteeId: params.granteeId,
        granteeType: params.granteeType,
        organizationId: secret.organizationId || undefined,
        actorId: grantedById,
      })
    );
    
    // Log access grant
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Access granted to secret',
      service: 'secret-management',
      metadata: {
        secretId: params.secretId,
        secretName: secret.name,
        granteeId: params.granteeId,
        granteeType: params.granteeType,
        userId: grantedById,
        organizationId: secret.organizationId || undefined,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'ACCESS_GRANTED',
      actorId: grantedById,
      organizationId: secret.organizationId || undefined,
      secretId: params.secretId,
      secretName: secret.name,
      secretScope: secret.scope,
      action: 'Grant access',
      details: {
        granteeId: params.granteeId,
        granteeType: params.granteeType,
        permissions: params.permissions,
      },
    });
    
    return mappedGrant;
  }
  
  /**
   * Revoke access grant
   */
  async revokeAccess(
    grantId: string,
    revokedById: string
  ): Promise<void> {
    const grant = await this.db.secret_access_grants.findUnique({
      where: { id: grantId },
      include: {
        secret: true,
      },
    });
    
    if (!grant) {
      throw new GrantNotFoundError(grantId);
    }
    
    // Check if revoker has GRANT permission
    const canGrant = await this.accessController.checkAccess(
      grant.secretId,
      'GRANT',
      {
        userId: revokedById,
        organizationId: grant.secret.organizationId || undefined,
        teamId: grant.secret.teamId || undefined,
        projectId: grant.secret.projectId || undefined,
        consumerModule: 'secret-management',
      }
    );
    
    if (!canGrant.allowed) {
      throw new AccessDeniedError(
        grant.secretId,
        revokedById,
        'GRANT',
        canGrant.reason
      );
    }
    
    // Delete grant
    await this.db.secret_access_grants.delete({
      where: { id: grantId },
    });
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.accessRevoked({
        secretId: grant.secretId,
        secretName: grant.secret.name,
        granteeId: grant.userId || grant.teamId || grant.roleId || '',
        organizationId: grant.secret.organizationId || undefined,
        actorId: revokedById,
      })
    );
    
    // Log access revocation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Access revoked from secret',
      service: 'secret-management',
      metadata: {
        secretId: grant.secretId,
        secretName: grant.secret.name,
        grantId,
        userId: revokedById,
        organizationId: grant.secret.organizationId || undefined,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'ACCESS_REVOKED',
      actorId: revokedById,
      organizationId: grant.secret.organizationId || undefined,
      secretId: grant.secretId,
      secretName: grant.secret.name,
      secretScope: grant.secret.scope,
      action: 'Revoke access',
      details: {
        grantId,
        granteeId: grant.userId || grant.teamId || grant.roleId,
        granteeType: grant.granteeType,
      },
    });
  }
  
  /**
   * List access grants for a secret
   */
  async listGrants(secretId: string): Promise<SecretAccessGrant[]> {
    const grants = await this.db.secret_access_grants.findMany({
      where: {
        secretId,
        expiresAt: {
          OR: [
            { gt: new Date() },
            { equals: null },
          ],
        },
      },
      include: {
        grantedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });
    
    return grants.map((g: any) => this.mapToGrant(g));
  }
  
  /**
   * Validate grantee exists
   */
  private async validateGrantee(
    granteeType: GranteeType,
    granteeId: string
  ): Promise<void> {
    switch (granteeType) {
      case 'USER':
        const user = await this.db.user.findUnique({
          where: { id: granteeId },
        });
        if (!user) {
          throw new InvalidGranteeError('USER', granteeId);
        }
        break;
      
      case 'TEAM':
        // Team model not yet in shared schema
        // Accept the granteeId as-is - validation will be added when Team model is available
        // This allows the system to function and grants can be created
        // When Team model is added, we can validate: await db.team.findUnique({ where: { id: granteeId } })
        break;
      
      case 'ROLE':
        // Role model not yet in shared schema
        // Accept the granteeId as-is - validation will be added when Role model is available
        // This allows the system to function and grants can be created
        // When Role model is added, we can validate: await db.role.findUnique({ where: { id: granteeId } })
        break;
      
      default:
        throw new InvalidGranteeError(granteeType, granteeId);
    }
  }
  
  /**
   * Map database model to SecretAccessGrant
   */
  private mapToGrant(grant: any): SecretAccessGrant {
    return {
      id: grant.id,
      secretId: grant.secretId,
      granteeType: grant.granteeType,
      userId: grant.userId || undefined,
      teamId: grant.teamId || undefined,
      roleId: grant.roleId || undefined,
      canRead: grant.canRead,
      canUpdate: grant.canUpdate,
      canDelete: grant.canDelete,
      canGrant: grant.canGrant,
      expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : undefined,
      grantedAt: grant.grantedAt,
      grantedById: grant.grantedById,
    };
  }
}
