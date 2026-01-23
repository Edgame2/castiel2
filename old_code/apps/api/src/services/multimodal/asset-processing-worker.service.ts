// @ts-nocheck
/**
 * Multi-Modal Asset Processing Worker
 * Background worker that automatically processes pending multi-modal assets
 */

import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { MultimodalAssetService } from '../multimodal-asset.service.js';
import { MultimodalAsset, ProcessingStatus } from '../../types/multimodal-asset.types.js';

export interface AssetProcessingWorkerConfig {
  pollIntervalMs?: number; // Default: 10000 (10 seconds)
  maxConcurrentJobs?: number; // Default: 3
  maxJobDurationMs?: number; // Default: 300000 (5 minutes)
  batchSize?: number; // Default: 10
}

/**
 * Background worker for processing multi-modal assets
 */
export class AssetProcessingWorker {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeJobs: Map<string, Promise<void>> = new Map();

  private readonly pollIntervalMs: number;
  private readonly maxConcurrentJobs: number;
  private readonly maxJobDurationMs: number;
  private readonly batchSize: number;

  constructor(
    private container: Container,
    private assetService: MultimodalAssetService,
    private monitoring: IMonitoringProvider,
    config: AssetProcessingWorkerConfig = {}
  ) {
    this.pollIntervalMs = config.pollIntervalMs || 10000;
    this.maxConcurrentJobs = config.maxConcurrentJobs || 3;
    this.maxJobDurationMs = config.maxJobDurationMs || 300000; // 5 minutes
    this.batchSize = config.batchSize || 10;
  }

  /**
   * Start the background worker
   */
  public start(): void {
    if (this.isRunning) {
      this.monitoring.trackEvent('asset_processing_worker.already_running');
      return;
    }

    this.isRunning = true;
    this.monitoring.trackEvent('asset_processing_worker.started', {
      pollIntervalMs: this.pollIntervalMs,
      maxConcurrentJobs: this.maxConcurrentJobs,
    });

    // Start polling immediately
    this.poll();
  }

  /**
   * Stop the background worker
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    this.monitoring.trackEvent('asset_processing_worker.stopped', {
      activeJobs: this.activeJobs.size,
    });
  }

  /**
   * Check if the worker is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current stats
   */
  public getStats(): {
    isRunning: boolean;
    activeJobs: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
    };
  }

  /**
   * Poll for pending assets
   */
  private poll(): void {
    if (!this.isRunning) {
      return;
    }

    this.processPendingAssets()
      .catch((err) => {
        this.monitoring.trackException(err as Error, {
          operation: 'asset_processing_worker.poll',
        });
      })
      .finally(() => {
        // Schedule next poll
        this.pollInterval = setTimeout(() => {
          this.poll();
        }, this.pollIntervalMs);
      });
  }

  /**
   * Process all pending assets
   */
  private async processPendingAssets(): Promise<void> {
    // Skip if we're at max concurrent jobs
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    try {
      // Find pending assets
      const pendingAssets = await this.findPendingAssets();

      for (const asset of pendingAssets) {
        // Skip if already being processed
        if (this.activeJobs.has(asset.id)) {
          continue;
        }

        // Skip if we're at max concurrent jobs
        if (this.activeJobs.size >= this.maxConcurrentJobs) {
          break;
        }

        // Start processing this asset
        const jobPromise = this.processAsset(asset)
          .catch((err) => {
            this.monitoring.trackException(err as Error, {
              operation: 'asset_processing_worker.processAsset',
              assetId: asset.id,
            });
          })
          .finally(() => {
            this.activeJobs.delete(asset.id);
          });

        this.activeJobs.set(asset.id, jobPromise);
      }

      if (pendingAssets.length > 0) {
        this.monitoring.trackMetric('asset_processing_worker.pending_assets_found', pendingAssets.length);
      }
    } catch (err) {
      this.monitoring.trackException(err as Error, {
        operation: 'asset_processing_worker.processPendingAssets',
      });
    }
  }

  /**
   * Find pending assets to process
   */
  private async findPendingAssets(): Promise<MultimodalAsset[]> {
    try {
      // Query for assets with pending status
      const query = `
        SELECT * FROM c 
        WHERE c.type = "multimodal_asset" 
        AND c.processingStatus = "pending"
        ORDER BY c.uploadedAt ASC
      `;

      const { resources } = await this.container.items
        .query<MultimodalAsset>({
          query,
          maxItemCount: this.batchSize,
        })
        .fetchNext();

      return resources || [];
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'asset_processing_worker.findPendingAssets',
      });
      return [];
    }
  }

  /**
   * Process a single asset
   */
  private async processAsset(asset: MultimodalAsset): Promise<void> {
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      this.monitoring.trackEvent('asset_processing_worker.job_timeout', {
        assetId: asset.id,
        assetType: asset.assetType,
        tenantId: asset.tenantId,
        durationMs: Date.now() - startTime,
      });
    }, this.maxJobDurationMs);

    try {
      this.monitoring.trackEvent('asset_processing_worker.job_started', {
        assetId: asset.id,
        assetType: asset.assetType,
        tenantId: asset.tenantId,
      });

      // Process the asset
      await this.assetService.processAsset(asset.id, asset.tenantId);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('asset_processing_worker.job_duration_ms', duration, {
        assetType: asset.assetType,
        tenantId: asset.tenantId,
      });

      this.monitoring.trackEvent('asset_processing_worker.job_completed', {
        assetId: asset.id,
        assetType: asset.assetType,
        tenantId: asset.tenantId,
        durationMs: duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error, {
        operation: 'asset_processing_worker.processAsset',
        assetId: asset.id,
        assetType: asset.assetType,
        tenantId: asset.tenantId,
        durationMs: duration,
      });

      this.monitoring.trackEvent('asset_processing_worker.job_failed', {
        assetId: asset.id,
        assetType: asset.assetType,
        tenantId: asset.tenantId,
        error: error.message,
        durationMs: duration,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}









