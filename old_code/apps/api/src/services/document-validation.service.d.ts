/**
 * Document Validation Service
 * Validates uploads against tenant settings, quotas, and global limits
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { TenantDocumentSettings, GlobalDocumentSettings, UploadValidationResult } from '../types/document.types.js';
import { BaseError } from '../utils/errors.js';
export declare class DocumentValidationError extends BaseError {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
/**
 * Document Validation Service
 */
export declare class DocumentValidationService {
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Validate file upload against tenant settings and global limits
     */
    validateUpload(fileName: string, fileSize: number, mimeType: string, tenantSettings: TenantDocumentSettings, globalSettings: GlobalDocumentSettings): Promise<UploadValidationResult>;
    /**
     * Validate file size
     */
    private validateFileSize;
    /**
     * Validate MIME type
     */
    private validateMimeType;
    /**
     * Validate file name
     */
    private validateFileName;
    /**
     * Validate storage quota
     */
    private validateQuota;
    /**
     * Validate rate limits
     */
    private validateRateLimits;
    /**
     * Check if MIME type is blocked
     */
    private isMimeTypeBlocked;
    /**
     * Check if MIME type is allowed
     */
    private isMimeTypeAllowed;
    /**
     * Validate category exists in tenant settings
     */
    validateCategory(category: string | undefined, tenantSettings: TenantDocumentSettings): {
        valid: boolean;
        error?: string;
    };
    /**
     * Validate tags against controlled vocabulary
     */
    validateTags(tags: string[], tenantSettings: TenantDocumentSettings): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate visibility level
     */
    validateVisibility(visibility: string, tenantSettings: TenantDocumentSettings): {
        valid: boolean;
        error?: string;
    };
    /**
     * Reset rate limit counters if needed
     */
    resetRateLimitCounters(tenantSettings: TenantDocumentSettings): {
        dailyReset: boolean;
        monthlyReset: boolean;
        updatedSettings: Partial<TenantDocumentSettings>;
    };
    /**
     * Increment upload counters
     */
    incrementUploadCounters(tenantSettings: TenantDocumentSettings, fileSize: number): Partial<TenantDocumentSettings>;
    /**
     * Decrement storage usage (for deletions)
     */
    decrementStorageUsage(currentUsage: number, fileSize: number): number;
    /**
     * Format bytes to human-readable string
     */
    private formatBytes;
    /**
     * Get next midnight UTC
     */
    private getNextMidnight;
    /**
     * Get next month start UTC
     */
    private getNextMonthStart;
}
//# sourceMappingURL=document-validation.service.d.ts.map