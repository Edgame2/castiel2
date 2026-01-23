/**
 * Route Registration Tracker
 * 
 * Tracks which routes are registered during application startup.
 * Used by health check endpoints to report route availability.
 */

export interface RouteRegistrationStatus {
  name: string;
  prefix: string;
  registered: boolean;
  reason?: string;
  dependencies?: string[];
}

export class RouteRegistrationTracker {
  private registrations: Map<string, RouteRegistrationStatus> = new Map();

  /**
   * Record a route registration attempt
   */
  record(
    name: string,
    registered: boolean,
    options?: {
      prefix?: string;
      reason?: string;
      dependencies?: string[];
    }
  ): void {
    this.registrations.set(name, {
      name,
      prefix: options?.prefix || '/api/v1',
      registered,
      reason: options?.reason,
      dependencies: options?.dependencies,
    });
  }

  /**
   * Get registration status for a specific route group
   */
  get(name: string): RouteRegistrationStatus | undefined {
    return this.registrations.get(name);
  }

  /**
   * Get all registration statuses
   */
  getAll(): RouteRegistrationStatus[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    registered: number;
    notRegistered: number;
    registeredRoutes: string[];
    missingRoutes: string[];
  } {
    const all = this.getAll();
    const registered = all.filter(r => r.registered);
    const notRegistered = all.filter(r => !r.registered);

    return {
      total: all.length,
      registered: registered.length,
      notRegistered: notRegistered.length,
      registeredRoutes: registered.map(r => r.name),
      missingRoutes: notRegistered.map(r => r.name),
    };
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.registrations.clear();
  }
}

/**
 * Singleton instance
 */
let trackerInstance: RouteRegistrationTracker | null = null;

/**
 * Get the global route registration tracker
 */
export function getRouteRegistrationTracker(): RouteRegistrationTracker {
  if (!trackerInstance) {
    trackerInstance = new RouteRegistrationTracker();
  }
  return trackerInstance;
}

/**
 * Reset the tracker (useful for testing)
 */
export function resetRouteRegistrationTracker(): void {
  trackerInstance = null;
}


