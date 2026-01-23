import { Container, CosmosClient } from '@azure/cosmos';
import { ConversionSchema, CreateConversionSchemaInput, UpdateConversionSchemaInput, ConversionSchemaListOptions, ConversionSchemaListResult } from '../types/conversion-schema.types.js';
/**
 * Conversion Schema Repository
 * Manages data mapping schemas for integrations
 */
export declare class ConversionSchemaRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create conversion schema
     */
    create(input: CreateConversionSchemaInput): Promise<ConversionSchema>;
    /**
     * Update conversion schema
     */
    update(id: string, tenantId: string, input: UpdateConversionSchemaInput): Promise<ConversionSchema | null>;
    /**
     * Delete conversion schema
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Find by ID
     */
    findById(id: string, tenantId: string): Promise<ConversionSchema | null>;
    /**
     * Find by name for tenant integration
     */
    findByName(name: string, tenantIntegrationId: string, tenantId: string): Promise<ConversionSchema | null>;
    /**
     * List conversion schemas
     */
    list(options: ConversionSchemaListOptions): Promise<ConversionSchemaListResult>;
    /**
     * Find active schemas for tenant integration
     */
    findActiveByTenantIntegration(tenantIntegrationId: string, tenantId: string): Promise<ConversionSchema[]>;
}
//# sourceMappingURL=conversion-schema.repository.d.ts.map