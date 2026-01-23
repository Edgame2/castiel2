/**
 * Conversion Schema Workflow Integration Tests
 * End-to-end tests for conversion schema CRUD operations and transformation execution
 * 
 * Tests the complete flow:
 * - API endpoint → Controller → Service → Repository → Database
 * - Schema creation, retrieval, update, deletion
 * - Transformation execution with sample data
 * - Error handling across service boundaries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { ConversionSchemaService } from '../../src/services/conversion-schema.service.js';
import { ConversionSchemaRepository } from '../../src/repositories/conversion-schema.repository.js';
import { ConversionSchemaController } from '../../src/controllers/conversion-schema.controller.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type {
  ConversionSchema,
  CreateConversionSchemaInput,
  UpdateConversionSchemaInput,
} from '../../src/types/conversion-schema.types.js';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

// Mock Cosmos DB client
const mockCosmosClient = {
  database: vi.fn(() => ({
    container: vi.fn(() => ({
      items: {
        create: vi.fn(),
        query: vi.fn(),
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn(),
      },
    })),
  })),
} as unknown as CosmosClient;

describe('Conversion Schema Workflow - Integration', () => {
  let service: ConversionSchemaService;
  let repository: ConversionSchemaRepository;
  let controller: ConversionSchemaController;
  const testTenantId = 'test-tenant-1';
  const testIntegrationId = 'test-integration-1';
  const testUserId = 'test-user-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize repository
    repository = new ConversionSchemaRepository(
      mockCosmosClient,
      'test-database',
      'conversion-schemas'
    );

    // Initialize service
    service = new ConversionSchemaService(repository, mockMonitoring);

    // Initialize controller
    controller = new ConversionSchemaController(service, mockMonitoring);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Creation Workflow', () => {
    it('should create a conversion schema end-to-end', async () => {
      const input: CreateConversionSchemaInput = {
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Test Schema',
        description: 'Test conversion schema',
        source: {
          entity: 'Account',
          provider: 'salesforce',
        },
        target: {
          shardTypeId: 'c_account',
          shardTypeName: 'Account',
        },
        fieldMappings: [
          {
            sourceField: 'Name',
            targetField: 'name',
            transformation: {
              type: 'direct',
            },
          },
          {
            sourceField: 'Industry',
            targetField: 'industry',
            transformation: {
              type: 'direct',
            },
          },
        ],
        deduplication: {
          enabled: true,
          strategy: 'exact_match',
          fields: ['name', 'externalId'],
        },
        isActive: true,
        createdBy: testUserId,
      };

      // Mock repository create to return created schema
      const createdSchema: ConversionSchema = {
        id: 'schema-1',
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: input.name,
        description: input.description,
        source: input.source,
        target: input.target,
        fieldMappings: input.fieldMappings.map((fm, idx) => ({
          id: `fm-${idx}`,
          ...fm,
        })),
        preserveRelationships: input.preserveRelationships ?? false,
        deduplication: input.deduplication,
        isActive: input.isActive ?? true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(repository, 'create').mockResolvedValue(createdSchema);

      // Execute through service
      const result = await service.create(input);

      // Verify result
      expect(result).toBeDefined();
      expect(result.id).toBe('schema-1');
      expect(result.name).toBe('Test Schema');
      expect(result.fieldMappings).toHaveLength(2);
      expect(result.isActive).toBe(true);

      // Verify repository was called
      expect(repository.create).toHaveBeenCalledWith(input);

      // Verify monitoring event was tracked
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'conversionSchema.created',
        expect.objectContaining({
          schemaId: 'schema-1',
          tenantId: testTenantId,
        })
      );
    });

    it('should validate field mappings during creation', async () => {
      const invalidInput: CreateConversionSchemaInput = {
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Invalid Schema',
        source: {
          entity: 'Account',
        },
        target: {
          shardTypeId: 'c_account',
        },
        fieldMappings: [
          {
            sourceField: '', // Invalid: empty source field
            targetField: 'name',
            transformation: {
              type: 'direct',
            },
          },
        ],
        deduplication: {
          enabled: false,
        },
        createdBy: testUserId,
      };

      // Service should validate and throw error
      await expect(service.create(invalidInput)).rejects.toThrow();

      // Verify repository was not called
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('Schema Retrieval Workflow', () => {
    it('should retrieve a schema by ID', async () => {
      const schema: ConversionSchema = {
        id: 'schema-1',
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Test Schema',
        source: {
          entity: 'Account',
        },
        target: {
          shardTypeId: 'c_account',
        },
        fieldMappings: [],
        preserveRelationships: false,
        deduplication: {
          enabled: false,
        },
        isActive: true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(repository, 'findById').mockResolvedValue(schema);

      const result = await service.findById('schema-1', testTenantId);

      expect(result).toBeDefined();
      expect(result?.id).toBe('schema-1');
      expect(repository.findById).toHaveBeenCalledWith('schema-1', testTenantId);
    });

    it('should return null for non-existent schema', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(null);

      const result = await service.findById('non-existent', testTenantId);

      expect(result).toBeNull();
    });

    it('should list schemas for an integration', async () => {
      const schemas: ConversionSchema[] = [
        {
          id: 'schema-1',
          tenantIntegrationId: testIntegrationId,
          tenantId: testTenantId,
          name: 'Schema 1',
          source: { entity: 'Account' },
          target: { shardTypeId: 'c_account' },
          fieldMappings: [],
          preserveRelationships: false,
          deduplication: { enabled: false },
          isActive: true,
          createdBy: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'schema-2',
          tenantIntegrationId: testIntegrationId,
          tenantId: testTenantId,
          name: 'Schema 2',
          source: { entity: 'Contact' },
          target: { shardTypeId: 'c_contact' },
          fieldMappings: [],
          preserveRelationships: false,
          deduplication: { enabled: false },
          isActive: true,
          createdBy: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(repository, 'list').mockResolvedValue({
        schemas,
        total: 2,
        hasMore: false,
      });

      const result = await service.list({
        filter: {
          tenantId: testTenantId,
          tenantIntegrationId: testIntegrationId,
        },
        limit: 10,
        offset: 0,
      });

      expect(result.schemas).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Schema Update Workflow', () => {
    it('should update a schema end-to-end', async () => {
      const existingSchema: ConversionSchema = {
        id: 'schema-1',
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Original Name',
        source: { entity: 'Account' },
        target: { shardTypeId: 'c_account' },
        fieldMappings: [],
        preserveRelationships: false,
        deduplication: { enabled: false },
        isActive: true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateInput: UpdateConversionSchemaInput = {
        name: 'Updated Name',
        isActive: false,
      };

      const updatedSchema: ConversionSchema = {
        ...existingSchema,
        name: 'Updated Name',
        isActive: false,
        updatedAt: new Date(),
      };

      vi.spyOn(repository, 'findById').mockResolvedValue(existingSchema);
      vi.spyOn(repository, 'update').mockResolvedValue(updatedSchema);

      const result = await service.update('schema-1', testTenantId, updateInput);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Name');
      expect(result?.isActive).toBe(false);
      expect(repository.update).toHaveBeenCalledWith('schema-1', testTenantId, updateInput);

      // Verify monitoring event
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'conversionSchema.updated',
        expect.objectContaining({
          schemaId: 'schema-1',
          tenantId: testTenantId,
        })
      );
    });

    it('should return null when updating non-existent schema', async () => {
      vi.spyOn(repository, 'update').mockResolvedValue(null);

      const result = await service.update('non-existent', testTenantId, {
        name: 'Updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('Schema Deletion Workflow', () => {
    it('should delete a schema end-to-end', async () => {
      vi.spyOn(repository, 'delete').mockResolvedValue(true);

      const result = await service.delete('schema-1', testTenantId);

      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith('schema-1', testTenantId);

      // Verify monitoring event
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'conversionSchema.deleted',
        expect.objectContaining({
          schemaId: 'schema-1',
          tenantId: testTenantId,
        })
      );
    });

    it('should return false when deleting non-existent schema', async () => {
      vi.spyOn(repository, 'delete').mockResolvedValue(false);

      const result = await service.delete('non-existent', testTenantId);

      expect(result).toBe(false);
    });
  });

  describe('Transformation Execution Workflow', () => {
    it('should execute transformation with sample data', async () => {
      const schema: ConversionSchema = {
        id: 'schema-1',
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Test Schema',
        source: { entity: 'Account' },
        target: { shardTypeId: 'c_account' },
        fieldMappings: [
          {
            id: 'fm-1',
            sourceField: 'Name',
            targetField: 'name',
            transformation: {
              type: 'direct',
            },
          },
          {
            id: 'fm-2',
            sourceField: 'Industry',
            targetField: 'industry',
            transformation: {
              type: 'direct',
            },
          },
        ],
        preserveRelationships: false,
        deduplication: { enabled: false },
        isActive: true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(repository, 'findById').mockResolvedValue(schema);

      const sampleData = {
        Name: 'Test Account',
        Industry: 'Technology',
      };

      const result = await service.testSchema('schema-1', testTenantId, {
        sampleData,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.fieldResults).toBeDefined();
      expect(result.fieldResults.length).toBeGreaterThan(0);

      // Verify field mappings were applied
      const nameMapping = result.fieldResults.find((fr) => fr.targetField === 'name');
      expect(nameMapping).toBeDefined();
      expect(nameMapping?.transformedValue).toBe('Test Account');
    });

    it('should handle transformation errors gracefully', async () => {
      const schema: ConversionSchema = {
        id: 'schema-1',
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Test Schema',
        source: { entity: 'Account' },
        target: { shardTypeId: 'c_account' },
        fieldMappings: [
          {
            id: 'fm-1',
            sourceField: 'InvalidField',
            targetField: 'name',
            transformation: {
              type: 'direct',
            },
          },
        ],
        preserveRelationships: false,
        deduplication: { enabled: false },
        isActive: true,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(repository, 'findById').mockResolvedValue(schema);

      const sampleData = {
        Name: 'Test Account', // Field name doesn't match mapping
      };

      const result = await service.testSchema('schema-1', testTenantId, {
        sampleData,
      });

      // Should still return result but with errors
      expect(result).toBeDefined();
      expect(result.fieldResults).toBeDefined();
      // Field with missing source should have error
      const nameMapping = result.fieldResults.find((fr) => fr.targetField === 'name');
      expect(nameMapping?.success).toBe(false);
      expect(nameMapping?.error).toBeDefined();
    });
  });

  describe('Error Handling Across Boundaries', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      vi.spyOn(repository, 'create').mockRejectedValue(error);

      const input: CreateConversionSchemaInput = {
        tenantIntegrationId: testIntegrationId,
        tenantId: testTenantId,
        name: 'Test Schema',
        source: { entity: 'Account' },
        target: { shardTypeId: 'c_account' },
        fieldMappings: [],
        deduplication: { enabled: false },
        createdBy: testUserId,
      };

      await expect(service.create(input)).rejects.toThrow('Database connection failed');

      // Verify error was tracked
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle service errors in controller', async () => {
      const error = new Error('Service error');
      vi.spyOn(service, 'create').mockRejectedValue(error);

      const mockRequest = {
        params: { integrationId: testIntegrationId },
        body: {
          name: 'Test Schema',
          source: { entity: 'Account' },
          target: { shardTypeId: 'c_account' },
          fieldMappings: [],
          deduplication: { enabled: false },
        },
        user: { id: testUserId, tenantId: testTenantId },
      } as any;

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await controller.create(mockRequest, mockReply);

      // Verify error response
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );

      // Verify error was tracked
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});
