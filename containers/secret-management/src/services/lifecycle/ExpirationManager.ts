/**
 * Expiration Manager
 * 
 * Manages secret expiration and sends notifications for expiring secrets.
 */

import { getDatabaseClient } from '@coder/shared';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';

export interface ExpirationCheckResult {
  checked: number;
  expiringSoon: number;
  expired: number;
  secretsExpiringSoon: Array<{ id: string; name: string; expiresAt: Date; daysUntil: number }>;
  secretsExpired: Array<{ id: string; name: string; expiresAt: Date }>;
}

export class ExpirationManager {
  private get db() {
    return getDatabaseClient() as any;
  }
  
  /**
   * Check for expiring and expired secrets
   */
  async checkExpirations(): Promise<ExpirationCheckResult> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Find secrets expiring soon (within 30 days)
    const expiringSoon = await this.db.secret_secrets.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
      },
    });
    
    // Find expired secrets
    const expired = await this.db.secret_secrets.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
      },
    });
    
    // Calculate days until expiration
    const secretsExpiringSoon = expiringSoon.map((secret: any) => {
      const daysUntil = Math.ceil(
        (secret.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        id: secret.id,
        name: secret.name,
        expiresAt: secret.expiresAt!,
        daysUntil,
      };
    });
    
    const secretsExpired = expired.map((secret: any) => ({
      id: secret.id,
      name: secret.name,
      expiresAt: secret.expiresAt!,
    }));
    
    // Get full secret details for events
    const db = getDatabaseClient() as any;
    const expiringSecretIds = expiringSoon.map((s: any) => s.id);
    const expiredSecretIds = expired.map((s: any) => s.id);
    
    const expiringSecrets = await db.secret_secrets.findMany({
      where: { id: { in: expiringSecretIds } },
      select: { id: true, name: true, scope: true, organizationId: true },
    });
    
    const expiredSecrets = await db.secret_secrets.findMany({
      where: { id: { in: expiredSecretIds } },
      select: { id: true, name: true, scope: true, organizationId: true },
    });
    
    // Create map for quick lookup
    const expiringMap = new Map<string, any>(expiringSecrets.map((s: any) => [s.id, s]));
    const expiredMap = new Map<string, any>(expiredSecrets.map((s: any) => [s.id, s]));
    
    // Group by expiration thresholds (30, 14, 7, 1 days)
    const thresholds = [30, 14, 7, 1];
    for (const threshold of thresholds) {
      const secretsAtThreshold = secretsExpiringSoon.filter(
        (s: any) => s.daysUntil <= threshold && s.daysUntil > threshold - 7
      );
      
      // Send notifications for secrets at this threshold
      for (const secret of secretsAtThreshold) {
        const secretDetails = expiringMap.get(secret.id);
        if (secretDetails) {
          await publishSecretEvent(
            SecretEvents.secretExpiringSoon({
              secretId: secret.id,
              secretName: secret.name,
              secretScope: secretDetails.scope,
              organizationId: secretDetails.organizationId || undefined,
              daysUntilExpiration: secret.daysUntil,
            })
          );
        }
      }
    }
    
    // Send notifications for expired secrets
    for (const secret of secretsExpired) {
      const secretDetails = expiredMap.get(secret.id);
      if (secretDetails) {
        await publishSecretEvent(
          SecretEvents.secretExpired({
            secretId: secret.id,
            secretName: secret.name,
            secretScope: secretDetails.scope,
            organizationId: secretDetails.organizationId || undefined,
          })
        );
      }
    }
    
    const checked = expiringSoon.length + expired.length;
    const expiringSoonCount = expiringSoon.length;
    const expiredCount = expired.length;

    // Log expiration check
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Expiration check completed',
      service: 'secret-management',
      metadata: {
        checked,
        expiringSoon: expiringSoonCount,
        expired: expiredCount,
      },
    });

    return {
      checked,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      secretsExpiringSoon,
      secretsExpired,
    };
  }
  
  /**
   * Check if secret is expired
   */
  isExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) {
      return false;
    }
    return expiresAt < new Date();
  }
  
  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(expiresAt: Date | null | undefined): number | null {
    if (!expiresAt) {
      return null;
    }
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }
}
