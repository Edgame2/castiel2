/**
 * Route Registration Tracker
 *
 * Tracks which routes are registered during application startup.
 * Used by health check endpoints to report route availability.
 */
export class RouteRegistrationTracker {
    registrations = new Map();
    /**
     * Record a route registration attempt
     */
    record(name, registered, options) {
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
    get(name) {
        return this.registrations.get(name);
    }
    /**
     * Get all registration statuses
     */
    getAll() {
        return Array.from(this.registrations.values());
    }
    /**
     * Get summary statistics
     */
    getSummary() {
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
    clear() {
        this.registrations.clear();
    }
}
/**
 * Singleton instance
 */
let trackerInstance = null;
/**
 * Get the global route registration tracker
 */
export function getRouteRegistrationTracker() {
    if (!trackerInstance) {
        trackerInstance = new RouteRegistrationTracker();
    }
    return trackerInstance;
}
/**
 * Reset the tracker (useful for testing)
 */
export function resetRouteRegistrationTracker() {
    trackerInstance = null;
}
//# sourceMappingURL=route-registration-tracker.js.map