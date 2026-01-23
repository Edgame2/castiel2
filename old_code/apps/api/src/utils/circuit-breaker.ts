/**
 * Circuit Breaker Implementation
 * Prevents cascade failures by stopping requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests allowed
  OPEN = 'OPEN',         // Service failing, requests blocked
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit from half-open
  timeout: number;                // Time in ms before attempting half-open
  resetTimeout: number;           // Time in ms before resetting failure count
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 60 seconds
  resetTimeout: 300000, // 5 minutes
};

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
}

/**
 * Circuit Breaker for protecting against cascade failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private options: CircuitBreakerOptions;
  private timeoutId?: NodeJS.Timeout;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      } else {
        // Circuit is open, return fallback or throw
        if (fallback) {
          return await Promise.resolve(fallback());
        }
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return await Promise.resolve(fallback());
      }
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = undefined;
        }
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success (exponential backoff reset)
      if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, immediately open again
      this.state = CircuitState.OPEN;
      this.successes = 0;
      this.scheduleReset();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.options.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.scheduleReset();
      }
    }
  }

  /**
   * Schedule circuit reset after timeout
   */
  private scheduleReset(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      }
    }, this.options.timeout);
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    jitter?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    jitter = true,
  } = options;

  let lastError: Error | unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(delay * Math.pow(2, attempt), maxDelay);
      const finalDelay = jitter
        ? baseDelay + Math.random() * baseDelay * 0.2 // ±20% jitter
        : baseDelay;

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
}
