/**
 * Route Registration Error Handler
 * Provides consistent error handling for route registration failures
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';

export interface RouteRegistrationErrorContext {
  routeName: string;
  operation: string;
  dependencies?: string[];
  criticality?: 'critical' | 'optional';
  prefix?: string;
}

/**
 * Handle route registration errors consistently
 */
export function handleRouteRegistrationError(
  error: unknown,
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  context: RouteRegistrationErrorContext
): void {
  const {
    routeName,
    operation,
    dependencies = [],
    criticality = 'optional',
    prefix = '/api/v1',
  } = context;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Track exception in monitoring
  monitoring.trackException(
    error instanceof Error ? error : new Error(errorMessage),
    {
      operation: `route-registration.${operation}`,
      routeName,
      dependencies: dependencies.join(', '),
      criticality,
      prefix,
    }
  );

  // Log based on criticality
  if (criticality === 'critical') {
    server.log.error(
      {
        err: error,
        routeName,
        operation,
        dependencies,
        prefix,
      },
      `❌ Critical route registration failed: ${routeName}`
    );
  } else {
    server.log.warn(
      {
        err: error,
        routeName,
        operation,
        dependencies,
        prefix,
      },
      `⚠️  Optional route registration failed: ${routeName}`
    );
  }

  // In production, fail fast on critical route failures
  if (criticality === 'critical' && process.env.NODE_ENV === 'production') {
    server.log.fatal(
      `FATAL: Critical route "${routeName}" failed to register. Application cannot start.`
    );
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

/**
 * Wrap route registration with error handling
 */
export async function withRouteErrorHandling<T>(
  fn: () => Promise<T>,
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  context: RouteRegistrationErrorContext
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleRouteRegistrationError(error, server, monitoring, context);
    return null;
  }
}
