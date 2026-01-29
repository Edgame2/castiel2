/**
 * HTTP Client (Compatibility Wrapper)
 * Simple HTTP client wrapper for backward compatibility
 * @module @coder/shared/services
 */
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
export declare class HttpClient {
    private serviceClient;
    constructor(config: HttpClientConfig);
    /**
     * GET request
     */
    get<T = any>(url: string, config?: any): Promise<T>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: any): Promise<T>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: any): Promise<T>;
    /**
     * PATCH request
     */
    patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: any): Promise<T>;
}
//# sourceMappingURL=HttpClient.d.ts.map