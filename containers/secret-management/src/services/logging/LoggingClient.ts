/**
 * Logging Client Service
 * 
 * HTTP client for sending application logs to the Logging Service.
 * Used for operational monitoring alongside audit logs.
 */

/**
 * Logging Service configuration
 */
import { getConfig } from '../../config';
const SERVICE_NAME = 'secret-management';

/**
 * Log entry interface
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  metadata?: {
    userId?: string;
    organizationId?: string;
    secretId?: string;
    secretName?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Logging Client
 */
export class LoggingClient {
  private baseUrl: string;
  private serviceName: string;
  private enabled: boolean;

  constructor() {
    const config = getConfig();
    this.baseUrl =
      config.logging?.serviceUrl ??
      config.services?.logging?.url ??
      process.env.LOGGING_SERVICE_URL ??
      '';
    this.serviceName = SERVICE_NAME;
    // Only enable if logging service URL is configured
    this.enabled = !!this.baseUrl || process.env.NODE_ENV === 'production';
  }

  /**
   * Send log entry to Logging Service (non-blocking)
   */
  async sendLog(entry: LogEntry): Promise<void> {
    // Don't send if disabled
    if (!this.enabled) {
      return;
    }

    // Don't block on logging - fire and forget
    setImmediate(async () => {
      try {
        const url = `${this.baseUrl}/api/logs`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            level: entry.level,
            message: entry.message,
            service: entry.service || this.serviceName,
            metadata: entry.metadata || {},
          }),
        });

        if (!response.ok) {
          // Log error but don't throw - logging failures shouldn't break the application
          console.warn('Failed to send log to Logging Service', {
            status: response.status,
            level: entry.level,
            service: 'loggingClient',
          });
        }
      } catch (error: any) {
        // Log error but don't throw - logging failures shouldn't break the application
        console.warn('Error sending log to Logging Service', {
          error: error.message,
          level: entry.level,
          service: 'loggingClient',
        });
      }
    });
  }

  /**
   * Send multiple log entries in batch (non-blocking)
   */
  async sendLogs(entries: LogEntry[]): Promise<void> {
    if (!this.enabled || entries.length === 0) {
      return;
    }

    // Don't block on logging - fire and forget
    setImmediate(async () => {
      try {
        const url = `${this.baseUrl}/api/logs`;
        
        // Send logs one by one (logging service may not support batch)
        for (const entry of entries) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                level: entry.level,
                message: entry.message,
                service: entry.service || this.serviceName,
                metadata: entry.metadata || {},
              }),
            });

            if (!response.ok) {
              console.warn('Failed to send log to Logging Service', {
                status: response.status,
                level: entry.level,
                service: 'loggingClient',
              });
            }
          } catch (error: any) {
            console.warn('Error sending log to Logging Service', {
              error: error.message,
              level: entry.level,
              service: 'loggingClient',
            });
          }
        }
      } catch (error: any) {
        console.warn('Error sending logs to Logging Service', {
          error: error.message,
          count: entries.length,
          service: 'loggingClient',
        });
      }
    });
  }
}

// Singleton instance
let loggingClientInstance: LoggingClient | null = null;

/**
 * Get the Logging Client instance
 */
export function getLoggingClient(): LoggingClient {
  if (!loggingClientInstance) {
    loggingClientInstance = new LoggingClient();
  }
  return loggingClientInstance;
}
