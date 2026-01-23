/**
 * Email Rendering Service
 * Handles template rendering with Mustache syntax
 */
import { EmailTemplateDocument, RenderedTemplate, TemplateTestResult } from '../types/email-template.types.js';
/**
 * Validation result for placeholders
 */
interface ValidationResult {
    valid: boolean;
    missing: string[];
    unused: string[];
}
/**
 * Email Rendering Service
 */
export declare class EmailRenderingService {
    /**
     * Render template with placeholders
     */
    render(template: EmailTemplateDocument, placeholders: Record<string, any>): Promise<RenderedTemplate>;
    /**
     * Render a string template with placeholders
     */
    private renderString;
    /**
     * Validate placeholder values
     */
    validatePlaceholders(template: EmailTemplateDocument, placeholders: Record<string, any>): ValidationResult;
    /**
     * Test template rendering with validation
     */
    testTemplate(template: EmailTemplateDocument, placeholders: Record<string, any>): TemplateTestResult;
    /**
     * Extract placeholders from template string
     */
    extractPlaceholders(template: string): string[];
}
export {};
//# sourceMappingURL=email-rendering.service.d.ts.map