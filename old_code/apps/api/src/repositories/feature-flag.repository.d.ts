/**
 * Feature Flag Repository
 *
 * Cosmos DB operations for Feature Flags.
 * Supports global and tenant-specific feature flags.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '../types/feature-flag.types.js';
/**
 * Feature Flag Repository
 */
export declare class FeatureFlagRepository {
    private client;
    private container;
    private monitoring;
    private initialized;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize the container
     */
    initialize(): Promise<void>;
    /**
     * Ensure container is initialized
     */
    private ensureInitialized;
    /**
     * Create a feature flag
     */
    create(input: CreateFeatureFlagInput, userId: string): Promise<FeatureFlag>;
    /**
     * Get a feature flag by name
     */
    getByName(name: string, tenantId?: string | null): Promise<FeatureFlag | null>;
    /**
     * Get a feature flag by ID
     */
    getById(id: string, tenantId: string | null): Promise<FeatureFlag | null>;
    /**
     * List all feature flags (global and tenant-specific)
     */
    list(tenantId?: string | null): Promise<FeatureFlag[]>;
    /**
     * Update a feature flag
     */
    update(id: string, tenantId: string | null, input: UpdateFeatureFlagInput, userId: string): Promise<FeatureFlag | null>;
    /**
     * Delete a feature flag
     */
    delete(id: string, tenantId: string | null): Promise<boolean>;
}
//# sourceMappingURL=feature-flag.repository.d.ts.map