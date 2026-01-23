/**
 * Proactive Insights Delivery Preferences Repository
 *
 * Manages storage and retrieval of user delivery preferences for proactive insights.
 * Uses Cosmos DB with partition key [tenantId, userId].
 */
import { Container } from '@azure/cosmos';
import { DeliveryPreferences } from '../types/proactive-insights.types.js';
/**
 * Repository for proactive insights delivery preferences
 */
export declare class ProactiveInsightsDeliveryPreferencesRepository {
    private container;
    constructor(container: Container);
    /**
     * Get delivery preferences for a user
     */
    getPreferences(tenantId: string, userId: string): Promise<DeliveryPreferences | null>;
    /**
     * Create or update delivery preferences
     */
    upsertPreferences(tenantId: string, userId: string, preferences: Partial<DeliveryPreferences>): Promise<DeliveryPreferences>;
    /**
     * Delete delivery preferences (revert to defaults)
     */
    deletePreferences(tenantId: string, userId: string): Promise<void>;
    /**
     * Get default delivery preferences
     */
    private getDefaultPreferences;
}
//# sourceMappingURL=proactive-insights-delivery-preferences.repository.d.ts.map