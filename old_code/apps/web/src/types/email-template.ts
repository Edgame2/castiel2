/**
 * Email Template Types for Frontend
 */

export interface PlaceholderDefinition {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  language: string;
  displayName: string;
  category: 'notifications' | 'invitations' | 'alerts' | 'system';
  description?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  placeholders: PlaceholderDefinition[];
  emailProviderId?: string;
  isBaseTemplate: boolean;
  fallbackLanguage: string;
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

export interface CreateEmailTemplateInput {
  name: string;
  language: string;
  displayName: string;
  category: 'notifications' | 'invitations' | 'alerts' | 'system';
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

export interface UpdateEmailTemplateInput {
  displayName?: string;
  category?: 'notifications' | 'invitations' | 'alerts' | 'system';
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

export interface EmailTemplateListResponse {
  templates: EmailTemplate[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface EmailTemplateFilters {
  tenantId?: string;
  category?: 'notifications' | 'invitations' | 'alerts' | 'system';
  language?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LanguageVariant {
  language: string;
  templateId: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageVariantsResponse {
  templateName: string;
  languages: LanguageVariant[];
}

export interface TemplateTestInput {
  placeholders: Record<string, any>;
}

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

export interface DuplicateTemplateInput {
  language: string;
  displayName?: string;
  translate?: boolean;
}







