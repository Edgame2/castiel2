/**
 * Logging Service Client
 * 
 * Sends audit logs to the logging service via HTTP API
 */

import { loadConfig } from '../config';
import { log } from '../utils/logger';

interface CreateLogInput {
  action: string;
  message: string;
  category?: 'ACTION' | 'ACCESS' | 'SECURITY' | 'SYSTEM' | 'CUSTOM';
  severity?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

interface LoggingServiceResponse {
  data: {
    id: string;
    action: string;
    category: string;
    severity: string;
    message: string;
    timestamp: string;
  };
}

export class LoggingService {
  private baseUrl: string;
  private enabled: boolean;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.services?.logging?.url ?? '';
    this.enabled = !!config.services?.logging?.url;
  }

  /**
   * Generate a service JWT token for service-to-service authentication
   */
  private async generateServiceToken(): Promise<string | null> {
    try {
      // Try to get JWT secret from config
      const config = loadConfig();
      const jwtSecret = config.jwt?.secret || process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        log.warn('JWT secret not configured, cannot generate service token', { service: 'auth' });
        return null;
      }

      // Import jwt library
      const jwt = await import('jsonwebtoken');
      
      // Generate a service token (valid for 1 hour)
      const token = jwt.sign(
        {
          userId: 'auth-service', // Service identifier
          email: 'auth-service@coder.ide',
          service: 'auth-service',
          type: 'service',
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      return token;
    } catch (error: any) {
      log.warn('Failed to generate service token', { error, service: 'auth' });
      return null;
    }
  }

  /**
   * Create an audit log entry
   */
  async createLog(input: CreateLogInput, authToken?: string): Promise<void> {
    if (!this.enabled) {
      log.debug('Logging service not configured, skipping audit log', { action: input.action });
      return;
    }

    try {
      // Get authentication token (provided or generate service token)
      let token: string | undefined = authToken;
      if (!token) {
        token = (await this.generateServiceToken()) ?? undefined;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/api/v1/logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: input.action,
          message: input.message,
          category: input.category || 'SECURITY',
          severity: input.severity || 'INFO',
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          metadata: input.metadata,
          correlationId: input.correlationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.warn('Failed to create audit log', {
          error: new Error(errorText),
          action: input.action,
          status: response.status,
          service: 'auth',
        });
        return;
      }

      const result: LoggingServiceResponse = await response.json();
      log.debug('Audit log created', {
        logId: result.data.id,
        action: input.action,
        service: 'auth',
      });
    } catch (error: any) {
      // Don't throw - logging failures shouldn't break the main flow
      log.warn('Error creating audit log', {
        error,
        action: input.action,
        service: 'auth',
      });
    }
  }

  /**
   * Helper to create audit log from request context
   */
  async logFromRequest(
    request: any,
    action: string,
    message: string,
    options?: {
      category?: 'ACTION' | 'ACCESS' | 'SECURITY' | 'SYSTEM' | 'CUSTOM';
      severity?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const user = request.user;
    const correlationId = request.id || request.headers['x-request-id'];

    // Extract JWT token from request if available
    let authToken: string | undefined;
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    } else if ((request as any).cookies?.accessToken) {
      authToken = (request as any).cookies.accessToken;
    }

    await this.createLog({
      action,
      message,
      category: options?.category || 'SECURITY',
      severity: options?.severity || 'INFO',
      resourceType: options?.resourceType,
      resourceId: options?.resourceId || user?.id,
      metadata: {
        ...options?.metadata,
        userId: user?.id,
        organizationId: user?.organizationId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
      correlationId,
    }, authToken);
  }
}

// Singleton instance
let loggingServiceInstance: LoggingService | null = null;

export function getLoggingService(): LoggingService {
  if (!loggingServiceInstance) {
    loggingServiceInstance = new LoggingService();
  }
  return loggingServiceInstance;
}

