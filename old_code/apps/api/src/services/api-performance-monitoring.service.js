/**
 * API Performance Monitoring Service
 *
 * Tracks API response times, calculates percentiles (p50, p95, p99),
 * identifies slow endpoints, and establishes performance baselines.
 *
 * Target: p95 < 500ms, p99 < 1000ms
 */
/**
 * API Performance Monitoring Service
 */
export class APIPerformanceMonitoringService {
    monitoring;
    // Store response times per endpoint (rolling window)
    endpointResponseTimes = new Map();
    endpointErrors = new Map();
    endpointSuccesses = new Map();
    MAX_SAMPLES_PER_ENDPOINT = 1000; // Keep last 1000 samples per endpoint
    // Performance targets
    TARGET_P95 = 500; // 500ms
    TARGET_P99 = 1000; // 1000ms
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    /**
     * Record API response time for an endpoint
     */
    recordResponseTime(endpoint, method, responseTime, statusCode) {
        const key = this.getEndpointKey(endpoint, method);
        // Track response time
        if (!this.endpointResponseTimes.has(key)) {
            this.endpointResponseTimes.set(key, []);
        }
        const times = this.endpointResponseTimes.get(key);
        times.push(responseTime);
        // Keep only last N samples
        if (times.length > this.MAX_SAMPLES_PER_ENDPOINT) {
            times.shift();
        }
        // Track success/error
        const isSuccess = statusCode < 400;
        if (isSuccess) {
            this.endpointSuccesses.set(key, (this.endpointSuccesses.get(key) || 0) + 1);
        }
        else {
            this.endpointErrors.set(key, (this.endpointErrors.get(key) || 0) + 1);
        }
        // Track metric
        this.monitoring.trackMetric('api-response-time', responseTime, {
            endpoint,
            method,
            statusCode: statusCode.toString(),
            isSuccess: isSuccess.toString(),
        });
        // Track slow requests (> 1s)
        if (responseTime > 1000) {
            this.monitoring.trackEvent('api-slow-request', {
                endpoint,
                method,
                responseTime,
                statusCode,
            });
        }
        // Calculate and track percentiles periodically (every 100 requests)
        if (times.length % 100 === 0 || times.length === 1) {
            this.trackPercentiles(endpoint, method, times);
        }
    }
    /**
     * Get performance statistics for an endpoint
     */
    getEndpointStats(endpoint, method) {
        const key = this.getEndpointKey(endpoint, method);
        const times = this.endpointResponseTimes.get(key);
        if (!times || times.length === 0) {
            return null;
        }
        const sorted = [...times].sort((a, b) => a - b);
        const total = (this.endpointSuccesses.get(key) || 0) + (this.endpointErrors.get(key) || 0);
        const errors = this.endpointErrors.get(key) || 0;
        return {
            endpoint,
            method,
            totalRequests: total,
            avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            minResponseTime: Math.min(...times),
            maxResponseTime: Math.max(...times),
            errorRate: total > 0 ? (errors / total) * 100 : 0,
            successRate: total > 0 ? ((total - errors) / total) * 100 : 0,
            lastUpdated: new Date(),
        };
    }
    /**
     * Get all endpoint statistics
     */
    getAllEndpointStats() {
        const stats = [];
        for (const key of this.endpointResponseTimes.keys()) {
            const [endpoint, method] = this.parseEndpointKey(key);
            const stat = this.getEndpointStats(endpoint, method);
            if (stat) {
                stats.push(stat);
            }
        }
        return stats;
    }
    /**
     * Get slow endpoints (exceeding targets)
     */
    getSlowEndpoints() {
        const slowEndpoints = [];
        for (const key of this.endpointResponseTimes.keys()) {
            const [endpoint, method] = this.parseEndpointKey(key);
            const stats = this.getEndpointStats(endpoint, method);
            if (!stats) {
                continue;
            }
            const exceedsP95 = stats.p95 > this.TARGET_P95;
            const exceedsP99 = stats.p99 > this.TARGET_P99;
            if (exceedsP95 || exceedsP99) {
                slowEndpoints.push({
                    endpoint,
                    method,
                    p95: stats.p95,
                    p99: stats.p99,
                    avgResponseTime: stats.avgResponseTime,
                    requestCount: stats.totalRequests,
                    severity: exceedsP99 ? 'critical' : 'warning',
                    exceedsTarget: true,
                });
            }
        }
        // Sort by p95 descending
        return slowEndpoints.sort((a, b) => b.p95 - a.p95);
    }
    /**
     * Get performance baselines for all endpoints
     */
    getPerformanceBaselines() {
        const baselines = [];
        for (const key of this.endpointResponseTimes.keys()) {
            const [endpoint, method] = this.parseEndpointKey(key);
            const stats = this.getEndpointStats(endpoint, method);
            if (!stats) {
                continue;
            }
            const exceedsP95 = stats.p95 > this.TARGET_P95;
            const exceedsP99 = stats.p99 > this.TARGET_P99;
            let status;
            if (exceedsP99) {
                status = 'critical';
            }
            else if (exceedsP95) {
                status = 'warning';
            }
            else {
                status = 'healthy';
            }
            const recommendations = [];
            if (exceedsP99) {
                recommendations.push(`p99 latency (${stats.p99}ms) exceeds target (${this.TARGET_P99}ms). Consider optimizing database queries or adding caching.`);
            }
            if (exceedsP95) {
                recommendations.push(`p95 latency (${stats.p95}ms) exceeds target (${this.TARGET_P95}ms). Review endpoint implementation for optimization opportunities.`);
            }
            if (stats.avgResponseTime > this.TARGET_P95) {
                recommendations.push(`Average response time (${stats.avgResponseTime.toFixed(0)}ms) is high. Consider profiling the endpoint.`);
            }
            baselines.push({
                endpoint,
                method,
                targetP95: this.TARGET_P95,
                targetP99: this.TARGET_P99,
                currentP95: stats.p95,
                currentP99: stats.p99,
                status,
                recommendations,
            });
        }
        return baselines;
    }
    /**
     * Track percentiles for an endpoint
     */
    trackPercentiles(endpoint, method, times) {
        if (times.length < 10) {
            return;
        } // Need at least 10 samples
        const sorted = [...times].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        // Track percentiles as metrics
        this.monitoring.trackMetric('api-p50-latency', p50, { endpoint, method });
        this.monitoring.trackMetric('api-p95-latency', p95, { endpoint, method });
        this.monitoring.trackMetric('api-p99-latency', p99, { endpoint, method });
        // Track warning if exceeds targets
        if (p95 > this.TARGET_P95) {
            this.monitoring.trackEvent('api-performance-warning', {
                endpoint,
                method,
                p95,
                p99,
                targetP95: this.TARGET_P95,
                message: `p95 latency (${p95}ms) exceeds target (${this.TARGET_P95}ms)`,
            });
        }
        if (p99 > this.TARGET_P99) {
            this.monitoring.trackEvent('api-performance-critical', {
                endpoint,
                method,
                p95,
                p99,
                targetP99: this.TARGET_P99,
                message: `p99 latency (${p99}ms) exceeds target (${this.TARGET_P99}ms)`,
            });
        }
    }
    /**
     * Get endpoint key for internal storage
     */
    getEndpointKey(endpoint, method) {
        // Normalize endpoint (remove query params, trailing slashes)
        const normalized = endpoint.split('?')[0].replace(/\/$/, '') || '/';
        return `${method.toUpperCase()}:${normalized}`;
    }
    /**
     * Parse endpoint key back to endpoint and method
     */
    parseEndpointKey(key) {
        const [method, ...endpointParts] = key.split(':');
        return [endpointParts.join(':'), method];
    }
    /**
     * Reset statistics for an endpoint
     */
    resetEndpointStats(endpoint, method) {
        const key = this.getEndpointKey(endpoint, method);
        this.endpointResponseTimes.delete(key);
        this.endpointErrors.delete(key);
        this.endpointSuccesses.delete(key);
    }
    /**
     * Reset all statistics
     */
    resetAllStats() {
        this.endpointResponseTimes.clear();
        this.endpointErrors.clear();
        this.endpointSuccesses.clear();
    }
    /**
     * Get summary statistics
     */
    getSummaryStats() {
        const baselines = this.getPerformanceBaselines();
        const healthy = baselines.filter(b => b.status === 'healthy').length;
        const warning = baselines.filter(b => b.status === 'warning').length;
        const critical = baselines.filter(b => b.status === 'critical').length;
        const avgP95 = baselines.length > 0
            ? baselines.reduce((sum, b) => sum + b.currentP95, 0) / baselines.length
            : 0;
        const avgP99 = baselines.length > 0
            ? baselines.reduce((sum, b) => sum + b.currentP99, 0) / baselines.length
            : 0;
        return {
            totalEndpoints: baselines.length,
            healthyEndpoints: healthy,
            warningEndpoints: warning,
            criticalEndpoints: critical,
            avgP95AcrossEndpoints: avgP95,
            avgP99AcrossEndpoints: avgP99,
        };
    }
}
//# sourceMappingURL=api-performance-monitoring.service.js.map