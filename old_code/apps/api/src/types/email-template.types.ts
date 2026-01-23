/**
 * Email Template Types
 * 
 * TypeScript interfaces for email template documents and related types.
 */

/**
 * Placeholder definition for email templates
 */
export interface PlaceholderDefinition {
  name: string;                   // e.g., "userName", "tenantName"
  description: string;            // What this placeholder represents
  example: string;                // Example value
  required: boolean;              // Whether placeholder must be provided
}

/**
 * Email template document stored in Cosmos DB
 */
export interface EmailTemplateDocument {
  // Identity
  id: string;                    // UUID
  tenantId: string;               // Partition key ("system" for system templates)
  name: string;                   // Unique template name (e.g., "welcome-email")
  language: string;                // ISO 639-1 language code (e.g., "en", "fr", "de")
  
  // Display
  displayName: string;            // User-friendly name
  category: string;               // e.g., "notifications", "invitations", "alerts"
  description?: string;           // Template description
  
  // Email content
  subject: string;                // Subject line with placeholders
  htmlBody: string;               // HTML version with placeholders
  textBody: string;               // Plain text version with placeholders
  
  // Email metadata
  fromEmail?: string;             // Optional override (defaults to provider config)
  fromName?: string;              // Optional override
  replyTo?: string;               // Optional reply-to address
  
  // Placeholder definitions
  placeholders: PlaceholderDefinition[];  // Available placeholders with descriptions
  
  // Integration
  emailProviderId?: string;       // Optional: specific email provider integration ID
  // If not specified, uses default tenant email provider from integration system
  
  // Language metadata
  baseTemplateName?: string;      // Name of base template (for language variants)
  isBaseTemplate: boolean;        // True if this is the base (default) template
  fallbackLanguage?: string;      // Fallback language if translation missing (default: "en")
  
  // Metadata
  createdBy: {
    type: 'super_admin';
    userId: string;
    name: string;
  };
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  updatedBy?: {
    userId: string;
    name: string;
  };
  
  // Status
  isActive: boolean;              // Can be disabled without deletion
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







