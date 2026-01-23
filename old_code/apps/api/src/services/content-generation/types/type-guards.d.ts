/**
 * Content Generation - Type Guards
 *
 * Runtime type validation functions for content generation types
 */
import { DocumentTemplate, TemplateStatus, DocumentFormat, PlaceholderType, PlaceholderDefinition, PlaceholderConfiguration, TemplateVersion } from './template.types.js';
import { GenerationJob, GenerationJobStatus, GenerationRequest, GenerationResult } from './generation.types.js';
import { ExtractionRequest, ExtractionResult, PlaceholderMatch } from './placeholder.types.js';
/**
 * Type guard for DocumentFormat
 */
export declare function isDocumentFormat(value: any): value is DocumentFormat;
/**
 * Type guard for TemplateStatus
 */
export declare function isTemplateStatus(value: any): value is TemplateStatus;
/**
 * Type guard for PlaceholderType
 */
export declare function isPlaceholderType(value: any): value is PlaceholderType;
/**
 * Type guard for GenerationJobStatus
 */
export declare function isGenerationJobStatus(value: any): value is GenerationJobStatus;
/**
 * Type guard for PlaceholderDefinition
 */
export declare function isPlaceholderDefinition(value: any): value is PlaceholderDefinition;
/**
 * Type guard for PlaceholderConfiguration
 */
export declare function isPlaceholderConfiguration(value: any): value is PlaceholderConfiguration;
/**
 * Type guard for TemplateVersion
 */
export declare function isTemplateVersion(value: any): value is TemplateVersion;
/**
 * Type guard for DocumentTemplate
 */
export declare function isDocumentTemplate(value: any): value is DocumentTemplate;
/**
 * Type guard for GenerationRequest
 */
export declare function isGenerationRequest(value: any): value is GenerationRequest;
/**
 * Type guard for GenerationJob
 */
export declare function isGenerationJob(value: any): value is GenerationJob;
/**
 * Type guard for GenerationResult
 */
export declare function isGenerationResult(value: any): value is GenerationResult;
/**
 * Type guard for ExtractionRequest
 */
export declare function isExtractionRequest(value: any): value is ExtractionRequest;
/**
 * Type guard for ExtractionResult
 */
export declare function isExtractionResult(value: any): value is ExtractionResult;
/**
 * Type guard for PlaceholderMatch
 */
export declare function isPlaceholderMatch(value: any): value is PlaceholderMatch;
/**
 * Validate DocumentTemplate with detailed error messages
 */
export declare function validateDocumentTemplate(template: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate GenerationRequest with detailed error messages
 */
export declare function validateGenerationRequest(request: any): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=type-guards.d.ts.map