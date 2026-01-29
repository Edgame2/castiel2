/**
 * HTTP Client (Compatibility Wrapper)
 * Simple HTTP client wrapper for backward compatibility
 * @module @coder/shared/services
 */
import { ServiceClient } from './ServiceClient';
/**
 * HTTP Client
 * Simple wrapper around ServiceClient for compatibility
 */
export class HttpClient {
    serviceClient;
    constructor(config) {
        // Normalize config to ServiceClient format
        const serviceConfig = {
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
    async get(url, config) {
        return this.serviceClient.get(url, config);
    }
    /**
     * POST request
     */
    async post(url, data, config) {
        return this.serviceClient.post(url, data, config);
    }
    /**
     * PUT request
     */
    async put(url, data, config) {
        return this.serviceClient.put(url, data, config);
    }
    /**
     * PATCH request
     */
    async patch(url, data, config) {
        return this.serviceClient.patch(url, data, config);
    }
    /**
     * DELETE request
     */
    async delete(url, config) {
        return this.serviceClient.delete(url, config);
    }
}
//# sourceMappingURL=HttpClient.js.map