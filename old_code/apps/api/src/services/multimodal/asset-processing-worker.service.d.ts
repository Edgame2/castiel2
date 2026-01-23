/**
 * Multi-Modal Asset Processing Worker
 * Background worker that automatically processes pending multi-modal assets
 */
import { Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { MultimodalAssetService } from '../multimodal-asset.service.js';
export interface AssetProcessingWorkerConfig {
    pollIntervalMs?: number;
    maxConcurrentJobs?: number;
    maxJobDurationMs?: number;
    batchSize?: number;
}
/**
 * Background worker for processing multi-modal assets
 */
export declare class AssetProcessingWorker {
    private container;
    private assetService;
    private monitoring;
    private isRunning;
    private pollInterval;
    private activeJobs;
    private readonly pollIntervalMs;
    private readonly maxConcurrentJobs;
    private readonly maxJobDurationMs;
    private readonly batchSize;
    constructor(container: Container, assetService: MultimodalAssetService, monitoring: IMonitoringProvider, config?: AssetProcessingWorkerConfig);
    /**
     * Start the background worker
     */
    start(): void;
    /**
     * Stop the background worker
     */
    stop(): void;
    /**
     * Check if the worker is running
     */
    getIsRunning(): boolean;
    /**
     * Get current stats
     */
    getStats(): {
        isRunning: boolean;
        activeJobs: number;
    };
    /**
     * Poll for pending assets
     */
    private poll;
    /**
     * Process all pending assets
     */
    private processPendingAssets;
    /**
     * Find pending assets to process
     */
    private findPendingAssets;
    /**
     * Process a single asset
     */
    private processAsset;
}
//# sourceMappingURL=asset-processing-worker.service.d.ts.map