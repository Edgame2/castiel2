/**
 * Field Mapper Service Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldMapperService, FieldMapping, EntityMapping } from '../../../src/services/FieldMapperService';

describe('FieldMapperService', () => {
  let service: FieldMapperService;

  beforeEach(() => {
    service = new FieldMapperService();
  });

  describe('mapFields', () => {
    it('should map simple fields correctly', () => {
      const rawData = {
        Name: 'Test Opportunity',
        Amount: 10000,
        Stage: 'Proposal',
      };

      const entityMapping: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'Name',
            internalFieldName: 'name',
            required: true,
          },
          {
            externalFieldName: 'Amount',
            internalFieldName: 'amount',
            required: false,
          },
          {
            externalFieldName: 'Stage',
            internalFieldName: 'stage',
            required: false,
          },
        ],
      };

      const result = service.mapFields(rawData, entityMapping);

      expect(result).toEqual({
        name: 'Test Opportunity',
        amount: 10000,
        stage: 'Proposal',
      });
    });

    it('should handle nested fields', () => {
      const rawData = {
        Account: {
          Industry: 'Technology',
          Name: 'Acme Corp',
        },
      };

      const entityMapping: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'Account.Industry',
            internalFieldName: 'industry',
            required: false,
          },
          {
            externalFieldName: 'Account.Name',
            internalFieldName: 'accountName',
            required: false,
          },
        ],
      };

      const result = service.mapFields(rawData, entityMapping);

      expect(result).toEqual({
        industry: 'Technology',
        accountName: 'Acme Corp',
      });
    });

    it('should apply default values for missing optional fields', () => {
      const rawData = {
        Name: 'Test Opportunity',
      };

      const entityMapping: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'Name',
            internalFieldName: 'name',
            required: true,
          },
          {
            externalFieldName: 'Probability',
            internalFieldName: 'probability',
            required: false,
            defaultValue: 50,
          },
        ],
      };

      const result = service.mapFields(rawData, entityMapping);

      expect(result).toEqual({
        name: 'Test Opportunity',
        probability: 50,
      });
    });

    it('should apply transform functions', () => {
      const rawData = {
        CloseDate: '2025-12-31',
        Amount: '10000.50',
      };

      const entityMapping: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'CloseDate',
            internalFieldName: 'closeDate',
            required: false,
            transform: 'dateToISO',
          },
          {
            externalFieldName: 'Amount',
            internalFieldName: 'amount',
            required: false,
            transform: 'stringToNumber',
          },
        ],
      };

      const result = service.mapFields(rawData, entityMapping);

      expect(result.closeDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      expect(result.amount).toBe(10000.5);
    });

    it('should handle missing required fields gracefully', () => {
      const rawData = {
        Amount: 10000,
      };

      const entityMapping: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'Name',
            internalFieldName: 'name',
            required: true,
          },
          {
            externalFieldName: 'Amount',
            internalFieldName: 'amount',
            required: false,
          },
        ],
      };

      const result = service.mapFields(rawData, entityMapping);

      // Required field missing - should be skipped (partial mapping)
      expect(result.name).toBeUndefined();
      expect(result.amount).toBe(10000);
    });

    it('should support both naming conventions', () => {
      const rawData = {
        Name: 'Test',
      };

      // Test with externalFieldName/internalFieldName
      const mapping1: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalFieldName: 'Name',
            internalFieldName: 'name',
            required: false,
          },
        ],
      };

      // Test with externalField/shardField
      const mapping2: EntityMapping = {
        externalEntityName: 'Opportunity',
        shardTypeId: 'opportunity',
        fieldMappings: [
          {
            externalField: 'Name',
            shardField: 'name',
            required: false,
          },
        ],
      };

      const result1 = service.mapFields(rawData, mapping1);
      const result2 = service.mapFields(rawData, mapping2);

      expect(result1).toEqual({ name: 'Test' });
      expect(result2).toEqual({ name: 'Test' });
    });
  });

  describe('extractNestedField', () => {
    it('should extract top-level fields', () => {
      const data = { name: 'Test' };
      expect(service.extractNestedField(data, 'name')).toBe('Test');
    });

    it('should extract nested fields', () => {
      const data = {
        Account: {
          Industry: 'Technology',
        },
      };
      expect(service.extractNestedField(data, 'Account.Industry')).toBe('Technology');
    });

    it('should return undefined for missing fields', () => {
      const data = { name: 'Test' };
      expect(service.extractNestedField(data, 'missing')).toBeUndefined();
      expect(service.extractNestedField(data, 'Account.Industry')).toBeUndefined();
    });
  });

  describe('applyTransform', () => {
    it('should apply dateToISO transform', () => {
      const result = service.applyTransform('2025-12-31', 'dateToISO');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should apply stringToNumber transform', () => {
      expect(service.applyTransform('100', 'stringToNumber')).toBe(100);
      expect(service.applyTransform('100.50', 'stringToNumber')).toBe(100.5);
      expect(service.applyTransform('invalid', 'stringToNumber')).toBeUndefined();
    });

    it('should apply toLowerCase transform', () => {
      expect(service.applyTransform('TEST', 'toLowerCase')).toBe('test');
      expect(service.applyTransform(123, 'toLowerCase')).toBe(123); // Non-string unchanged
    });

    it('should apply trim transform', () => {
      expect(service.applyTransform('  test  ', 'trim')).toBe('test');
    });

    it('should return original value for unknown transform', () => {
      const value = 'test';
      const result = service.applyTransform(value, 'unknownTransform');
      expect(result).toBe(value);
    });
  });

  describe('registerTransformer', () => {
    it('should register and use custom transformer', () => {
      service.registerTransformer('customTest', (value) => `custom_${value}`);

      const result = service.applyTransform('test', 'customTest');
      expect(result).toBe('custom_test');
    });

    it('should support transform options', () => {
      service.registerTransformer('multiply', (value, options) => {
        const factor = options?.factor || 1;
        return typeof value === 'number' ? value * factor : value;
      });

      expect(service.applyTransform(10, 'multiply', { factor: 2 })).toBe(20);
      expect(service.applyTransform(10, 'multiply', { factor: 3 })).toBe(30);
    });
  });

  describe('validateMappedData', () => {
    it('should validate basic object structure', () => {
      const result = service.validateMappedData({ name: 'Test' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-object data', () => {
      const result = service.validateMappedData(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
