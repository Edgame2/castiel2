/**
 * Document Validation Service
 * Validates uploads against tenant settings, quotas, and global limits
 */
import { SeverityLevel } from '@castiel/monitoring';
import { BaseError } from '../utils/errors.js';
export class DocumentValidationError extends BaseError {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'DocumentValidationError';
    }
}
/**
 * Document Validation Service
 */
export class DocumentValidationService {
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    /**
     * Validate file upload against tenant settings and global limits
     */
    async validateUpload(fileName, fileSize, mimeType, tenantSettings, globalSettings) {
        const errors = [];
        const warnings = [];
        // Validate file size
        const fileSizeValidation = this.validateFileSize(fileSize, tenantSettings, globalSettings);
        if (!fileSizeValidation.valid) {
            errors.push(...fileSizeValidation.errors);
        }
        warnings.push(...fileSizeValidation.warnings);
        // Validate MIME type
        const mimeTypeValidation = this.validateMimeType(mimeType, tenantSettings, globalSettings);
        if (!mimeTypeValidation.valid) {
            errors.push(...mimeTypeValidation.errors);
        }
        warnings.push(...mimeTypeValidation.warnings);
        // Validate file name
        const fileNameValidation = this.validateFileName(fileName);
        if (!fileNameValidation.valid) {
            errors.push(...fileNameValidation.errors);
        }
        warnings.push(...fileNameValidation.warnings);
        // Validate storage quota
        const quotaValidation = this.validateQuota(fileSize, tenantSettings);
        if (!quotaValidation.valid) {
            errors.push(...quotaValidation.errors);
        }
        warnings.push(...quotaValidation.warnings);
        // Validate rate limits
        const rateLimitValidation = this.validateRateLimits(tenantSettings);
        if (!rateLimitValidation.valid) {
            errors.push(...rateLimitValidation.errors);
        }
        warnings.push(...rateLimitValidation.warnings);
        const valid = errors.length === 0;
        if (!valid) {
            this.monitoring.trackTrace('Upload validation failed', SeverityLevel.Warning, {
                fileName,
                fileSize: fileSize.toString(),
                mimeType,
                errors: errors.join('; '),
            });
        }
        return {
            valid,
            errors,
            warnings,
            tenantStorageUsed: tenantSettings.currentStorageUsed,
            tenantStorageLimit: tenantSettings.maxStorageSizeBytes,
            tenantStorageAvailable: tenantSettings.maxStorageSizeBytes - tenantSettings.currentStorageUsed,
            dailyUploadCount: tenantSettings.dailyUploadCount,
            dailyUploadLimit: tenantSettings.dailyUploadLimit,
            monthlyUploadCount: tenantSettings.monthlyUploadCount,
            monthlyUploadLimit: tenantSettings.monthlyUploadLimit,
        };
    }
    /**
     * Validate file size
     */
    validateFileSize(fileSize, tenantSettings, globalSettings) {
        const errors = [];
        const warnings = [];
        // Check against global hard limit
        if (fileSize > globalSettings.globalMaxFileSizeBytes) {
            errors.push(`File size (${this.formatBytes(fileSize)}) exceeds global maximum (${this.formatBytes(globalSettings.globalMaxFileSizeBytes)})`);
        }
        // Check against tenant limit
        if (fileSize > tenantSettings.maxFileSizeBytes) {
            errors.push(`File size (${this.formatBytes(fileSize)}) exceeds tenant maximum (${this.formatBytes(tenantSettings.maxFileSizeBytes)})`);
        }
        // Warning for large files
        const warningThreshold = tenantSettings.maxFileSizeBytes * 0.8; // 80% of limit
        if (fileSize > warningThreshold && fileSize <= tenantSettings.maxFileSizeBytes) {
            warnings.push(`File size (${this.formatBytes(fileSize)}) is approaching tenant limit (${this.formatBytes(tenantSettings.maxFileSizeBytes)})`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate MIME type
     */
    validateMimeType(mimeType, tenantSettings, globalSettings) {
        const errors = [];
        const warnings = [];
        // Check system blocklist first
        if (this.isMimeTypeBlocked(mimeType, globalSettings.systemBlockedMimeTypes)) {
            errors.push(`File type '${mimeType}' is blocked by system policy`);
            return { valid: false, errors, warnings };
        }
        // Check tenant blocklist
        if (tenantSettings.blockedMimeTypes &&
            this.isMimeTypeBlocked(mimeType, tenantSettings.blockedMimeTypes)) {
            errors.push(`File type '${mimeType}' is blocked by tenant policy`);
            return { valid: false, errors, warnings };
        }
        // Check tenant allowlist (if empty, allow all not blocked)
        if (tenantSettings.acceptedMimeTypes.length > 0 &&
            !this.isMimeTypeAllowed(mimeType, tenantSettings.acceptedMimeTypes)) {
            errors.push(`File type '${mimeType}' is not in tenant's accepted types. Allowed: ${tenantSettings.acceptedMimeTypes.join(', ')}`);
        }
        // Check system allowlist (if configured)
        if (globalSettings.systemAcceptedMimeTypes.length > 0 &&
            !this.isMimeTypeAllowed(mimeType, globalSettings.systemAcceptedMimeTypes)) {
            errors.push(`File type '${mimeType}' is not in system's accepted types`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate file name
     */
    validateFileName(fileName) {
        const errors = [];
        const warnings = [];
        // Check for null/empty
        if (!fileName || fileName.trim().length === 0) {
            errors.push('File name is required');
            return { valid: false, errors, warnings };
        }
        // Check length
        if (fileName.length > 255) {
            errors.push('File name exceeds maximum length (255 characters)');
        }
        // Check for invalid characters (Windows + Unix)
        const invalidChars = /[<>:"|?*\x00-\x1F]/;
        if (invalidChars.test(fileName)) {
            errors.push('File name contains invalid characters: < > : " | ? * or control characters');
        }
        // Check for path traversal attempts
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            errors.push('File name cannot contain path traversal sequences');
        }
        // Check for reserved names (Windows)
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        const nameWithoutExt = fileName.split('.')[0];
        if (reservedNames.test(nameWithoutExt)) {
            errors.push(`File name '${nameWithoutExt}' is a reserved system name`);
        }
        // Warning for very long names
        if (fileName.length > 200) {
            warnings.push('File name is very long, consider using a shorter name');
        }
        // Warning for no extension
        if (!fileName.includes('.')) {
            warnings.push('File has no extension, MIME type detection may be inaccurate');
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate storage quota
     */
    validateQuota(fileSize, tenantSettings) {
        const errors = [];
        const warnings = [];
        const currentUsage = tenantSettings.currentStorageUsed;
        const maxStorage = tenantSettings.maxStorageSizeBytes;
        const availableStorage = maxStorage - currentUsage;
        // Check if file exceeds available storage
        if (fileSize > availableStorage) {
            errors.push(`Insufficient storage. File size (${this.formatBytes(fileSize)}) exceeds available storage (${this.formatBytes(availableStorage)}). Current usage: ${this.formatBytes(currentUsage)} / ${this.formatBytes(maxStorage)}`);
        }
        // Warning if storage is getting low
        const usagePercentage = (currentUsage / maxStorage) * 100;
        if (usagePercentage >= 90) {
            warnings.push(`Storage is ${usagePercentage.toFixed(1)}% full. Consider cleaning up old files.`);
        }
        else if (usagePercentage >= 80) {
            warnings.push(`Storage is ${usagePercentage.toFixed(1)}% full. Approaching limit.`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate rate limits
     */
    validateRateLimits(tenantSettings) {
        const errors = [];
        const warnings = [];
        const now = new Date();
        // Check if daily count needs reset
        if (now > tenantSettings.dailyUploadCountResetAt) {
            // Should be reset by calling code, but warn here
            warnings.push('Daily upload counter may need reset');
        }
        else {
            // Check daily limit
            if (tenantSettings.dailyUploadCount >= tenantSettings.dailyUploadLimit) {
                errors.push(`Daily upload limit reached (${tenantSettings.dailyUploadCount}/${tenantSettings.dailyUploadLimit}). Resets at ${tenantSettings.dailyUploadCountResetAt.toISOString()}`);
            }
            else if (tenantSettings.dailyUploadCount >=
                tenantSettings.dailyUploadLimit * 0.9) {
                warnings.push(`Approaching daily upload limit (${tenantSettings.dailyUploadCount}/${tenantSettings.dailyUploadLimit})`);
            }
        }
        // Check if monthly count needs reset
        if (now > tenantSettings.monthlyUploadCountResetAt) {
            warnings.push('Monthly upload counter may need reset');
        }
        else {
            // Check monthly limit
            if (tenantSettings.monthlyUploadCount >= tenantSettings.monthlyUploadLimit) {
                errors.push(`Monthly upload limit reached (${tenantSettings.monthlyUploadCount}/${tenantSettings.monthlyUploadLimit}). Resets at ${tenantSettings.monthlyUploadCountResetAt.toISOString()}`);
            }
            else if (tenantSettings.monthlyUploadCount >=
                tenantSettings.monthlyUploadLimit * 0.9) {
                warnings.push(`Approaching monthly upload limit (${tenantSettings.monthlyUploadCount}/${tenantSettings.monthlyUploadLimit})`);
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Check if MIME type is blocked
     */
    isMimeTypeBlocked(mimeType, blockedTypes) {
        return blockedTypes.some((blocked) => {
            if (blocked.endsWith('/*')) {
                // Wildcard match (e.g., "application/*")
                const prefix = blocked.slice(0, -2);
                return mimeType.startsWith(prefix);
            }
            return mimeType === blocked;
        });
    }
    /**
     * Check if MIME type is allowed
     */
    isMimeTypeAllowed(mimeType, allowedTypes) {
        return allowedTypes.some((allowed) => {
            // Handle catch-all wildcard
            if (allowed === '*/*') {
                return true;
            }
            // Handle type wildcards (e.g., "image/*")
            if (allowed.endsWith('/*')) {
                const prefix = allowed.slice(0, -2);
                return mimeType.startsWith(prefix);
            }
            // Exact match
            return mimeType === allowed;
        });
    }
    /**
     * Validate category exists in tenant settings
     */
    validateCategory(category, tenantSettings) {
        if (!category) {
            return { valid: true }; // Category is optional
        }
        const categoryExists = tenantSettings.categories.some((cat) => cat.id === category && cat.isActive);
        if (!categoryExists && !tenantSettings.allowCustomCategories) {
            return {
                valid: false,
                error: `Category '${category}' does not exist or is inactive. Custom categories are not allowed.`,
            };
        }
        return { valid: true };
    }
    /**
     * Validate tags against controlled vocabulary
     */
    validateTags(tags, tenantSettings) {
        const errors = [];
        if (!tags || tags.length === 0) {
            return { valid: true, errors };
        }
        // Check if controlled tags are enforced
        if (tenantSettings.controlledTags && tenantSettings.controlledTags.length > 0) {
            const invalidTags = tags.filter((tag) => !tenantSettings.controlledTags.includes(tag));
            if (invalidTags.length > 0) {
                errors.push(`Invalid tags: ${invalidTags.join(', ')}. Allowed tags: ${tenantSettings.controlledTags.join(', ')}`);
            }
        }
        // Validate tag format
        tags.forEach((tag) => {
            if (tag.length > 50) {
                errors.push(`Tag '${tag}' exceeds maximum length (50 characters)`);
            }
            if (!/^[a-zA-Z0-9-_\s]+$/.test(tag)) {
                errors.push(`Tag '${tag}' contains invalid characters. Use only letters, numbers, hyphens, underscores, and spaces.`);
            }
        });
        return { valid: errors.length === 0, errors };
    }
    /**
     * Validate visibility level
     */
    validateVisibility(visibility, tenantSettings) {
        const validLevels = ['public', 'internal', 'confidential'];
        if (!validLevels.includes(visibility)) {
            return {
                valid: false,
                error: `Invalid visibility level '${visibility}'. Must be one of: ${validLevels.join(', ')}`,
            };
        }
        // Check if public documents are allowed
        if (visibility === 'public' && !tenantSettings.allowPublicDocuments) {
            return {
                valid: false,
                error: 'Public documents are not allowed for this tenant',
            };
        }
        return { valid: true };
    }
    /**
     * Reset rate limit counters if needed
     */
    resetRateLimitCounters(tenantSettings) {
        const now = new Date();
        const updates = {};
        let dailyReset = false;
        let monthlyReset = false;
        // Reset daily counter
        if (now > tenantSettings.dailyUploadCountResetAt) {
            updates.dailyUploadCount = 0;
            updates.dailyUploadCountResetAt = this.getNextMidnight();
            dailyReset = true;
        }
        // Reset monthly counter
        if (now > tenantSettings.monthlyUploadCountResetAt) {
            updates.monthlyUploadCount = 0;
            updates.monthlyUploadCountResetAt = this.getNextMonthStart();
            monthlyReset = true;
        }
        return { dailyReset, monthlyReset, updatedSettings: updates };
    }
    /**
     * Increment upload counters
     */
    incrementUploadCounters(tenantSettings, fileSize) {
        return {
            dailyUploadCount: tenantSettings.dailyUploadCount + 1,
            monthlyUploadCount: tenantSettings.monthlyUploadCount + 1,
            currentStorageUsed: tenantSettings.currentStorageUsed + fileSize,
        };
    }
    /**
     * Decrement storage usage (for deletions)
     */
    decrementStorageUsage(currentUsage, fileSize) {
        return Math.max(0, currentUsage - fileSize);
    }
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
    /**
     * Get next midnight UTC
     */
    getNextMidnight() {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }
    /**
     * Get next month start UTC
     */
    getNextMonthStart() {
        const nextMonth = new Date();
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
        nextMonth.setUTCDate(1);
        nextMonth.setUTCHours(0, 0, 0, 0);
        return nextMonth;
    }
}
//# sourceMappingURL=document-validation.service.js.map