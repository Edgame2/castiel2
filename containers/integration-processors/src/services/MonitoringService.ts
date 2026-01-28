/**
 * Monitoring Service
 * Provides system monitoring data for admin dashboard
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { rabbitmqQueueDepth, rabbitmqDlqDepth } from '../metrics';

export interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    rabbitmq: { status: string; latency?: number };
    shardManager: { status: string; latency?: number };
    processors: { status: string; activeInstances: number };
    blobStorage: { status: string; availability?: number };
  };
  timestamp: Date;
}

export interface QueueMetrics {
  name: string;
  depth: number;
  throughput: number; // messages/second
  errorRate: number;
  avgProcessingTime: number;
  oldestMessage: Date | null;
}

export interface ProcessorStatus {
  type: 'light' | 'heavy';
  instanceId: string;
  cpuUsage: number;
  memoryUsage: number;
  messagesProcessed: number;
  errorCount: number;
  uptime: number;
  status: 'running' | 'starting' | 'stopping' | 'error';
}

export interface IntegrationHealth {
  tenantId: string;
  tenantName?: string;
  integrationId: string;
  integrationType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastSync: Date | null;
  successRate: number;
  errorCount: number;
}

export interface ErrorAnalytics {
  errorType: string;
  count: number;
  affectedTenants: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  topAffectedIntegrations: string[];
}

export interface PerformanceMetrics {
  avgProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  throughput: number; // messages/second
  successRate: number;
  byProcessorType: {
    light: { avgTime: number; throughput: number };
    heavy: { avgTime: number; throughput: number };
  };
}

export class MonitoringService {
  private config: ReturnType<typeof loadConfig>;
  private shardManager: ServiceClient;
  private integrationManager: ServiceClient;
  private instanceId: string;
  private consumerType: string;
  private startTime: Date;
  private messageCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private processingTimes: number[] = [];

  constructor(
    shardManager: ServiceClient,
    integrationManager: ServiceClient,
    consumerType: string
  ) {
    this.config = loadConfig();
    this.shardManager = shardManager;
    this.integrationManager = integrationManager;
    this.instanceId = `${process.pid}-${Date.now()}`;
    this.consumerType = consumerType;
    this.startTime = new Date();
  }

  /**
   * Record message processed
   */
  recordMessageProcessed(queue: string, processingTime: number): void {
    const current = this.messageCounts.get(queue) || 0;
    this.messageCounts.set(queue, current + 1);
    this.processingTimes.push(processingTime);
    // Keep only last 1000 processing times for metrics
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }
  }

  /**
   * Record error
   */
  recordError(errorType: string): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealthData> {
    const components: SystemHealthData['components'] = {
      rabbitmq: { status: 'unknown' },
      shardManager: { status: 'unknown' },
      processors: { status: 'unknown', activeInstances: 0 },
      blobStorage: { status: 'unknown' },
    };

    // Check RabbitMQ
    if (this.config.rabbitmq?.url) {
      try {
        const start = Date.now();
        const amqp = await import('amqplib');
        const connection = await amqp.connect(this.config.rabbitmq.url);
        await connection.close();
        components.rabbitmq = {
          status: 'healthy',
          latency: Date.now() - start,
        };
      } catch (error) {
        components.rabbitmq = { status: 'unhealthy' };
      }
    } else {
      components.rabbitmq = { status: 'not_configured' };
    }

    // Check Shard Manager
    try {
      const start = Date.now();
      await this.shardManager.get('/health');
      components.shardManager = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      components.shardManager = { status: 'unhealthy' };
    }

    // Check processors (this instance)
    const uptime = Date.now() - this.startTime.getTime();
    components.processors = {
      status: 'running',
      activeInstances: 1, // Single instance for now
    };

    // Check Blob Storage (optional)
    if (this.config.azure?.blob_storage?.connection_string) {
      components.blobStorage = { status: 'configured', availability: 100 };
    } else {
      components.blobStorage = { status: 'not_configured' };
    }

    // Determine overall status
    const healthyComponents = Object.values(components).filter(
      (c) => c.status === 'healthy' || c.status === 'configured' || c.status === 'running'
    ).length;
    const totalComponents = Object.keys(components).length;
    const healthRatio = healthyComponents / totalComponents;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthRatio >= 0.9) {
      status = 'healthy';
    } else if (healthRatio >= 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      components,
      timestamp: new Date(),
    };
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<QueueMetrics[]> {
    const queues: QueueMetrics[] = [];

    if (!this.config.rabbitmq?.url) {
      return queues;
    }

    try {
      const amqp = await import('amqplib');
      const connection = await amqp.connect(this.config.rabbitmq.url);
      const channel = await connection.createChannel();

      // Queue names to check (including DLQ)
      const queueNames = [
        'integration_data_raw',
        'integration_data_raw.dlq',
        'integration_documents',
        'integration_communications',
        'integration_meetings',
        'integration_events',
        'shard_ml_aggregation',
      ];

      for (const queueName of queueNames) {
        try {
          const queueInfo = await channel.checkQueue(queueName);
          const messageCount = this.messageCounts.get(queueName) || 0;
          const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
          const throughput = uptimeSeconds > 0 ? messageCount / uptimeSeconds : 0;

          const depth = queueInfo.messageCount || 0;
          
          // Update Prometheus gauge
          rabbitmqQueueDepth.set({ queue_name: queueName }, depth);
          
          queues.push({
            name: queueName,
            depth,
            throughput,
            errorRate: 0, // Would need to track errors per queue
            avgProcessingTime: this.calculateAvgProcessingTime(),
            oldestMessage: null, // Would need to track message timestamps
          });
        } catch (error) {
          // Queue might not exist yet
          log.debug(`Queue ${queueName} not found`, { service: 'integration-processors' });
        }
      }

      await channel.close();
      await connection.close();
    } catch (error) {
      log.error('Failed to get queue metrics', error, { service: 'integration-processors' });
    }

    return queues;
  }

  /**
   * Get processor status
   */
  getProcessorStatus(): ProcessorStatus[] {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = (Date.now() - this.startTime.getTime()) / 1000; // seconds

    const totalMessages = Array.from(this.messageCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);

    return [
      {
        type: this.consumerType === 'heavy' ? 'heavy' : 'light',
        instanceId: this.instanceId,
        cpuUsage: 0, // Would need actual CPU monitoring
        memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
        messagesProcessed: totalMessages,
        errorCount: totalErrors,
        uptime,
        status: 'running',
      },
    ];
  }

  /**
   * Get integration health across tenants
   */
  async getIntegrationHealth(options?: {
    status?: string;
    limit?: number;
  }): Promise<IntegrationHealth[]> {
    try {
      // Query integration manager for integration health
      // This would require an endpoint in integration-manager
      // For now, return empty array
      return [];
    } catch (error) {
      log.error('Failed to get integration health', error, { service: 'integration-processors' });
      return [];
    }
  }

  /**
   * Get error analytics
   */
  getErrorAnalytics(options?: {
    timeRange?: string;
    groupBy?: string;
  }): {
    errors: ErrorAnalytics[];
    totalErrors: number;
    errorRate: number;
  } {
    const errors: ErrorAnalytics[] = [];
    let totalErrors = 0;

    for (const [errorType, count] of this.errorCounts.entries()) {
      totalErrors += count;
      errors.push({
        errorType,
        count,
        affectedTenants: 1, // Simplified - would need tenant tracking
        firstOccurrence: this.startTime,
        lastOccurrence: new Date(),
        topAffectedIntegrations: [], // Would need integration tracking
      });
    }

    const totalMessages = Array.from(this.messageCounts.values()).reduce((a, b) => a + b, 0);
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;

    return {
      errors: errors.sort((a, b) => b.count - a.count),
      totalErrors,
      errorRate,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const processingTimes = this.processingTimes.sort((a, b) => a - b);
    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p99Index = Math.floor(processingTimes.length * 0.99);
    const p95ProcessingTime = processingTimes[p95Index] || 0;
    const p99ProcessingTime = processingTimes[p99Index] || 0;

    const totalMessages = Array.from(this.messageCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    const throughput = uptimeSeconds > 0 ? totalMessages / uptimeSeconds : 0;
    const successRate = totalMessages > 0 ? (totalMessages - totalErrors) / totalMessages : 1;

    return {
      avgProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      throughput,
      successRate,
      byProcessorType: {
        light: {
          avgTime: this.consumerType === 'light' || this.consumerType === 'all' ? avgProcessingTime : 0,
          throughput: this.consumerType === 'light' || this.consumerType === 'all' ? throughput : 0,
        },
        heavy: {
          avgTime: this.consumerType === 'heavy' || this.consumerType === 'all' ? avgProcessingTime : 0,
          throughput: this.consumerType === 'heavy' || this.consumerType === 'all' ? throughput : 0,
        },
      },
    };
  }

  /**
   * Calculate average processing time
   */
  private calculateAvgProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 0;
    }
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Get DLQ metrics
   */
  async getDLQMetrics(): Promise<{
    queueName: string;
    depth: number;
    alertThreshold: number;
    status: 'healthy' | 'warning' | 'critical';
    oldestMessage?: Date | null;
  }> {
    if (!this.config.rabbitmq?.url) {
      return {
        queueName: 'integration_data_raw.dlq',
        depth: 0,
        alertThreshold: this.config.rabbitmq?.dlq?.alert_threshold || 100,
        status: 'healthy',
      };
    }

    try {
      const amqp = await import('amqplib');
      const connection = await amqp.connect(this.config.rabbitmq.url);
      const channel = await connection.createChannel();

      const dlqName = 'integration_data_raw.dlq';
      let depth = 0;
      let oldestMessage: Date | null = null;

      try {
        const queueInfo = await channel.checkQueue(dlqName);
        depth = queueInfo.messageCount || 0;

        // Try to get oldest message (peek without consuming)
        if (depth > 0) {
          const msg = await channel.get(dlqName, { noAck: false });
          if (msg) {
            const timestamp = msg.properties.timestamp;
            if (timestamp) {
              oldestMessage = new Date(timestamp * 1000);
            }
            // Reject to put it back
            channel.nack(msg, false, true);
          }
        }
      } catch (error) {
        // DLQ might not exist yet
        log.debug(`DLQ ${dlqName} not found`, { service: 'integration-processors' });
      }

      await channel.close();
      await connection.close();

      const alertThreshold = this.config.rabbitmq?.dlq?.alert_threshold || 100;
      let status: 'healthy' | 'warning' | 'critical';
      if (depth >= alertThreshold) {
        status = 'critical';
      } else if (depth >= alertThreshold * 0.5) {
        status = 'warning';
      } else {
        status = 'healthy';
      }

      // Update Prometheus gauge
      rabbitmqDlqDepth.set({ queue_name: dlqName }, depth);

      return {
        queueName: dlqName,
        depth,
        alertThreshold,
        status,
        oldestMessage,
      };
    } catch (error) {
      log.error('Failed to get DLQ metrics', error, { service: 'integration-processors' });
      return {
        queueName: 'integration_data_raw.dlq',
        depth: 0,
        alertThreshold: this.config.rabbitmq?.dlq?.alert_threshold || 100,
        status: 'healthy',
      };
    }
  }
}
