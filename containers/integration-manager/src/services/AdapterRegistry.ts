/**
 * Adapter Registry
 * Manages adapter factories for different integration providers
 */

import { IntegrationAdapterFactory } from '../types/adapter.types';
import { log } from '../utils/logger';

export class AdapterRegistry {
  private adapters = new Map<string, IntegrationAdapterFactory>();

  /**
   * Register an adapter factory
   */
  register(providerName: string, factory: IntegrationAdapterFactory): void {
    if (this.adapters.has(providerName)) {
      log.warn('Adapter already registered, overwriting', {
        providerName,
        service: 'integration-manager',
      });
    }
    this.adapters.set(providerName, factory);
    log.info('Adapter registered', {
      providerName,
      service: 'integration-manager',
    });
  }

  /**
   * Get adapter factory by provider name
   */
  get(providerName: string): IntegrationAdapterFactory | undefined {
    return this.adapters.get(providerName);
  }

  /**
   * Check if adapter is registered
   */
  has(providerName: string): boolean {
    return this.adapters.has(providerName);
  }

  /**
   * List all registered adapter provider names
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregister an adapter
   */
  unregister(providerName: string): boolean {
    const removed = this.adapters.delete(providerName);
    if (removed) {
      log.info('Adapter unregistered', {
        providerName,
        service: 'integration-manager',
      });
    }
    return removed;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAdapters: number;
    adapterIds: string[];
  } {
    return {
      totalAdapters: this.adapters.size,
      adapterIds: Array.from(this.adapters.keys()),
    };
  }
}

// Global adapter registry instance
export const adapterRegistry = new AdapterRegistry();
