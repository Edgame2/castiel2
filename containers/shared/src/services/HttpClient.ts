/**
 * HTTP Client (Compatibility Wrapper)
 * Simple HTTP client wrapper for backward compatibility
 * @module @coder/shared/services
 */

import { ServiceClient, ServiceClientConfig } from './ServiceClient';

/**
 * HTTP Client configuration (simplified interface)
 */
export interface HttpClientConfig {
  baseUrl?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * HTTP Client
 * Simple wrapper around ServiceClient for compatibility
 */
export class HttpClient {
  private serviceClient: ServiceClient;

  constructor(config: HttpClientConfig) {
    // Normalize config to ServiceClient format
    const serviceConfig: ServiceClientConfig = {
      baseURL: config.baseURL || config.baseUrl || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 30000,
      },
    };

    this.serviceClient = new ServiceClient(serviceConfig);
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: any): Promise<T> {
    return this.serviceClient.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.serviceClient.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.serviceClient.put<T>(url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return this.serviceClient.patch<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: any): Promise<T> {
    return this.serviceClient.delete<T>(url, config);
  }
}

