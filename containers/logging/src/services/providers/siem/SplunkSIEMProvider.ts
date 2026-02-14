/**
 * Splunk SIEM Provider
 * Sends audit logs to Splunk via HTTP Event Collector (HEC)
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { ISIEMProvider, SIEMProviderConfig } from './ISIEMProvider';
import { AuditLog } from '../../../types';
import { log } from '../../../utils/logger';

/**
 * Splunk SIEM Provider
 * Sends audit logs to Splunk HTTP Event Collector
 */
export class SplunkSIEMProvider implements ISIEMProvider {
  private url: string;
  private token: string;
  private index: string;
  private source: string;

  constructor(config: SIEMProviderConfig) {
    if (!config.splunk?.url || !config.splunk?.token) {
      throw new Error('Splunk SIEM provider requires URL and token configuration');
    }

    this.url = config.splunk.url.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.splunk.token;
    this.index = config.splunk.index || 'audit';
    this.source = config.splunk.source || 'coder-audit-logs';

    log.info('Splunk SIEM Provider initialized', { url: this.url, index: this.index });
  }

  async sendLog(logEntry: AuditLog): Promise<void> {
    try {
      const hecUrl = `${this.url}/services/collector/event`;
      const payload = {
        time: Math.floor(logEntry.timestamp.getTime() / 1000), // Unix timestamp
        host: 'coder-ide',
        source: this.source,
        sourcetype: 'audit_log',
        index: this.index,
        event: this.transformLog(logEntry),
      };

      const response = await fetch(hecUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Splunk HEC returned ${response.status}: ${errorText}`);
      }

      log.debug('Log sent to Splunk', { logId: logEntry.id });
    } catch (error) {
      log.error('Failed to send log to Splunk', error, { logId: logEntry.id });
      throw error;
    }
  }

  async sendBatch(logs: AuditLog[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    try {
      const hecUrl = `${this.url}/services/collector/event`;
      const payload = logs.map(logEntry => ({
        time: Math.floor(logEntry.timestamp.getTime() / 1000),
        host: 'coder-ide',
        source: this.source,
        sourcetype: 'audit_log',
        index: this.index,
        event: this.transformLog(logEntry),
      }));

      const response = await fetch(hecUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Splunk HEC batch returned ${response.status}: ${errorText}`);
      }

      log.debug('Batch logs sent to Splunk', { count: logs.length });
    } catch (error) {
      log.error('Failed to send batch logs to Splunk', error, { count: logs.length });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Splunk HEC health check endpoint
      const healthUrl = `${this.url}/services/collector/health`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Splunk ${this.token}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: `Splunk health check failed: ${response.status} ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Splunk health check failed',
      };
    }
  }

  /**
   * Transform audit log to Splunk format
   */
  private transformLog(logEntry: AuditLog): Record<string, unknown> {
    return {
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

