/**
 * Email Template Types
 *
 * TypeScript interfaces for email template documents and related types.
 */
/**
 * Placeholder definition for email templates
 */
export interface PlaceholderDefinition {
    name: string;
    description: string;
    example: string;
    required: boolean;
}
/**
 * Email template document stored in Cosmos DB
 */
export interface EmailTemplateDocument {
    id: string;
    tenantId: string;
    name: string;
    language: string;
    displayName: string;
    category: string;
    description?: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    placeholders: PlaceholderDefinition[];
    emailProviderId?: string;
    baseTemplateName?: string;
    isBaseTemplate: boolean;
    fallbackLanguage?: string;
    createdBy: {
        type: 'super_admin';
        userId: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    updatedBy?: {
        userId: string;
        name: string;
    };
    isActive: boolean;
}
/**
 * Create template input
 */
export interface CreateTemplateInput {
    name: string;
    language: string;
    displayName: string;
    category: string;
    description?: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    placeholders: PlaceholderDefinition[];
    emailProviderId?: string;
    isBaseTemplate?: boolean;
    tenantId?: string;
}
/**
 * Update template input
 */
export interface UpdateTemplateInput {
    displayName?: string;
    category?: string;
    description?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    placeholders?: PlaceholderDefinition[];
    emailProviderId?: string;
    isActive?: boolean;
}
/**
 * Template filters for listing
 */
export interface TemplateFilters {
    tenantId?: string;
    category?: string;
    language?: string;
    isActive?: boolean;
    search?: string;
}
/**
 * Pagination options
 */
export interface PaginationOptions {
    limit?: number;
    offset?: number;
}
/**
 * Paginated result
 */
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
/**
 * Rendered template result
 */
export interface RenderedTemplate {
    subject: string;
    htmlBody: string;
    textBody: string;
}
/**
 * Template test result
 */
export interface TemplateTestResult {
    subject: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        provided: string[];
        missing: string[];
        unused: string[];
    };
}
/**
 * Language variant info
 */
export interface LanguageVariant {
    language: string;
    templateId: string;
    displayName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
/**
 * Email send parameters
 */
export interface EmailSendParams {
    template: EmailTemplateDocument;
    rendered: RenderedTemplate;
    to: string | string[];
    tenantId: string;
    userId?: string;
    cc?: string[];
    bcc?: string[];
}
/**
 * Email send result
 */
export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
//# sourceMappingURL=email-template.types.d.ts.map