/**
 * Service Client
 * HTTP client for inter-service communication with circuit breaker
 * @module @coder/shared/services
 */
import axios from 'axios';
/**
 * Circuit breaker state
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (CircuitState = {}));
/**
 * Circuit breaker
 */
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failures = 0;
    lastFailureTime = 0;
    firstFailureTime = 0; // Track first failure in current window
    threshold;
    timeout;
    constructor(threshold = 5, timeout = 30000) {
        this.threshold = threshold;
        this.timeout = timeout;
    }
    recordSuccess() {
        this.failures = 0;
        this.state = CircuitState.CLOSED;
        this.firstFailureTime = 0;
    }
    recordFailure() {
        const now = Date.now();
        // Reset failure count if failures are outside the timeout window
        // This implements a sliding window (failures within timeout period)
        if (this.firstFailureTime > 0 && (now - this.firstFailureTime) > this.timeout) {
            // Failures are old, reset window
            this.failures = 1;
            this.firstFailureTime = now;
        }
        else {
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
    canAttempt() {
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
    getState() {
        return this.state;
    }
}
/**
 * Service Client
 * HTTP client with retry logic and circuit breaker
 */
export class ServiceClient {
    axiosInstance;
    config;
    circuitBreaker = null;
    constructor(config) {
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
            this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker.threshold, this.config.circuitBreaker.timeout);
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
    async request(config) {
        // Check circuit breaker
        if (this.circuitBreaker && !this.circuitBreaker.canAttempt()) {
            throw new Error('Circuit breaker is OPEN - service unavailable');
        }
        let lastError = null;
        const maxRetries = this.config.retries;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.axiosInstance.request(config);
                // Record success
                if (this.circuitBreaker) {
                    this.circuitBreaker.recordSuccess();
                }
                return response.data;
            }
            catch (error) {
                lastError = error;
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
     * GET request
     */
    async get(url, config) {
        return this.request({ ...config, method: 'GET', url });
    }
    /**
     * POST request
     */
    async post(url, data, config) {
        return this.request({ ...config, method: 'POST', url, data });
    }
    /**
     * PUT request
     */
    async put(url, data, config) {
        return this.request({ ...config, method: 'PUT', url, data });
    }
    /**
     * PATCH request
     */
    async patch(url, data, config) {
        return this.request({ ...config, method: 'PATCH', url, data });
    }
    /**
     * DELETE request
     */
    async delete(url, config) {
        return this.request({ ...config, method: 'DELETE', url });
    }
}
//# sourceMappingURL=ServiceClient.js.map