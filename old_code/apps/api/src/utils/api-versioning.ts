/**
 * API Versioning Utility
 * Manages API versioning strategy, deprecation, and backward compatibility
 */

import type { IMonitoringProvider } from '@castiel/monitoring';

export type ApiVersion = string; // e.g., 'v1', 'v2'

export interface VersionInfo {
  version: ApiVersion;
  status: 'current' | 'deprecated' | 'sunset';
  deprecatedAt?: Date;
  sunsetAt?: Date;
  replacementVersion?: ApiVersion;
  deprecationNotice?: string;
  migrationGuide?: string;
}

export interface VersionUsage {
  version: ApiVersion;
  endpoint: string;
  method: string;
  tenantId?: string;
  userId?: string;
  timestamp: Date;
}

export class ApiVersioningService {
  private supportedVersions: Map<ApiVersion, VersionInfo> = new Map();
  private currentVersion: ApiVersion;
  private monitoring: IMonitoringProvider;
  private versionUsage: VersionUsage[] = [];
  private readonly MAX_USAGE_TRACKING = 1000; // Keep last 1000 usage records

  constructor(monitoring: IMonitoringProvider, currentVersion: ApiVersion = 'v1') {
    this.monitoring = monitoring;
    this.currentVersion = currentVersion;
    this.initializeVersions();
  }

  /**
   * Initialize supported API versions
   */
  private initializeVersions(): void {
    // Current version: v1
    this.supportedVersions.set('v1', {
      version: 'v1',
      status: 'current',
    });

    // Future versions can be added here as they're introduced
    // Example:
    // this.supportedVersions.set('v2', {
    //   version: 'v2',
    //   status: 'current',
    // });
  }

  /**
   * Get current API version
   */
  getCurrentVersion(): ApiVersion {
    return this.currentVersion;
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): ApiVersion[] {
    return Array.from(this.supportedVersions.keys());
  }

  /**
   * Get version info for a specific version
   */
  getVersionInfo(version: ApiVersion): VersionInfo | undefined {
    return this.supportedVersions.get(version);
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: ApiVersion): boolean {
    return this.supportedVersions.has(version);
  }

  /**
   * Check if a version is deprecated
   */
  isVersionDeprecated(version: ApiVersion): boolean {
    const info = this.supportedVersions.get(version);
    if (!info) return false;
    return info.status === 'deprecated' || info.status === 'sunset';
  }

  /**
   * Check if a version is sunset (no longer supported)
   */
  isVersionSunset(version: ApiVersion): boolean {
    const info = this.supportedVersions.get(version);
    if (!info) return false;
    return info.status === 'sunset';
  }

  /**
   * Get deprecation warning for a version
   */
  getDeprecationWarning(version: ApiVersion): string | undefined {
    const info = this.supportedVersions.get(version);
    if (!info || info.status === 'current') return undefined;

    if (info.status === 'sunset') {
      return `API version ${version} has been sunset and is no longer supported. Please upgrade to ${info.replacementVersion || this.currentVersion}.`;
    }

    if (info.status === 'deprecated') {
      const warning = `API version ${version} is deprecated`;
      if (info.replacementVersion) {
        return `${warning}. Please migrate to ${info.replacementVersion}.`;
      }
      if (info.sunsetAt) {
        return `${warning} and will be sunset on ${info.sunsetAt.toISOString()}.`;
      }
      return warning;
    }

    return undefined;
  }

  /**
   * Track version usage for analytics
   */
  trackVersionUsage(usage: Omit<VersionUsage, 'timestamp'>): void {
    const usageRecord: VersionUsage = {
      ...usage,
      timestamp: new Date(),
    };

    this.versionUsage.push(usageRecord);

    // Keep only last N records
    if (this.versionUsage.length > this.MAX_USAGE_TRACKING) {
      this.versionUsage = this.versionUsage.slice(-this.MAX_USAGE_TRACKING);
    }

    // Track in monitoring
    this.monitoring.trackEvent('api.version.usage', {
      version: usage.version,
      endpoint: usage.endpoint,
      method: usage.method,
      tenantId: usage.tenantId,
      userId: usage.userId,
    });
  }

  /**
   * Get version usage statistics
   */
  getVersionUsageStats(): {
    total: number;
    byVersion: Map<ApiVersion, number>;
    byEndpoint: Map<string, number>;
  } {
    const byVersion = new Map<ApiVersion, number>();
    const byEndpoint = new Map<string, number>();

    for (const usage of this.versionUsage) {
      byVersion.set(usage.version, (byVersion.get(usage.version) || 0) + 1);
      byEndpoint.set(usage.endpoint, (byEndpoint.get(usage.endpoint) || 0) + 1);
    }

    return {
      total: this.versionUsage.length,
      byVersion,
      byEndpoint,
    };
  }

  /**
   * Deprecate a version (for future use)
   */
  deprecateVersion(
    version: ApiVersion,
    options: {
      replacementVersion?: ApiVersion;
      sunsetAt?: Date;
      deprecationNotice?: string;
      migrationGuide?: string;
    }
  ): void {
    const info = this.supportedVersions.get(version);
    if (!info) {
      throw new Error(`Version ${version} is not supported`);
    }

    this.supportedVersions.set(version, {
      ...info,
      status: 'deprecated',
      deprecatedAt: new Date(),
      sunsetAt: options.sunsetAt,
      replacementVersion: options.replacementVersion,
      deprecationNotice: options.deprecationNotice,
      migrationGuide: options.migrationGuide,
    });

    this.monitoring.trackEvent('api.version.deprecated', {
      version,
      replacementVersion: options.replacementVersion,
      sunsetAt: options.sunsetAt?.toISOString(),
    });
  }

  /**
   * Sunset a version (for future use)
   */
  sunsetVersion(version: ApiVersion): void {
    const info = this.supportedVersions.get(version);
    if (!info) {
      throw new Error(`Version ${version} is not supported`);
    }

    this.supportedVersions.set(version, {
      ...info,
      status: 'sunset',
      sunsetAt: new Date(),
    });

    this.monitoring.trackEvent('api.version.sunset', {
      version,
    });
  }

  /**
   * Add a new version (for future use)
   */
  addVersion(version: ApiVersion, info: Omit<VersionInfo, 'version'>): void {
    this.supportedVersions.set(version, {
      ...info,
      version,
    });

    this.monitoring.trackEvent('api.version.added', {
      version,
      status: info.status,
    });
  }
}

/**
 * Extract API version from request headers or URL
 */
export function extractApiVersion(request: {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
}): ApiVersion | null {
  // Try X-API-Version header first
  const apiVersionHeader = request.headers['x-api-version'];
  if (apiVersionHeader) {
    const version = Array.isArray(apiVersionHeader) ? apiVersionHeader[0] : apiVersionHeader;
    return normalizeVersion(version);
  }

  // Try Accept-Version header (alternative standard)
  const acceptVersionHeader = request.headers['accept-version'];
  if (acceptVersionHeader) {
    const version = Array.isArray(acceptVersionHeader) ? acceptVersionHeader[0] : acceptVersionHeader;
    return normalizeVersion(version);
  }

  // Try to extract from URL path (e.g., /api/v1/...)
  if (request.url) {
    const urlMatch = request.url.match(/\/api\/(v\d+)\//);
    if (urlMatch && urlMatch[1]) {
      return normalizeVersion(urlMatch[1]);
    }
  }

  return null;
}

/**
 * Normalize version string (e.g., '1' -> 'v1', 'v1' -> 'v1')
 */
function normalizeVersion(version: string): ApiVersion {
  const trimmed = version.trim().toLowerCase();
  if (trimmed.startsWith('v')) {
    return trimmed as ApiVersion;
  }
  return `v${trimmed}` as ApiVersion;
}

/**
 * Get default version (current version)
 */
export function getDefaultVersion(): ApiVersion {
  return 'v1';
}
