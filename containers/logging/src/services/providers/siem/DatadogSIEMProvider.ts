/**
 * Datadog SIEM Provider
 * Sends audit logs to Datadog via Logs API
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { ISIEMProvider, SIEMProviderConfig } from './ISIEMProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

/**
 * Datadog SIEM Provider
 * Sends audit logs to Datadog Logs API
 */
export class DatadogSIEMProvider implements ISIEMProvider {
  private apiKey: string;
  private appKey?: string;
  private site: string;
  private baseUrl: string;

  constructor(config: SIEMProviderConfig) {
    if (!config.datadog?.apiKey) {
      throw new Error('Datadog SIEM provider requires API key configuration');
    }

    this.apiKey = config.datadog.apiKey;
    this.appKey = config.datadog.appKey;
    this.site = config.datadog.site || 'datadoghq.com';
    this.baseUrl = `https://http-intake.logs.${this.site}/api/v2/logs`;

    log.info('Datadog SIEM Provider initialized', { site: this.site });
  }

  async sendLog(logEntry: AuditLog): Promise<void> {
    try {
      const payload = {
        ddsource: 'coder-ide',
        ddtags: `env:production,category:${logEntry.category},severity:${logEntry.severity}`,
        hostname: 'coder-ide',
        service: 'audit-logging',
        message: this.transformLog(logEntry),
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'DD-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...(this.appKey && { 'DD-APPLICATION-KEY': this.appKey }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Datadog API returned ${response.status}: ${errorText}`);
      }

      log.debug('Log sent to Datadog', { logId: logEntry.id });
    } catch (error) {
      log.error('Failed to send log to Datadog', error, { logId: logEntry.id });
      throw error;
    }
  }

  async sendBatch(logs: AuditLog[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    try {
      const payload = logs.map(logEntry => ({
        ddsource: 'coder-ide',
        ddtags: `env:production,category:${logEntry.category},severity:${logEntry.severity}`,
        hostname: 'coder-ide',
        service: 'audit-logging',
        message: this.transformLog(logEntry),
      }));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'DD-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...(this.appKey && { 'DD-APPLICATION-KEY': this.appKey }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Datadog API batch returned ${response.status}: ${errorText}`);
      }

      log.debug('Batch logs sent to Datadog', { count: logs.length });
    } catch (error) {
      log.error('Failed to send batch logs to Datadog', error, { count: logs.length });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Datadog doesn't have a dedicated health endpoint, so we'll validate the API key
      // by making a minimal request
      const testUrl = `https://api.${this.site}/api/v1/validate`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'DD-API-KEY': this.apiKey,
          ...(this.appKey && { 'DD-APPLICATION-KEY': this.appKey }),
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: `Datadog API validation failed: ${response.status} ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Datadog health check failed',
      };
    }
  }

  /**
   * Transform audit log to Datadog format
   */
  private transformLog(logEntry: AuditLog): Record<string, unknown> {
    return {
      timestamp: logEntry.timestamp.toISOString(),
      id: logEntry.id,
      tenantId: logEntry.tenantId,
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
    };
  }
}

