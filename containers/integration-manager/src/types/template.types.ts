/**
 * Template Service types
 * Core data model for template management
 */

export enum TemplateType {
  CONTEXT = 'context', // Context templates for AI
  EMAIL = 'email', // Email templates
  DOCUMENT = 'document', // Document templates
  CODE = 'code', // Code templates
  REPORT = 'report', // Report templates
}

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
}

/**
 * Template
 */
export interface Template {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: TemplateType;
  category?: string; // Category for grouping
  content: string; // Template content with {{variable}} syntax
  variables?: TemplateVariable[]; // Required/optional variables
  version: number; // Version number
  status: TemplateStatus;
  isDefault: boolean; // Whether this is the default version
  organizationId?: string; // Legacy: may exist on existing Cosmos documents
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Template Variable
 */
export interface TemplateVariable {
  name: string; // Variable name (without {{}})
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

/**
 * Template Version
 */
export interface TemplateVersion {
  id: string;
  tenantId: string; // Partition key
  templateId: string; // Reference to template
  version: number;
  content: string;
  variables?: TemplateVariable[];
  changelog?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Context Template (specialized for AI context)
 */
export interface ContextTemplate extends Template {
  type: TemplateType.CONTEXT;
  contextType?: string; // Type of context (e.g., 'project', 'user', 'conversation')
  sections?: ContextSection[]; // Structured sections
}

/**
 * Context Section
 */
export interface ContextSection {
  id: string;
  name: string;
  description?: string;
  content: string;
  order: number;
  required: boolean;
}

/**
 * Email Template (specialized for emails)
 */
export interface EmailTemplate extends Template {
  type: TemplateType.EMAIL;
  subject: string; // Email subject template
  htmlContent?: string; // HTML email content
  textContent?: string; // Plain text email content
  from?: string; // Default from address
  replyTo?: string; // Default reply-to address
}

/**
 * Document Template (specialized for documents)
 */
export interface DocumentTemplate extends Template {
  type: TemplateType.DOCUMENT;
  format: 'html' | 'pdf' | 'docx' | 'markdown';
  styles?: Record<string, any>; // Template styles
  sections?: DocumentSection[]; // Document sections
}

/**
 * Document Section
 */
export interface DocumentSection {
  id: string;
  name: string;
  content: string;
  order: number;
  pageBreak?: boolean;
}

/**
 * Create template input
 */
export interface CreateTemplateInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: TemplateType;
  category?: string;
  content: string;
  variables?: TemplateVariable[];
  tags?: string[];
  metadata?: Record<string, any>;
  // Type-specific fields
  subject?: string; // For email templates
  htmlContent?: string; // For email templates
  textContent?: string; // For email templates
  format?: 'html' | 'pdf' | 'docx' | 'markdown'; // For document templates
  contextType?: string; // For context templates
  sections?: Array<{ name: string; content: string; order: number; required?: boolean }>; // For context/document templates
}

/**
 * Update template input
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  variables?: TemplateVariable[];
  status?: TemplateStatus;
  tags?: string[];
  metadata?: Record<string, any>;
  // Type-specific fields
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  format?: 'html' | 'pdf' | 'docx' | 'markdown';
  contextType?: string;
  sections?: Array<{ id?: string; name: string; content: string; order: number; required?: boolean }>;
}

/**
 * Render template input
 */
export interface RenderTemplateInput {
  tenantId: string;
  templateId: string;
  variables: Record<string, any>;
  version?: number; // Specific version, or latest if not specified
}

