/**
 * Service Client
 * HTTP client for inter-service communication with circuit breaker
 * @module @coder/shared/services
 */
import { AxiosRequestConfig } from 'axios';
/**
 * Service client configuration
 */
export interface ServiceClientConfig {
    baseURL: string;
    timeout?: number;
    retries?: number;
    circuitBreaker?: {
        enabled?: boolean;
        threshold?: number;
        timeout?: number;
    };
    headers?: Record<string, string>;
}
/**
 * Service Client
 * HTTP client with retry logic and circuit breaker
 */
export declare class ServiceClient {
    private axiosInstance;
    private config;
    private circuitBreaker;
    constructor(config: ServiceClientConfig);
    /**
     * Make HTTP request with retry logic
     */
    request<T = any>(config: AxiosRequestConfig): Promise<T>;
    /**
     * Make HTTP request and return full response (status, data, headers). Used by API Gateway.
     */
    requestWithFullResponse(config: AxiosRequestConfig): Promise<{ status: number; data: any; headers: Record<string, string | string[]> }>;
    /**
     * GET request
     */
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * PATCH request
     */
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}
//# sourceMappingURL=ServiceClient.d.ts.map