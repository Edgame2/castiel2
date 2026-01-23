/**
 * Content Generation - Type Guards
 *
 * Runtime type validation functions for content generation types
 */
/**
 * Type guard for DocumentFormat
 */
export function isDocumentFormat(value) {
    return (typeof value === 'string' &&
        ['google_slides', 'google_docs', 'word', 'powerpoint'].includes(value));
}
/**
 * Type guard for TemplateStatus
 */
export function isTemplateStatus(value) {
    return (typeof value === 'string' &&
        ['draft', 'active', 'archived'].includes(value));
}
/**
 * Type guard for PlaceholderType
 */
export function isPlaceholderType(value) {
    return (typeof value === 'string' &&
        ['text', 'number', 'email', 'domain', 'list', 'chart', 'image'].includes(value));
}
/**
 * Type guard for GenerationJobStatus
 */
export function isGenerationJobStatus(value) {
    return (typeof value === 'string' &&
        ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(value));
}
/**
 * Type guard for PlaceholderDefinition
 */
export function isPlaceholderDefinition(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.name === 'string' &&
        value.name.length > 0 &&
        isPlaceholderType(value.type) &&
        Array.isArray(value.locations) &&
        (value.defaultValue === undefined || typeof value.defaultValue === 'string'));
}
/**
 * Type guard for PlaceholderConfiguration
 */
export function isPlaceholderConfiguration(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.placeholderName === 'string' &&
        value.placeholderName.length > 0 &&
        typeof value.description === 'string' &&
        value.description.length > 0 &&
        typeof value.isRequired === 'boolean' &&
        (value.typeOverride === undefined || isPlaceholderType(value.typeOverride)) &&
        (value.tone === undefined || typeof value.tone === 'string') &&
        (value.temperature === undefined || (typeof value.temperature === 'number' && value.temperature >= 0 && value.temperature <= 2)) &&
        (value.constraints === undefined || typeof value.constraints === 'object') &&
        (value.chartConfig === undefined || typeof value.chartConfig === 'object') &&
        (value.contextTemplateId === undefined || typeof value.contextTemplateId === 'string'));
}
/**
 * Type guard for TemplateVersion
 */
export function isTemplateVersion(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.versionNumber === 'number' &&
        value.versionNumber > 0 &&
        typeof value.createdAt === 'string' &&
        typeof value.createdBy === 'string' &&
        typeof value.changes === 'string' &&
        value.snapshot &&
        typeof value.snapshot === 'object' &&
        Array.isArray(value.snapshot.placeholders) &&
        Array.isArray(value.snapshot.dominantColors));
}
/**
 * Type guard for DocumentTemplate
 */
export function isDocumentTemplate(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.id === 'string' &&
        value.id.length > 0 &&
        typeof value.tenantId === 'string' &&
        value.tenantId.length > 0 &&
        typeof value.userId === 'string' &&
        value.userId.length > 0 &&
        typeof value.name === 'string' &&
        value.name.length > 0 &&
        isDocumentFormat(value.documentFormat) &&
        typeof value.sourceDocumentId === 'string' &&
        value.sourceDocumentId.length > 0 &&
        Array.isArray(value.dominantColors) &&
        Array.isArray(value.placeholders) &&
        Array.isArray(value.placeholderConfigs) &&
        Array.isArray(value.versions) &&
        typeof value.currentVersion === 'number' &&
        isTemplateStatus(value.status) &&
        typeof value.createdAt === 'string' &&
        typeof value.updatedAt === 'string');
}
/**
 * Type guard for GenerationRequest
 */
export function isGenerationRequest(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.templateId === 'string' &&
        value.templateId.length > 0 &&
        typeof value.tenantId === 'string' &&
        value.tenantId.length > 0 &&
        typeof value.userId === 'string' &&
        value.userId.length > 0 &&
        typeof value.destinationFolderId === 'string' &&
        value.destinationFolderId.length > 0 &&
        (value.destinationProvider === 'google' || value.destinationProvider === 'microsoft') &&
        (value.context === undefined || typeof value.context === 'object') &&
        (value.options === undefined || typeof value.options === 'object'));
}
/**
 * Type guard for GenerationJob
 */
export function isGenerationJob(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.id === 'string' &&
        value.id.length > 0 &&
        typeof value.templateId === 'string' &&
        value.templateId.length > 0 &&
        typeof value.tenantId === 'string' &&
        value.tenantId.length > 0 &&
        typeof value.userId === 'string' &&
        value.userId.length > 0 &&
        isGenerationJobStatus(value.status) &&
        typeof value.destinationFolderId === 'string' &&
        value.destinationFolderId.length > 0 &&
        (value.destinationProvider === 'google' || value.destinationProvider === 'microsoft') &&
        typeof value.createdAt === 'string' &&
        typeof value.retryCount === 'number' &&
        typeof value.maxRetries === 'number');
}
/**
 * Type guard for GenerationResult
 */
export function isGenerationResult(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.jobId === 'string' &&
        value.jobId.length > 0 &&
        typeof value.templateId === 'string' &&
        value.templateId.length > 0 &&
        isGenerationJobStatus(value.status) &&
        typeof value.placeholdersFilled === 'number' &&
        typeof value.placeholdersTotal === 'number' &&
        value.metadata &&
        typeof value.metadata === 'object' &&
        typeof value.metadata.generatedAt === 'string');
}
/**
 * Type guard for ExtractionRequest
 */
export function isExtractionRequest(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (isDocumentFormat(value.documentFormat) &&
        typeof value.sourceDocumentId === 'string' &&
        value.sourceDocumentId.length > 0 &&
        (value.sourceDocumentUrl === undefined || typeof value.sourceDocumentUrl === 'string') &&
        (value.includeContext === undefined || typeof value.includeContext === 'boolean') &&
        (value.contextRadius === undefined || typeof value.contextRadius === 'number'));
}
/**
 * Type guard for ExtractionResult
 */
export function isExtractionResult(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (Array.isArray(value.placeholders) &&
        Array.isArray(value.dominantColors) &&
        value.metadata &&
        typeof value.metadata === 'object' &&
        typeof value.metadata.totalMatches === 'number' &&
        typeof value.metadata.uniquePlaceholders === 'number' &&
        typeof value.metadata.extractionMethod === 'string' &&
        typeof value.metadata.extractedAt === 'string');
}
/**
 * Type guard for PlaceholderMatch
 */
export function isPlaceholderMatch(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.fullMatch === 'string' &&
        typeof value.placeholderName === 'string' &&
        value.placeholderName.length > 0 &&
        typeof value.startIndex === 'number' &&
        typeof value.endIndex === 'number' &&
        value.startIndex >= 0 &&
        value.endIndex > value.startIndex &&
        (value.context === undefined || typeof value.context === 'string'));
}
/**
 * Validate DocumentTemplate with detailed error messages
 */
export function validateDocumentTemplate(template) {
    const errors = [];
    if (!template) {
        errors.push('Template is required');
        return { valid: false, errors };
    }
    if (!isDocumentTemplate(template)) {
        if (!template.id) {
            errors.push('Template ID is required');
        }
        if (!template.tenantId) {
            errors.push('Tenant ID is required');
        }
        if (!template.userId) {
            errors.push('User ID is required');
        }
        if (!template.name) {
            errors.push('Template name is required');
        }
        if (!template.documentFormat) {
            errors.push('Document format is required');
        }
        if (!isDocumentFormat(template.documentFormat)) {
            errors.push(`Invalid document format: ${template.documentFormat}`);
        }
        if (!template.sourceDocumentId) {
            errors.push('Source document ID is required');
        }
        if (!Array.isArray(template.placeholders)) {
            errors.push('Placeholders must be an array');
        }
        if (!Array.isArray(template.placeholderConfigs)) {
            errors.push('Placeholder configs must be an array');
        }
        if (!isTemplateStatus(template.status)) {
            errors.push(`Invalid template status: ${template.status}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validate GenerationRequest with detailed error messages
 */
export function validateGenerationRequest(request) {
    const errors = [];
    if (!request) {
        errors.push('Generation request is required');
        return { valid: false, errors };
    }
    if (!isGenerationRequest(request)) {
        if (!request.templateId) {
            errors.push('Template ID is required');
        }
        if (!request.tenantId) {
            errors.push('Tenant ID is required');
        }
        if (!request.userId) {
            errors.push('User ID is required');
        }
        if (!request.destinationFolderId) {
            errors.push('Destination folder ID is required');
        }
        if (!request.destinationProvider) {
            errors.push('Destination provider is required');
        }
        else if (request.destinationProvider !== 'google' && request.destinationProvider !== 'microsoft') {
            errors.push(`Invalid destination provider: ${request.destinationProvider}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=type-guards.js.map