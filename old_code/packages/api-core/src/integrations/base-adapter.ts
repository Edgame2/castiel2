/**
 * Base Integration Adapter
 * Abstract class for implementing integration-specific logic
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { IntegrationConnectionService } from '../services/integration-connection.service.js';
import {
  IntegrationDefinition,
  IntegrationEntity,
  IntegrationEntityField,
  SearchOptions,
  SearchResult,
} from '../types/integration.types.js';
import type { SSOTeam } from '../types/team.types.js';

/**
 * Fetch options for pulling data
 */
export interface FetchOptions {
  entity: string;
  filters?: Record<string, any>;
  fields?: string[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  modifiedSince?: Date;
  incrementalSync?: boolean;
  externalUserId?: string; // For user-scoped data fetching
}

/**
 * Fetch result
 */
export interface FetchResult<T = Record<string, any>> {
  records: T[];
  total?: number;
  hasMore: boolean;
  nextOffset?: number;
  cursor?: string;
}

/**
 * Push options for sending data
 */
export interface PushOptions {
  entity: string;
  operation: 'create' | 'update' | 'upsert' | 'delete';
}

/**
 * Push result
 */
export interface PushResult {
  success: boolean;
  externalId?: string;
  error?: string;
  details?: any;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  type: string;
  entity: string;
  externalId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: Date;
}

/**
 * Batch fetch options
 */
export interface BatchFetchOptions extends FetchOptions {
  batchSize?: number;
  maxBatches?: number;
  onBatchComplete?: (batch: FetchResult, batchNumber: number) => Promise<void>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastCheckedAt: Date;
  details?: Record<string, any>;
}

/**
 * Integration entity (for dynamic discovery)
 */
export interface DiscoveredEntity {
  name: string;
  displayName: string;
  description?: string;
  fields: IntegrationEntityField[];
  supportsPull: boolean;
  supportsPush: boolean;
  supportsWebhook?: boolean;
}

/**
 * Rate limit information from API
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  resetInSeconds: number;
}

/**
 * Base Integration Adapter
 */
export abstract class BaseIntegrationAdapter {
  protected monitoring: IMonitoringProvider;
  protected connectionService: IntegrationConnectionService;
  protected integrationId: string;
  protected tenantId: string;
  protected connectionId: string;

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    integrationId: string,
    tenantId: string,
    connectionId: string
  ) {
    this.monitoring = monitoring;
    this.connectionService = connectionService;
    this.integrationId = integrationId;
    this.tenantId = tenantId;
    this.connectionId = connectionId;
  }

  /**
   * Get integration definition
   */
  abstract getDefinition(): IntegrationDefinition;

  /**
   * Test connection
   */
  abstract testConnection(): Promise<{ success: boolean; error?: string; details?: any }>;

  /**
   * Fetch records from integration
   */
  abstract fetch(options: FetchOptions): Promise<FetchResult>;

  /**
   * Push record to integration
   */
  abstract push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;

  /**
   * Get entity schema (fields and their types)
   */
  abstract getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;

  /**
   * List available entities
   */
  abstract listEntities(): Promise<IntegrationEntity[]>;

  /**
   * Search across integration entities
   * Must be implemented by adapters that support search
   */
  abstract search(options: SearchOptions): Promise<SearchResult>;

  /**
   * Fetch teams/groups from SSO provider
   * Optional method - only required for adapters that support team sync
   * @param config Team sync configuration
   * @returns Array of SSO teams
   */
  async fetchTeams?(config: any): Promise<SSOTeam[]>;

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    // Default implementation - override in specific adapters
    return null;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Default implementation - override in specific adapters
    return false;
  }

  // ============================================
  // Lifecycle Hooks (Optional - Override as Needed)
  // ============================================

  /**
   * Called when connection is established
   */
  async onConnect?(): Promise<void> {
    // Override in specific adapters for setup tasks
  }

  /**
   * Called when connection is terminated
   */
  async onDisconnect?(): Promise<void> {
    // Override in specific adapters for cleanup
  }

  /**
   * Called when an error occurs during operations
   */
  async onError?(error: Error, context?: Record<string, any>): Promise<void> {
    this.monitoring.trackException(error, {
      operation: 'adapter.error',
      integrationId: this.integrationId,
      tenantId: this.tenantId,
      ...context,
    });
  }

  /**
   * Called when rate limit is hit
   */
  async onRateLimitHit?(resetAt: Date): Promise<void> {
    this.monitoring.trackEvent('integration.rate_limit_hit', {
      integrationId: this.integrationId,
      tenantId: this.tenantId,
      resetAt: resetAt.toISOString(),
    });
  }

  // ============================================
  // Batch Operations (Optional - Override for Better Performance)
  // ============================================

  /**
   * Fetch records in batches for large data sets
   */
  async fetchBatch?(options: BatchFetchOptions): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    const batchSize = options.batchSize || 100;
    const maxBatches = options.maxBatches || 10;
    let offset = options.offset || 0;
    let batchNumber = 0;
    let hasMore = true;

    while (hasMore && batchNumber < maxBatches) {
      const result = await this.fetch({
        ...options,
        limit: batchSize,
        offset,
      });

      results.push(result);
      batchNumber++;

      if (options.onBatchComplete) {
        await options.onBatchComplete(result, batchNumber);
      }

      hasMore = result.hasMore;
      offset = result.nextOffset || offset + batchSize;
    }

    return results;
  }

  /**
   * Push records in batches
   */
  async pushBatch?(records: Record<string, any>[], options: PushOptions): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const record of records) {
      try {
        const result = await this.push(record, options);
        results.push(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  // ============================================
  // Schema Discovery (Optional - Override for Dynamic Schema)
  // ============================================

  /**
   * Discover available entities dynamically from API
   */
  async discoverEntities?(): Promise<DiscoveredEntity[]> {
    // Override in adapters that support dynamic schema discovery
    return [];
  }

  /**
   * Discover fields for a specific entity
   */
  async discoverFields?(entityName: string): Promise<IntegrationEntityField[]> {
    // Override in adapters that support dynamic field discovery
    const entity = await this.getEntitySchema(entityName);
    return entity?.fields || [];
  }

  // ============================================
  // Health Check (Optional - Override for Custom Checks)
  // ============================================

  /**
   * Check adapter health and connectivity
   */
  async healthCheck?(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const testResult = await this.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        healthy: testResult.success,
        responseTime,
        error: testResult.error,
        lastCheckedAt: new Date(),
        details: testResult.details,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: errorMessage,
        lastCheckedAt: new Date(),
      };
    }
  }

  // ============================================
  // Rate Limit Handling (Optional - Override for API-Specific Logic)
  // ============================================

  /**
   * Extract rate limit info from response headers
   */
  protected extractRateLimitInfo?(headers: Headers): RateLimitInfo | null {
    // Common header patterns - override for specific APIs
    const limit = headers.get('x-ratelimit-limit') || headers.get('ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining') || headers.get('ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset') || headers.get('ratelimit-reset');

    if (!limit || !remaining || !reset) {
      return null;
    }

    const resetTimestamp = parseInt(reset, 10);
    const resetAt = new Date(resetTimestamp * 1000);
    const resetInSeconds = Math.max(0, Math.floor((resetAt.getTime() - Date.now()) / 1000));

    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      resetAt,
      resetInSeconds,
    };
  }

  /**
   * Get access token (handles refresh if needed)
   */
  protected async getAccessToken(): Promise<string | null> {
    try {
      const credentials = await this.connectionService.getDecryptedCredentials(this.connectionId, this.integrationId);
      if (credentials?.type === 'oauth2' && credentials.accessToken) {
        return credentials.accessToken;
      }
      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'base-adapter.get-access-token',
        connectionId: this.connectionId,
        integrationId: this.integrationId,
      });
      return null;
    }
  }

  /**
   * Make authenticated API request with rate limit handling
   */
  protected async makeRequest<T = any>(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<{ data?: T; error?: string; status: number; rateLimitInfo?: RateLimitInfo }> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return { error: 'No access token available', status: 401 };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Extract rate limit info if available
      let rateLimitInfo: RateLimitInfo | undefined;
      if (this.extractRateLimitInfo) {
        rateLimitInfo = this.extractRateLimitInfo(response.headers) || undefined;

        // Trigger callback if rate limit is low
        if (rateLimitInfo && rateLimitInfo.remaining < 10 && this.onRateLimitHit) {
          await this.onRateLimitHit(rateLimitInfo.resetAt);
        }
      }

      // Handle rate limit exceeded
      if (response.status === 429) {
        const resetAt = rateLimitInfo?.resetAt || new Date(Date.now() + 60000); // Default 1 min
        if (this.onRateLimitHit) {
          await this.onRateLimitHit(resetAt);
        }
        return {
          error: 'Rate limit exceeded',
          status: 429,
          rateLimitInfo,
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.monitoring.trackEvent('integration.request.failed', {
          integrationId: this.integrationId,
          status: response.status,
          url,
        });

        if (this.onError) {
          await this.onError(new Error(errorText), {
            status: response.status,
            url,
          });
        }

        return { error: errorText, status: response.status, rateLimitInfo };
      }

      const data = await response.json() as T;
      return { data, status: response.status, rateLimitInfo };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorName === 'AbortError' || errorMessage?.includes('aborted')) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(errorMessage),
          {
            operation: 'integration.makeRequest.timeout',
            integrationId: this.integrationId,
            url,
            timeoutMs,
          }
        );
        return { error: 'Request timeout', status: 504 };
      }

      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'integration.makeRequest',
          integrationId: this.integrationId,
          url,
        }
      );

      if (this.onError) {
        await this.onError(error instanceof Error ? error : new Error(errorMessage), { url });
      }

      return { error: errorMessage, status: 500 };
    }
  }
}

/**
 * Adapter factory interface
 */
export interface IntegrationAdapterFactory {
  create(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ): BaseIntegrationAdapter;
}

/**
 * Registry for integration adapters
 */
export class IntegrationAdapterRegistry {
  private adapters = new Map<string, IntegrationAdapterFactory>();
  private monitoring?: IMonitoringProvider;

  constructor(monitoring?: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  register(integrationId: string, factory: IntegrationAdapterFactory): void {
    this.adapters.set(integrationId, factory);
    this.monitoring?.trackEvent('adapter.registered', {
      integrationId,
    });
  }

  get(integrationId: string): IntegrationAdapterFactory | undefined {
    return this.adapters.get(integrationId);
  }

  has(integrationId: string): boolean {
    return this.adapters.has(integrationId);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  unregister(integrationId: string): boolean {
    const existed = this.adapters.delete(integrationId);
    if (existed) {
      this.monitoring?.trackEvent('adapter.unregistered', {
        integrationId,
      });
    }
    return existed;
  }

  /**
   * Auto-discover and register adapters from a directory
   * Scans for adapter files matching pattern: *.adapter.ts or *.adapter.js
   */
  async autoDiscoverAdapters(directory: string): Promise<number> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      if (!fs.existsSync(directory)) {
        this.monitoring?.trackEvent('adapter.discovery.failed', {
          reason: 'directory_not_found',
          directory,
        });
        return 0;
      }

      const files = fs.readdirSync(directory);
      const adapterFiles = files.filter(
        (file) => file.endsWith('.adapter.ts') || file.endsWith('.adapter.js')
      );

      let registeredCount = 0;

      for (const file of adapterFiles) {
        try {
          const filePath = path.join(directory, file);
          const module = await import(filePath);

          // Look for exported factory or adapter class
          if (module.adapterFactory) {
            const integrationId = file.replace(/\.adapter\.(ts|js)$/, '');
            this.register(integrationId, module.adapterFactory);
            registeredCount++;
          } else if (module.default) {
            // Try to use default export as factory
            const integrationId = file.replace(/\.adapter\.(ts|js)$/, '');
            this.register(integrationId, module.default);
            registeredCount++;
          }
        } catch (error: unknown) {
          this.monitoring?.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'adapter.discovery',
              file,
            }
          );
        }
      }

      this.monitoring?.trackEvent('adapter.discovery.completed', {
        directory,
        discovered: adapterFiles.length,
        registered: registeredCount,
      });

      return registeredCount;
    } catch (error: unknown) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'adapter.autoDiscoverAdapters',
          directory,
        }
      );
      return 0;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    totalAdapters: number;
    adapterIds: string[];
  } {
    return {
      totalAdapters: this.adapters.size,
      adapterIds: this.list(),
    };
  }
}

// Global adapter registry
export const adapterRegistry = new IntegrationAdapterRegistry();




