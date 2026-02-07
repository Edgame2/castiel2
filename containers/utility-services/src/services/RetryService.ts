/**
 * Retry Service
 * 
 * Handles retry logic with exponential backoff
 * Will be fully implemented in Phase 4
 */

import { NotificationCriticality } from '../types/notification';
import { getConfig } from '../config/index.js';

export class RetryService {
  private config = getConfig();

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number, criticality: NotificationCriticality): number {
    const baseDelay = this.config.notification?.defaults?.retry_delay_ms || 1000;
    const maxDelay = this.config.notification?.defaults?.max_retry_delay_ms || 30000;
    
    // Critical notifications retry faster
    const multiplier = criticality === 'CRITICAL' ? 1.5 : 2;
    
    const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
    
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    
    return Math.floor(delay + jitter);
  }

  /**
   * Check if should retry based on attempt count and criticality
   */
  shouldRetry(attempt: number, criticality: NotificationCriticality): boolean {
    const maxAttempts = this.config.notification?.defaults?.retry_attempts || 3;
    
    // Critical notifications get more retries
    const adjustedMaxAttempts = criticality === 'CRITICAL' 
      ? maxAttempts * 2 
      : criticality === 'HIGH'
      ? Math.floor(maxAttempts * 1.5)
      : maxAttempts;
    
    return attempt < adjustedMaxAttempts;
  }
}

