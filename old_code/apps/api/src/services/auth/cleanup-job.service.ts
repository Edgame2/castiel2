import type { SessionService } from './session.service.js';
import type { TokenService } from './token.service.js';
import type { TokenBlacklistService } from './token-blacklist.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Cleanup Job Service
 * Handles periodic cleanup of expired sessions, tokens, and blacklist entries
 */
export class CleanupJobService {
  private sessionService: SessionService;
  private tokenService: TokenService;
  private blacklistService: TokenBlacklistService;
  private monitoring?: IMonitoringProvider;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    sessionService: SessionService,
    tokenService: TokenService,
    blacklistService: TokenBlacklistService,
    monitoring?: IMonitoringProvider
  ) {
    this.sessionService = sessionService;
    this.tokenService = tokenService;
    this.blacklistService = blacklistService;
    this.monitoring = monitoring;
  }

  /**
   * Start the cleanup job
   * Runs periodically based on interval
   */
  start(intervalMs: number = 60 * 60 * 1000): void { // Default: 1 hour
    if (this.isRunning) {
      this.monitoring?.trackEvent('cleanup-job.already-running');
      return;
    }

    this.monitoring?.trackEvent('cleanup-job.started', { intervalMs });
    this.isRunning = true;

    // Run immediately on start
    this.runCleanup().catch((error) => {
      this.monitoring?.trackException(error as Error, { operation: 'cleanup-job.initial-cleanup' });
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runCleanup().catch((error) => {
        this.monitoring?.trackException(error as Error, { operation: 'cleanup-job.scheduled-cleanup' });
      });
    }, intervalMs);
  }

  /**
   * Stop the cleanup job
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.monitoring?.trackEvent('cleanup-job.stopped');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run cleanup tasks
   */
  private async runCleanup(): Promise<void> {
    this.monitoring?.trackEvent('cleanup-job.run-started');
    const startTime = Date.now();

    try {
      // Cleanup expired tokens
      const tokensDeleted = await this.tokenService.cleanupExpiredTokens();
      this.monitoring?.trackEvent('cleanup-job.tokens-deleted', { count: tokensDeleted });

      // Cleanup expired blacklist entries
      const blacklistDeleted = await this.blacklistService.cleanupExpiredEntries();
      this.monitoring?.trackEvent('cleanup-job.blacklist-deleted', { count: blacklistDeleted });

      // Note: Session cleanup is handled by Redis TTL automatically
      // But we can still run a manual check for orphaned sessions
      // This requires tenant IDs - in production, you'd iterate through active tenants

      const duration = Date.now() - startTime;
      this.monitoring?.trackEvent('cleanup-job.completed', { durationMs: duration });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'cleanup-job.run-cleanup' });
      throw error;
    }
  }

  /**
   * Cleanup sessions for a specific tenant
   * Should be called periodically for each active tenant
   */
  async cleanupTenantSessions(tenantId: string): Promise<number> {
    return this.sessionService.cleanupOrphanedSessions(tenantId);
  }

  /**
   * Get cleanup job status
   */
  getStatus(): {
    isRunning: boolean;
    hasInterval: boolean;
  } {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null,
    };
  }

  /**
   * Run a manual cleanup
   */
  async runManualCleanup(): Promise<{
    tokensDeleted: number;
    blacklistDeleted: number;
  }> {
    const tokensDeleted = await this.tokenService.cleanupExpiredTokens();
    const blacklistDeleted = await this.blacklistService.cleanupExpiredEntries();

    return {
      tokensDeleted,
      blacklistDeleted,
    };
  }
}
