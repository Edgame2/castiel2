/**
 * Secret Management Client
 * 
 * Client for retrieving secrets from Secret Management module
 */

import { HttpClient } from '@coder/shared';
import { getConfig } from '../config';

export interface SecretValueResponse {
  value: string | Record<string, any>;
}

export class SecretManagementClient {
  private client: HttpClient;
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const config = getConfig();
    let serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;
    if (!serviceAuthToken && process.env.NODE_ENV === 'development') {
      serviceAuthToken = 'dev-service-token';
    }
    if (!serviceAuthToken) {
      throw new Error('SERVICE_AUTH_TOKEN environment variable is required');
    }

    this.client = new HttpClient({
      baseUrl: config.services.secret_management.url,
      headers: {
        'x-service-token': serviceAuthToken,
        'x-requesting-service': 'notification-manager',
      },
      timeout: config.services.secret_management.timeout || 5000,
    });
  }

  /**
   * Get secret value by ID
   * Caches the result for TTL duration
   */
  async getSecretValue(secretId: string): Promise<string | Record<string, any>> {
    // Check cache first
    const cached = this.cache.get(secretId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const response = await this.client.get<SecretValueResponse>(`/api/secrets/${secretId}/value`);
      
      // Cache the result
      this.cache.set(secretId, {
        value: response.value,
        expiresAt: Date.now() + this.cacheTtl,
      });

      return response.value;
    } catch (error: any) {
      // HttpClient throws Error objects, check message for status codes
      const errorMessage = error.message || '';
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new Error(`Secret not found: ${secretId}`);
      }
      if (errorMessage.includes('403') || errorMessage.includes('Access denied')) {
        throw new Error(`Access denied to secret: ${secretId}`);
      }
      throw new Error(`Failed to retrieve secret ${secretId}: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Clear cache for a specific secret (useful after rotation)
   */
  clearCache(secretId: string): void {
    this.cache.delete(secretId);
  }

  /**
   * Clear all cached secrets
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

