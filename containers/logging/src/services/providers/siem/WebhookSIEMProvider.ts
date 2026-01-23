/**
 * Webhook SIEM Provider
 * Generic webhook-based SIEM integration
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { ISIEMProvider, SIEMProviderConfig } from './ISIEMProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

/**
 * Webhook SIEM Provider
 * Sends audit logs to a generic webhook endpoint
 */
export class WebhookSIEMProvider implements ISIEMProvider {
  private url: string;
  private headers: Record<string, string>;

  constructor(config: SIEMProviderConfig) {
    if (!config.webhook?.url) {
      throw new Error('Webhook SIEM provider requires URL configuration');
    }

    this.url = config.webhook.url;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.webhook.headers,
    };

    log.info('Webhook SIEM Provider initialized', { url: this.url });
  }

  async sendLog(logEntry: AuditLog): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(this.transformLog(logEntry)),
      });

      if (!response.ok) {
        throw new Error(`SIEM webhook returned ${response.status}: ${response.statusText}`);
      }

      log.debug('Log sent to SIEM webhook', { logId: logEntry.id });
    } catch (error) {
      log.error('Failed to send log to SIEM webhook', error, { logId: logEntry.id });
      throw error;
    }
  }

  async sendBatch(logs: AuditLog[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    try {
      const payload = logs.map(log => this.transformLog(log));

      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`SIEM webhook batch returned ${response.status}: ${response.statusText}`);
      }

      log.debug('Batch logs sent to SIEM webhook', { count: logs.length });
    } catch (error) {
      log.error('Failed to send batch logs to SIEM webhook', error, { count: logs.length });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Try a simple HEAD or GET request to check if endpoint is accessible
      const response = await fetch(this.url, {
        method: 'HEAD',
        headers: this.headers,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok || response.status === 405) { // 405 Method Not Allowed is OK for HEAD
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: `Health check failed: ${response.status} ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Health check failed',
      };
    }
  }

  /**
   * Transform audit log to SIEM format
   */
  private transformLog(logEntry: AuditLog): Record<string, unknown> {
    return {
      timestamp: logEntry.timestamp.toISOString(),
      id: logEntry.id,
      organizationId: logEntry.organizationId,
      userId: logEntry.userId,
      sessionId: logEntry.sessionId,
      ipAddress: logEntry.ipAddress,
      userAgent: logEntry.userAgent,
      geolocation: logEntry.geolocation,
      action: logEntry.action,
      category: logEntry.category,
      severity: logEntry.severity,
      resourceType: logEntry.resourceType,
      resourceId: logEntry.resourceId,
      message: logEntry.message,
      metadata: logEntry.metadata,
      hash: logEntry.hash,
      previousHash: logEntry.previousHash,
      source: logEntry.source,
      correlationId: logEntry.correlationId,
      receivedAt: logEntry.receivedAt.toISOString(),
    };
  }
}

