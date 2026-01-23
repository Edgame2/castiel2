import type { SessionService } from './session.service.js';
import type { TokenService } from './token.service.js';
import type { TokenBlacklistService } from './token-blacklist.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Cleanup Job Service
 * Handles periodic cleanup of expired sessions, tokens, and blacklist entries
 */
export declare class CleanupJobService {
    private sessionService;
    private tokenService;
    private blacklistService;
    private monitoring?;
    private intervalId;
    private isRunning;
    constructor(sessionService: SessionService, tokenService: TokenService, blacklistService: TokenBlacklistService, monitoring?: IMonitoringProvider);
    /**
     * Start the cleanup job
     * Runs periodically based on interval
     */
    start(intervalMs?: number): void;
    /**
     * Stop the cleanup job
     */
    stop(): void;
    /**
     * Run cleanup tasks
     */
    private runCleanup;
    /**
     * Cleanup sessions for a specific tenant
     * Should be called periodically for each active tenant
     */
    cleanupTenantSessions(tenantId: string): Promise<number>;
    /**
     * Get cleanup job status
     */
    getStatus(): {
        isRunning: boolean;
        hasInterval: boolean;
    };
    /**
     * Run a manual cleanup
     */
    runManualCleanup(): Promise<{
        tokensDeleted: number;
        blacklistDeleted: number;
    }>;
}
//# sourceMappingURL=cleanup-job.service.d.ts.map