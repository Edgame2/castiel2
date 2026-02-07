/**
 * Rotation Manager
 * 
 * Manages automatic and manual secret rotation.
 */

import { getDatabaseClient } from '@coder/shared';
import { SecretService } from '../SecretService';
import { RotationError } from '../../errors/SecretErrors';
import { AnySecretValue, SecretContext } from '../../types';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export interface RotationResult {
  secretId: string;
  newVersion: number;
  rotatedAt: Date;
}

export class RotationManager {
  private get db() {
    return getDatabaseClient() as any;
  }
  private secretService: SecretService;
  private auditService: AuditService;
  
  constructor() {
    this.secretService = new SecretService();
    this.auditService = new AuditService();
  }
  
  /**
   * Rotate a secret
   */
  async rotateSecret(
    secretId: string,
    newValue: AnySecretValue,
    context: SecretContext,
    changeReason?: string
  ): Promise<RotationResult> {
    // Get secret
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new RotationError(secretId, 'Secret not found');
    }
    
    // Validate new value matches type
    if (newValue.type !== secret.type) {
      throw new RotationError(
        secretId,
        `New value type ${newValue.type} does not match secret type ${secret.type}`
      );
    }
    
    // Update secret with new value (creates new version)
    await this.secretService.updateSecret(
      secretId,
      {
        value: newValue,
        changeReason: changeReason || 'Secret rotated',
      },
      context
    );
    
    // Update rotation metadata
    const nextRotationAt = secret.rotationIntervalDays
      ? new Date(Date.now() + secret.rotationIntervalDays * 24 * 60 * 60 * 1000)
      : null;
    
    await this.db.secret_secrets.update({
      where: { id: secretId },
      data: {
        lastRotatedAt: new Date(),
        nextRotationAt,
      },
    });
    
    // Get updated secret to return new version
    const updated = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    // Publish rotation event
    await publishSecretEvent(
      SecretEvents.secretRotated({
        secretId,
        secretName: secret.name,
        secretScope: secret.scope,
        organizationId: secret.organizationId || undefined,
        actorId: context.userId,
        newVersion: updated!.currentVersion,
      })
    );
    
    // Log rotation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret rotated',
      service: 'secret-management',
      metadata: {
        secretId,
        secretName: secret.name,
        newVersion: updated!.currentVersion,
        userId: context.userId,
        organizationId: secret.organizationId || undefined,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_ROTATED',
      actorId: context.userId,
      organizationId: secret.organizationId || undefined,
      secretId,
      secretName: secret.name,
      secretScope: secret.scope,
      action: 'Rotate secret',
      details: {
        newVersion: updated!.currentVersion,
        changeReason,
      },
    });
    
    return {
      secretId,
      newVersion: updated!.currentVersion,
      rotatedAt: new Date(),
    };
  }
  
  /**
   * Check for secrets due for rotation
   */
  async checkRotationDue(): Promise<Array<{ id: string; name: string; nextRotationAt: Date }>> {
    const now = new Date();
    
    const secretsDue = await this.db.secret_secrets.findMany({
      where: {
        rotationEnabled: true,
        nextRotationAt: {
          lte: now,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nextRotationAt: true,
      },
    });
    
    // Get full secret details for events
    const secretIds = secretsDue.map((s: any) => s.id);
    const secrets = await this.db.secret_secrets.findMany({
      where: { id: { in: secretIds } },
      select: { id: true, name: true, organizationId: true },
    });
    
    const secretMap = new Map<string, any>(secrets.map((s: any) => [s.id, s]));
    
    // Send rotation due notifications
    for (const secret of secretsDue) {
      const secretDetails = secretMap.get(secret.id);
      await publishSecretEvent(
        SecretEvents.secretRotationDue({
          secretId: secret.id,
          secretName: secret.name,
          organizationId: secretDetails?.organizationId || undefined,
        })
      );
    }
    
    return secretsDue.map((s: any) => ({
      id: s.id,
      name: s.name,
      nextRotationAt: s.nextRotationAt!,
    }));
  }
  
  /**
   * Auto-rotate secret (for scheduled rotation)
   * This would typically be called by a scheduler
   */
  async autoRotateSecret(secretId: string): Promise<RotationResult> {
    // Get secret
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new RotationError(secretId, 'Secret not found');
    }
    
    if (!secret.rotationEnabled) {
      throw new RotationError(secretId, 'Rotation not enabled for this secret');
    }
    
    // For auto-rotation, we need a way to generate new values
    // This is type-specific and may require external services
    // For now, throw error indicating manual rotation required
    throw new RotationError(
      secretId,
      'Auto-rotation requires manual intervention or external service integration'
    );
  }
}
