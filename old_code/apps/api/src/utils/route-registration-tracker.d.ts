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
export declare class RouteRegistrationTracker {
    private registrations;
    /**
     * Record a route registration attempt
     */
    record(name: string, registered: boolean, options?: {
        prefix?: string;
        reason?: string;
        dependencies?: string[];
    }): void;
    /**
     * Get registration status for a specific route group
     */
    get(name: string): RouteRegistrationStatus | undefined;
    /**
     * Get all registration statuses
     */
    getAll(): RouteRegistrationStatus[];
    /**
     * Get summary statistics
     */
    getSummary(): {
        total: number;
        registered: number;
        notRegistered: number;
        registeredRoutes: string[];
        missingRoutes: string[];
    };
    /**
     * Clear all registrations (useful for testing)
     */
    clear(): void;
}
/**
 * Get the global route registration tracker
 */
export declare function getRouteRegistrationTracker(): RouteRegistrationTracker;
/**
 * Reset the tracker (useful for testing)
 */
export declare function resetRouteRegistrationTracker(): void;
//# sourceMappingURL=route-registration-tracker.d.ts.map