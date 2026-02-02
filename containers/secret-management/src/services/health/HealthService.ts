/**
 * Health Service
 * 
 * Provides health check functionality for the Secret Management Service.
 */

import { getDatabaseClient } from '@coder/shared';
import { KeyManager } from '../encryption/KeyManager';
import { getLoggingClient } from '../logging/LoggingClient';
import { getConfig } from '../../config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
    encryption: {
      status: 'healthy' | 'unhealthy';
      activeKeyId?: string;
    };
    logging: {
      status: 'healthy' | 'unhealthy';
      serviceUrl?: string;
    };
  };
}

export class HealthService {
  /**
   * Perform health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      database: { status: 'unhealthy' },
      encryption: { status: 'unhealthy' },
      logging: { status: 'unhealthy' },
    };
    
    // Check database
    try {
      const startTime = Date.now();
      const db = getDatabaseClient() as any;
      await db.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      checks.database = { status: 'unhealthy' };
    }
    
    // Check encryption
    try {
      const keyManager = new KeyManager();
      const activeKey = await keyManager.getActiveKey();
      checks.encryption = {
        status: 'healthy',
        activeKeyId: activeKey.keyId,
      };
    } catch (error: any) {
      checks.encryption = { status: 'unhealthy' };
    }
    
    // Check logging service
    try {
      const config = getConfig();
      void getLoggingClient();
      const serviceUrl = config.services.logging?.url || config.logging.serviceUrl;
      checks.logging = {
        status: 'healthy',
        serviceUrl: serviceUrl,
      };
    } catch (error: any) {
      checks.logging = { status: 'unhealthy' };
    }
    
    // Determine overall status
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');
    
    const status: HealthStatus['status'] = allHealthy
      ? 'healthy'
      : anyUnhealthy
      ? 'unhealthy'
      : 'degraded';
    
    return {
      status,
      timestamp: new Date(),
      checks,
    };
  }
}
