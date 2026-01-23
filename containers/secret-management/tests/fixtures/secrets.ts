/**
 * Test fixtures for secrets
 */

import { AnySecretValue, SecretType } from '../../src/types';

export function createMockApiKeySecret(): AnySecretValue {
  return {
    type: 'API_KEY',
    key: 'test-api-key-12345',
  };
}

export function createMockUsernamePasswordSecret(): AnySecretValue {
  return {
    type: 'USERNAME_PASSWORD',
    username: 'testuser',
    password: 'testpass123',
  };
}

export function createMockOAuth2TokenSecret(): AnySecretValue {
  return {
    type: 'OAUTH2_TOKEN',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
  };
}

export function createMockGenericSecret(): AnySecretValue {
  return {
    type: 'GENERIC',
    value: 'test-secret-value',
  };
}

export function createMockSecretContext() {
  return {
    userId: 'test-user-id',
    organizationId: 'test-org-id',
    teamId: 'test-team-id',
    projectId: 'test-project-id',
    consumerModule: 'test-module',
    consumerResourceId: 'test-resource-id',
  };
}



