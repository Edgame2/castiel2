/**
 * SIEM Provider Interface
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import { AuditLog } from '../../../types';

/**
 * SIEM provider interface for exporting audit logs to external SIEM systems.
 * Supports Splunk, Datadog, and generic webhook integrations.
 */
export interface ISIEMProvider {
  /**
   * Send a single log entry to SIEM
   * @param log - Audit log entry to send
   */
  sendLog(log: AuditLog): Promise<void>;
  
  /**
   * Send multiple log entries to SIEM (batch)
   * @param logs - Array of audit log entries
   */
  sendBatch(logs: AuditLog[]): Promise<void>;
  
  /**
   * Check if SIEM provider is accessible
   */
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
}

/**
 * SIEM provider configuration
 */
export interface SIEMProviderConfig {
  provider: 'splunk' | 'datadog' | 'webhook';
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  splunk?: {
    url: string;
    token: string;
    index?: string;
    source?: string;
  };
  datadog?: {
    apiKey: string;
    appKey?: string;
    site?: string; // e.g., 'datadoghq.com', 'us3.datadoghq.com'
  };
}

