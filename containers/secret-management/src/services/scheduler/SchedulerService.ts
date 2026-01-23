/**
 * Scheduler Service
 * 
 * Handles scheduled tasks for secret management:
 * - Expiration checks
 * - Rotation due checks
 * - Permanent deletion of expired soft-deletes
 */

import { ExpirationManager } from '../lifecycle/ExpirationManager';
import { RotationManager } from '../lifecycle/RotationManager';
import { SoftDeleteManager } from '../lifecycle/SoftDeleteManager';
import { getLoggingClient } from '../logging/LoggingClient';

export class SchedulerService {
  private expirationManager: ExpirationManager;
  private rotationManager: RotationManager;
  private softDeleteManager: SoftDeleteManager;
  private intervals: NodeJS.Timeout[] = [];
  
  constructor() {
    this.expirationManager = new ExpirationManager();
    this.rotationManager = new RotationManager();
    this.softDeleteManager = new SoftDeleteManager();
  }
  
  /**
   * Start all scheduled tasks
   */
  start(): void {
    // Check expirations every hour
    this.intervals.push(
      setInterval(async () => {
        try {
          await this.expirationManager.checkExpirations();
        } catch (error: any) {
          await getLoggingClient().sendLog({
            level: 'error',
            message: 'Expiration check failed',
            service: 'secret-management',
            metadata: {
              error: error.message,
            },
          });
        }
      }, 60 * 60 * 1000) // 1 hour
    );
    
    // Check rotation due every 6 hours
    this.intervals.push(
      setInterval(async () => {
        try {
          await this.rotationManager.checkRotationDue();
        } catch (error: any) {
          await getLoggingClient().sendLog({
            level: 'error',
            message: 'Rotation due check failed',
            service: 'secret-management',
            metadata: {
              error: error.message,
            },
          });
        }
      }, 6 * 60 * 60 * 1000) // 6 hours
    );
    
    // Permanently delete expired soft-deletes daily
    this.intervals.push(
      setInterval(async () => {
        try {
          const deleted = await this.softDeleteManager.permanentlyDeleteExpired();
          if (deleted > 0) {
            await getLoggingClient().sendLog({
              level: 'info',
              message: 'Permanently deleted expired secrets',
              service: 'secret-management',
              metadata: {
                count: deleted,
              },
            });
          }
        } catch (error: any) {
          await getLoggingClient().sendLog({
            level: 'error',
            message: 'Permanent deletion failed',
            service: 'secret-management',
            metadata: {
              error: error.message,
            },
          });
        }
      }, 24 * 60 * 60 * 1000) // 24 hours
    );
    
    console.log('Scheduler service started');
  }
  
  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    console.log('Scheduler service stopped');
  }
}
