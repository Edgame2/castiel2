/**
 * Unit tests for Secret Resolver Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecretResolver } from '../../../src/services/SecretResolver';
import { SecretService } from '../../../src/services/SecretService';
import { SecretNotFoundError } from '../../../src/errors/SecretErrors';
import { SecretContext, AnySecretValue } from '../../../src/types';

// Mock SecretService
vi.mock('../../../src/services/SecretService');

describe('SecretResolver', () => {
  let resolver: SecretResolver;
  let mockSecretService: any;
  let context: SecretContext;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new SecretResolver();
    mockSecretService = (SecretService as any).mock.instances[0] || {
      getSecretValue: vi.fn(),
      getSecretMetadata: vi.fn(),
    };
    (resolver as any).secretService = mockSecretService;
    
    context = {
      userId: 'user-123',
      organizationId: 'org-123',
      teamId: 'team-123',
      projectId: 'project-123',
      consumerModule: 'test-module',
      consumerResourceId: 'resource-123',
    };
  });

  describe('resolveSecret', () => {
    it('should resolve a secret by string reference', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      mockSecretService.getSecretValue.mockResolvedValue(secretValue);
      
      const result = await resolver.resolveSecret('secret-123', context);
      
      expect(result).toEqual(secretValue);
      expect(mockSecretService.getSecretValue).toHaveBeenCalledWith('secret-123', context);
    });

    it('should resolve a secret by SecretReference object', async () => {
      const secretValue: AnySecretValue = {
        type: 'API_KEY',
        key: 'test-api-key',
      };
      
      mockSecretService.getSecretValue.mockResolvedValue(secretValue);
      
      const result = await resolver.resolveSecret(
        { type: 'SECRET_REF', secretId: 'secret-123' },
        context
      );
      
      expect(result).toEqual(secretValue);
      expect(mockSecretService.getSecretValue).toHaveBeenCalledWith('secret-123', context);
    });

    it('should throw SecretNotFoundError if secret does not exist', async () => {
      mockSecretService.getSecretValue.mockRejectedValue(
        new SecretNotFoundError('secret-123')
      );

      await expect(
        resolver.resolveSecret('secret-123', context)
      ).rejects.toThrow(/Secret not found/);
    });
  });

  describe('resolveSecrets', () => {
    it('should resolve multiple secrets successfully', async () => {
      const secret1Value: AnySecretValue = {
        type: 'API_KEY',
        key: 'key-1',
      };
      const secret2Value: AnySecretValue = {
        type: 'API_KEY',
        key: 'key-2',
      };
      
      mockSecretService.getSecretValue
        .mockResolvedValueOnce(secret1Value)
        .mockResolvedValueOnce(secret2Value);
      
      mockSecretService.getSecretMetadata
        .mockResolvedValueOnce({
          name: 'secret-1',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
        })
        .mockResolvedValueOnce({
          name: 'secret-2',
          type: 'API_KEY',
          scope: 'ORGANIZATION',
        });
      
      const result = await resolver.resolveSecrets({
        references: ['secret-1', 'secret-2'],
        context,
      });
      
      expect(result.secrets).toHaveLength(2);
      expect(result.secrets[0].value).toEqual(secret1Value);
      expect(result.secrets[1].value).toEqual(secret2Value);
      expect(result.errors).toBeUndefined();
    });

    it('should handle partial failures with allowPartial option', async () => {
      const secret1Value: AnySecretValue = {
        type: 'API_KEY',
        key: 'key-1',
      };
      
      mockSecretService.getSecretValue
        .mockResolvedValueOnce(secret1Value)
        .mockRejectedValueOnce(new SecretNotFoundError('secret-2'));
      
      mockSecretService.getSecretMetadata.mockResolvedValueOnce({
        name: 'secret-1',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
      });
      
      const result = await resolver.resolveSecrets({
        references: ['secret-1', 'secret-2'],
        context,
      }, { allowPartial: true });
      
      expect(result.secrets).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].secretId).toBe('secret-2');
    });

    it('should throw error if partial failures not allowed', async () => {
      const secret1Value: AnySecretValue = {
        type: 'API_KEY',
        key: 'key-1',
      };
      
      mockSecretService.getSecretValue
        .mockResolvedValueOnce(secret1Value)
        .mockRejectedValueOnce(new SecretNotFoundError('secret-2'));
      
      mockSecretService.getSecretMetadata.mockResolvedValueOnce({
        name: 'secret-1',
        type: 'API_KEY',
        scope: 'ORGANIZATION',
      });
      
      await expect(
        resolver.resolveSecrets({
          references: ['secret-1', 'secret-2'],
          context,
        }, { allowPartial: false })
      ).rejects.toThrow();
    });
  });
});


