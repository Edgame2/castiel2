/**
 * Deduplication Service
 * 
 * Prevents duplicate notification delivery
 * Will be fully implemented in Phase 4 with Redis
 */

import { getConfig } from '../config/index.js';

export class DeduplicationService {
  private config = getConfig();
  private memoryCache: Map<string, number> = new Map();

  /**
   * Check if notification is duplicate
   */
  async isDuplicate(deduplicationKey: string): Promise<boolean> {
    if (!deduplicationKey) {
      return false;
    }

    // Redis-based deduplication in Phase 4; in-memory until then
    const ttl = (this.config.notification?.defaults?.deduplication_ttl_seconds ?? 3600) * 1000;
    const cached = this.memoryCache.get(deduplicationKey);
    
    if (cached && cached > Date.now()) {
      return true;
    }

    return false;
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(deduplicationKey: string): Promise<void> {
    if (!deduplicationKey) {
      return;
    }

    // Redis-based deduplication in Phase 4; in-memory until then
    const ttl = (this.config.notification?.defaults?.deduplication_ttl_seconds ?? 3600) * 1000;
    this.memoryCache.set(deduplicationKey, Date.now() + ttl);
  }

  /**
   * Generate deduplication key from event data
   */
  generateKey(eventType: string, recipientId: string, sourceResourceId?: string): string {
    const parts = [eventType, recipientId];
    if (sourceResourceId) {
      parts.push(sourceResourceId);
    }
    return parts.join(':');
  }
}

