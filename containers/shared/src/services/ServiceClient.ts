/**
 * Service Client
 * HTTP client for inter-service communication with circuit breaker
 * @module @coder/shared/services
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

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
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private firstFailureTime: number = 0; // Track first failure in current window
  private threshold: number;
  private timeout: number;

  constructor(threshold: number = 5, timeout: number = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
    this.firstFailureTime = 0;
  }

  recordFailure(): void {
    const now = Date.now();
    
    // Reset failure count if failures are outside the timeout window
    // This implements a sliding window (failures within timeout period)
    if (this.firstFailureTime > 0 && (now - this.firstFailureTime) > this.timeout) {
      // Failures are old, reset window
      this.failures = 1;
      this.firstFailureTime = now;
    } else {
      // Increment failure count
      this.failures++;
      if (this.firstFailureTime === 0) {
        this.firstFailureTime = now;
      }
    }
    
    this.lastFailureTime = now;

    if (this.failures >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }

  canAttempt(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow one attempt
    return true;
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Service Client
 * HTTP client with retry logic and circuit breaker
 */
export class ServiceClient {
  private axiosInstance: AxiosInstance;
  private config: ServiceClientConfig;
  private circuitBreaker: CircuitBreaker | null = null;

  constructor(config: ServiceClientConfig) {
    this.config = {
      timeout: config.timeout || 5000,
      retries: config.retries || 3,
      circuitBreaker: {
        enabled: config.circuitBreaker?.enabled !== false,
        threshold: config.circuitBreaker?.threshold || 5,
        timeout: config.circuitBreaker?.timeout || 30000,
      },
      ...config,
    };

    // Initialize circuit breaker
    if (this.config.circuitBreaker?.enabled) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreaker.threshold!,
        this.config.circuitBreaker.timeout!
      );
    }

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.canAttempt()) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    let lastError: AxiosError | null = null;
    const maxRetries = this.config.retries!;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(config);
        
        // Record success
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }

        return response.data;
      } catch (error) {
        lastError = error as AxiosError;

        // Record failure
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }

        // Don't retry on 4xx errors (client errors)
        if (lastError.response && lastError.response.status >= 400 && lastError.response.status < 500) {
          throw lastError;
        }

        // Retry on network errors, 5xx errors, or 429 (rate limit)
        const shouldRetry = !lastError.response || 
          lastError.response.status >= 500 || 
          lastError.response.status === 429;
        
        if (shouldRetry && attempt < maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = 1000; // 1 second initial
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
          // Add jitter (±20%)
          const jitter = delay * 0.2 * (Math.random() * 2 - 1);
          const finalDelay = Math.max(0, delay + jitter);
          
          await new Promise(resolve => setTimeout(resolve, finalDelay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Make HTTP request and return full response (status, data, headers).
   * Used by API Gateway to proxy while preserving backend status and applying circuit breaker.
   * Does not retry so the caller can forward the exact backend response.
   */
  async requestWithFullResponse(config: AxiosRequestConfig): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    if (this.circuitBreaker && !this.circuitBreaker.canAttempt()) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }
    try {
      const response = await this.axiosInstance.request(config);
      if (this.circuitBreaker) {
        this.circuitBreaker.recordSuccess();
      }
      const headers: Record<string, string> = {};
      if (response.headers && typeof response.headers === 'object') {
        for (const [k, v] of Object.entries(response.headers)) {
          if (typeof v === 'string') headers[k] = v;
        }
      }
      return { status: response.status, data: response.data, headers };
    } catch (error) {
      if (this.circuitBreaker) {
        this.circuitBreaker.recordFailure();
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}

