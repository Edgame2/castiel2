/**
 * Validation Utilities
 * 
 * Helper functions for validating secret values and inputs.
 */

import { AnySecretValue, SecretType } from '../types';
import { InvalidSecretValueError } from '../errors/SecretErrors';

/**
 * Validate secret value matches its type
 */
export function validateSecretValue(type: SecretType, value: AnySecretValue): void {
  if (value.type !== type) {
    throw new InvalidSecretValueError(
      type,
      `Value type ${value.type} does not match secret type ${type}`
    );
  }
  
  // Type-specific validation
  switch (type) {
    case 'API_KEY':
      if (!('key' in value) || typeof (value as any).key !== 'string' || !(value as any).key.trim()) {
        throw new InvalidSecretValueError(type, 'API_KEY must have a non-empty key field');
      }
      break;
    
    case 'USERNAME_PASSWORD':
      if (!('username' in value) || !('password' in value)) {
        throw new InvalidSecretValueError(
          type,
          'USERNAME_PASSWORD must have username and password fields'
        );
      }
      if (typeof (value as any).username !== 'string' || !(value as any).username.trim()) {
        throw new InvalidSecretValueError(type, 'Username must be a non-empty string');
      }
      if (typeof (value as any).password !== 'string' || !(value as any).password.trim()) {
        throw new InvalidSecretValueError(type, 'Password must be a non-empty string');
      }
      break;
    
    case 'OAUTH2_TOKEN':
      if (!('accessToken' in value) || typeof (value as any).accessToken !== 'string') {
        throw new InvalidSecretValueError(type, 'OAUTH2_TOKEN must have an accessToken field');
      }
      break;
    
    case 'CERTIFICATE':
      if (!('certificate' in value) || typeof (value as any).certificate !== 'string' || !(value as any).certificate.trim()) {
        throw new InvalidSecretValueError(type, 'CERTIFICATE must have a non-empty certificate field');
      }
      break;
    
    case 'SSH_KEY':
      if (!('privateKey' in value) || typeof (value as any).privateKey !== 'string' || !(value as any).privateKey.trim()) {
        throw new InvalidSecretValueError(type, 'SSH_KEY must have a non-empty privateKey field');
      }
      break;
    
    case 'CONNECTION_STRING':
      if (!('connectionString' in value) || typeof (value as any).connectionString !== 'string' || !(value as any).connectionString.trim()) {
        throw new InvalidSecretValueError(type, 'CONNECTION_STRING must have a non-empty connectionString field');
      }
      break;
    
    case 'JSON_CREDENTIAL':
      if (!('credential' in value) || typeof (value as any).credential !== 'object') {
        throw new InvalidSecretValueError(type, 'JSON_CREDENTIAL must have a credential object');
      }
      break;
    
    case 'ENV_VARIABLE_SET':
      if (!('variables' in value) || typeof (value as any).variables !== 'object') {
        throw new InvalidSecretValueError(type, 'ENV_VARIABLE_SET must have a variables object');
      }
      break;
    
    case 'GENERIC':
      if (!('value' in value) || typeof (value as any).value !== 'string') {
        throw new InvalidSecretValueError(type, 'GENERIC must have a value field');
      }
      break;
    
    default:
      throw new InvalidSecretValueError(type, `Unknown secret type: ${type}`);
  }
}

/**
 * Validate secret name
 */
export function validateSecretName(name: string): void {
  if (!name || !name.trim()) {
    throw new InvalidSecretValueError('GENERIC', 'Secret name is required');
  }
  
  if (name.length > 255) {
    throw new InvalidSecretValueError('GENERIC', 'Secret name must be 255 characters or less');
  }
  
  // Validate name format (alphanumeric, hyphens, underscores, dots)
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new InvalidSecretValueError(
      'GENERIC',
      'Secret name can only contain alphanumeric characters, hyphens, underscores, and dots'
    );
  }
}
