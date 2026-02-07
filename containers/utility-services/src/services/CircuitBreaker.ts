/**
 * Circuit Breaker
 * 
 * Prevents cascading failures by opening circuit after threshold failures
 */

import { getConfig } from '../config/index.js';

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Open circuit after N failures
  resetTimeout: number; // Milliseconds before attempting half-open
  halfOpenMaxAttempts: number; // Max attempts in half-open state
}

export class CircuitBreaker {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private options: CircuitBreakerOptions;
  private config = getConfig();

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this.options = {
      failureThreshold: options?.failureThreshold || 5,
      resetTimeout: options?.resetTimeout || 60000, // 1 minute
      halfOpenMaxAttempts: options?.halfOpenMaxAttempts || 3,
      ...options,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    circuitKey: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(circuitKey);

    // Check if circuit is open
    if (state.state === 'OPEN') {
      if (state.nextAttemptTime && new Date() < state.nextAttemptTime) {
        // Circuit still open, use fallback or throw
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${circuitKey}`);
      } else {
        // Time to try half-open
        state.state = 'HALF_OPEN';
        state.failureCount = 0;
      }
    }

    try {
      const result = await fn();
      
      // Success - reset circuit if it was half-open
      if (state.state === 'HALF_OPEN') {
        this.resetCircuit(circuitKey);
      } else if (state.state === 'CLOSED') {
        // Reset failure count on success
        state.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(circuitKey);
      
      // If in half-open and exceeded attempts, open circuit
      if (state.state === 'HALF_OPEN' && state.failureCount >= this.options.halfOpenMaxAttempts) {
        this.openCircuit(circuitKey);
      }

      // Use fallback if available
      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Get current state for a circuit
   */
  private getState(circuitKey: string): CircuitBreakerState {
    if (!this.circuits.has(circuitKey)) {
      this.circuits.set(circuitKey, {
        state: 'CLOSED',
        failureCount: 0,
      });
    }
    return this.circuits.get(circuitKey)!;
  }

  /**
   * Record a failure
   */
  private recordFailure(circuitKey: string): void {
    const state = this.getState(circuitKey);
    state.failureCount++;
    state.lastFailureTime = new Date();

    // Open circuit if threshold exceeded
    if (state.state === 'CLOSED' && state.failureCount >= this.options.failureThreshold) {
      this.openCircuit(circuitKey);
    }
  }

  /**
   * Open circuit
   */
  private openCircuit(circuitKey: string): void {
    const state = this.getState(circuitKey);
    state.state = 'OPEN';
    state.nextAttemptTime = new Date(Date.now() + this.options.resetTimeout);
  }

  /**
   * Reset circuit to closed
   */
  resetCircuit(circuitKey: string): void {
    const state = this.getState(circuitKey);
    state.state = 'CLOSED';
    state.failureCount = 0;
    state.lastFailureTime = undefined;
    state.nextAttemptTime = undefined;
  }

  /**
   * Get circuit state (for monitoring)
   */
  getCircuitState(circuitKey: string): CircuitBreakerState {
    return { ...this.getState(circuitKey) };
  }

  /**
   * Check if circuit is open
   */
  isOpen(circuitKey: string): boolean {
    const state = this.getState(circuitKey);
    return state.state === 'OPEN' && 
           state.nextAttemptTime !== undefined && 
           new Date() < state.nextAttemptTime;
  }
}

