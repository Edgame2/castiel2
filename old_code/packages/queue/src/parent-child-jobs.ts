/**
 * Parent-Child Job Utilities
 * 
 * Provides utilities for managing parent-child job relationships
 * Useful for batch processing where a parent job tracks multiple child jobs
 */

import type { QueueProducerService } from './producers.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { generateCorrelationId } from './correlation-id.js';
import type { Redis, Cluster } from 'ioredis';

/**
 * Parent job metadata stored in Redis
 */
export interface ParentJobMetadata {
  parentJobId: string;
  correlationId: string;
  totalChildren: number;
  completedChildren: number;
  failedChildren: number;
  childJobIds: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial';
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Parent-Child Job Manager
 * 
 * Manages parent-child job relationships for batch operations
 */
export class ParentChildJobManager {
  private redis: Redis | Cluster;
  private parentJobPrefix = 'parent-job:';

  constructor(
    redis: Redis | Cluster,
    _queueProducer: QueueProducerService, // Reserved for future use
    private monitoring: IMonitoringProvider
  ) {
    this.redis = redis;
  }

  /**
   * Create a parent job and track its metadata
   */
  async createParentJob(
    totalChildren: number,
    correlationId?: string,
    metadata?: Record<string, any>
  ): Promise<ParentJobMetadata> {
    const parentJobId = `parent-${generateCorrelationId()}`;
    const parentCorrelationId = correlationId || generateCorrelationId();

    const parentMetadata: ParentJobMetadata = {
      parentJobId,
      correlationId: parentCorrelationId,
      totalChildren,
      completedChildren: 0,
      failedChildren: 0,
      childJobIds: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata,
    };

    // Store parent job metadata in Redis
    await this.redis.setex(
      `${this.parentJobPrefix}${parentJobId}`,
      7 * 24 * 3600, // 7 days
      JSON.stringify(parentMetadata)
    );

    this.monitoring.trackEvent('parent-job.created', {
      parentJobId,
      correlationId: parentCorrelationId,
      totalChildren,
    });

    return parentMetadata;
  }

  /**
   * Register a child job with a parent
   */
  async registerChildJob(
    parentJobId: string,
    childJobId: string
  ): Promise<void> {
    const key = `${this.parentJobPrefix}${parentJobId}`;
    const metadataJson = await this.redis.get(key);

    if (!metadataJson) {
      this.monitoring.trackEvent('parent-job.child-registration-failed', {
        parentJobId,
        childJobId,
        reason: 'parent-not-found',
      });
      return;
    }

    const metadata: ParentJobMetadata = JSON.parse(metadataJson);
    metadata.childJobIds.push(childJobId);
    metadata.status = 'in-progress';

    await this.redis.setex(key, 7 * 24 * 3600, JSON.stringify(metadata));

    this.monitoring.trackEvent('parent-job.child-registered', {
      parentJobId,
      childJobId,
      totalChildren: metadata.totalChildren,
      registeredChildren: metadata.childJobIds.length,
    });
  }

  /**
   * Mark a child job as completed
   */
  async markChildCompleted(
    parentJobId: string,
    childJobId: string
  ): Promise<ParentJobMetadata | null> {
    return this.updateChildStatus(parentJobId, childJobId, 'completed');
  }

  /**
   * Mark a child job as failed
   */
  async markChildFailed(
    parentJobId: string,
    childJobId: string
  ): Promise<ParentJobMetadata | null> {
    return this.updateChildStatus(parentJobId, childJobId, 'failed');
  }

  /**
   * Update child job status
   */
  private async updateChildStatus(
    parentJobId: string,
    childJobId: string,
    status: 'completed' | 'failed'
  ): Promise<ParentJobMetadata | null> {
    const key = `${this.parentJobPrefix}${parentJobId}`;
    const metadataJson = await this.redis.get(key);

    if (!metadataJson) {
      return null;
    }

    const metadata: ParentJobMetadata = JSON.parse(metadataJson);

    if (status === 'completed') {
      metadata.completedChildren++;
    } else {
      metadata.failedChildren++;
    }

    // Update parent status based on child completion
    const totalProcessed = metadata.completedChildren + metadata.failedChildren;
    if (totalProcessed >= metadata.totalChildren) {
      if (metadata.failedChildren === 0) {
        metadata.status = 'completed';
      } else if (metadata.completedChildren === 0) {
        metadata.status = 'failed';
      } else {
        metadata.status = 'partial';
      }
      metadata.completedAt = new Date().toISOString();
    }

    await this.redis.setex(key, 7 * 24 * 3600, JSON.stringify(metadata));

    this.monitoring.trackEvent('parent-job.child-updated', {
      parentJobId,
      childJobId,
      status,
      completedChildren: metadata.completedChildren,
      failedChildren: metadata.failedChildren,
      totalChildren: metadata.totalChildren,
      parentStatus: metadata.status,
    });

    return metadata;
  }

  /**
   * Get parent job metadata
   */
  async getParentJob(parentJobId: string): Promise<ParentJobMetadata | null> {
    const key = `${this.parentJobPrefix}${parentJobId}`;
    const metadataJson = await this.redis.get(key);

    if (!metadataJson) {
      return null;
    }

    return JSON.parse(metadataJson) as ParentJobMetadata;
  }

  /**
   * Get parent job status summary
   */
  async getParentJobStatus(parentJobId: string): Promise<{
    status: ParentJobMetadata['status'];
    progress: number; // 0-100
    completed: number;
    failed: number;
    total: number;
  } | null> {
    const metadata = await this.getParentJob(parentJobId);
    if (!metadata) {
      return null;
    }

    const totalProcessed = metadata.completedChildren + metadata.failedChildren;
    const progress = metadata.totalChildren > 0
      ? (totalProcessed / metadata.totalChildren) * 100
      : 0;

    return {
      status: metadata.status,
      progress: Math.round(progress),
      completed: metadata.completedChildren,
      failed: metadata.failedChildren,
      total: metadata.totalChildren,
    };
  }
}
