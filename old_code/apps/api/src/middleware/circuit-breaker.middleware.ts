import type { FastifyRequest, FastifyReply } from 'fastify';
import { CircuitBreaker, CircuitState } from '../utils/circuit-breaker.js';

/**
 * Circuit breaker instances for different services
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for a service
 */
function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 60 seconds
    }));
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Circuit breaker middleware for external service calls
 * Wraps service calls with circuit breaker protection
 */
export function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T> | T
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName);
  return breaker.execute(fn, fallback);
}

/**
 * Create circuit breaker middleware for Fastify routes
 */
export function createCircuitBreakerMiddleware(serviceName: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const breaker = getCircuitBreaker(serviceName);

    if (breaker.isOpen()) {
      reply.code(503).send({
        error: 'Service temporarily unavailable',
        message: `Circuit breaker is OPEN for ${serviceName}. Service is experiencing issues.`,
        code: 'CIRCUIT_BREAKER_OPEN',
        retryAfter: 60, // seconds
      });
      return;
    }

    // Attach circuit breaker to request for use in route handlers
    (request as any).circuitBreaker = breaker;
  };
}

/**
 * Get circuit breaker statistics for monitoring
 */
export function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  for (const [name, breaker] of circuitBreakers.entries()) {
    stats[name] = breaker.getStats();
  }
  return stats;
}
