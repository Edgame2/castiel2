/**
 * Email Template Validation Schemas
 * Zod schemas for request/response validation
 */

import { z } from 'zod';

/**
 * Placeholder Definition Schema
 */
export const PlaceholderDefinitionSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/, 'Placeholder name must contain only letters, numbers, and underscores'),
  description: z.string().min(1).max(500),
  example: z.string().max(200),
  required: z.boolean(),
});

/**
 * Create Template Schema
 */
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Template name must contain only lowercase letters, numbers, and hyphens'),
  language: z.string().length(2).regex(/^[a-z]{2}$/, 'Language must be a 2-letter ISO 639-1 code'),
  displayName: z.string().min(1).max(200),
  category: z.enum(['notifications', 'invitations', 'alerts', 'system']),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().min(1),
  fromEmail: z.string().email().optional(),
  fromName: z.string().max(200).optional(),
  replyTo: z.string().email().optional(),
  placeholders: z.array(PlaceholderDefinitionSchema).min(0),
  emailProviderId: z.string().uuid().optional(),
  isBaseTemplate: z.boolean().optional(),
  tenantId: z.string().optional(),
});

/**
 * Update Template Schema
 */
export const UpdateTemplateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  category: z.enum(['notifications', 'invitations', 'alerts', 'system']).optional(),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlBody: z.string().min(1).optional(),
  textBody: z.string().min(1).optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().max(200).optional(),
  replyTo: z.string().email().optional(),
  placeholders: z.array(PlaceholderDefinitionSchema).optional(),
  emailProviderId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Test Template Schema
 */
export const TestTemplateSchema = z.object({
  placeholders: z.record(z.string(), z.any()),
});

/**
 * Duplicate Template Schema
 */
export const DuplicateTemplateSchema = z.object({
  language: z.string().length(2).regex(/^[a-z]{2}$/, 'Language must be a 2-letter ISO 639-1 code'),
  displayName: z.string().min(1).max(200).optional(),
  translate: z.boolean().optional(),
});

/**
 * Template Status Schema
 */
export const TemplateStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Template Filters Schema
 */
export const TemplateFiltersSchema = z.object({
  tenantId: z.string().optional(),
  category: z.enum(['notifications', 'invitations', 'alerts', 'system']).optional(),
  language: z.string().length(2).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Template Response Schema
 */
export const EmailTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  name: z.string(),
  language: z.string(),
  displayName: z.string(),
  category: z.string(),
  description: z.string().optional(),
  subject: z.string(),
  htmlBody: z.string(),
  textBody: z.string(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  placeholders: z.array(PlaceholderDefinitionSchema),
  emailProviderId: z.string().uuid().optional(),
  isBaseTemplate: z.boolean(),
  fallbackLanguage: z.string(),
  createdBy: z.object({
    type: z.literal('super_admin'),
    userId: z.string(),
    name: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.object({
    userId: z.string(),
    name: z.string(),
  }).optional(),
  isActive: z.boolean(),
});

/**
 * Template List Response Schema
 */
export const TemplateListResponseSchema = z.object({
  templates: z.array(EmailTemplateResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

/**
 * Template Test Response Schema
 */
export const TemplateTestResponseSchema = z.object({
  subject: z.string(),
  htmlBody: z.string(),
  textBody: z.string(),
  placeholders: z.object({
    provided: z.array(z.string()),
    missing: z.array(z.string()),
    unused: z.array(z.string()),
  }),
});

/**
 * Language Variants Response Schema
 */
export const LanguageVariantsResponseSchema = z.object({
  templateName: z.string(),
  languages: z.array(z.object({
    language: z.string(),
    templateId: z.string().uuid(),
    displayName: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
});







