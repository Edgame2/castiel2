import apiClient from './client';
import {
  EmailTemplate,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  EmailTemplateListResponse,
  EmailTemplateFilters,
  LanguageVariantsResponse,
  TemplateTestInput,
  TemplateTestResult,
  DuplicateTemplateInput,
} from '@/types/email-template';

/**
 * Email Template API endpoints
 */
export const emailTemplateApi = {
  /**
   * Get paginated list of email templates with filters
   */
  getTemplates: async (filters?: EmailTemplateFilters): Promise<EmailTemplateListResponse> => {
    const response = await apiClient.get<EmailTemplateListResponse>(
      '/api/admin/email-templates',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get a single template by ID
   */
  getTemplate: async (id: string, tenantId?: string): Promise<EmailTemplate> => {
    const response = await apiClient.get<EmailTemplate>(
      `/api/admin/email-templates/${id}`,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Get template by name and language
   */
  getTemplateByLanguage: async (
    name: string,
    language: string,
    tenantId?: string
  ): Promise<EmailTemplate> => {
    const response = await apiClient.get<EmailTemplate>(
      `/api/admin/email-templates/${name}/${language}`,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Get all language variants of a template
   */
  getTemplateLanguages: async (
    name: string,
    tenantId?: string
  ): Promise<LanguageVariantsResponse> => {
    const response = await apiClient.get<LanguageVariantsResponse>(
      `/api/admin/email-templates/${name}/languages`,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Create a new email template
   */
  createTemplate: async (data: CreateEmailTemplateInput): Promise<EmailTemplate> => {
    const response = await apiClient.post<EmailTemplate>(
      '/api/admin/email-templates',
      data
    );
    return response.data;
  },

  /**
   * Update an existing template
   */
  updateTemplate: async (
    id: string,
    data: UpdateEmailTemplateInput,
    tenantId?: string
  ): Promise<EmailTemplate> => {
    const response = await apiClient.patch<EmailTemplate>(
      `/api/admin/email-templates/${id}`,
      data,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Delete a template
   */
  deleteTemplate: async (id: string, tenantId?: string): Promise<void> => {
    await apiClient.delete(`/api/admin/email-templates/${id}`, {
      params: tenantId ? { tenantId } : undefined },
    );
  },

  /**
   * Test template rendering
   */
  testTemplate: async (
    id: string,
    data: TemplateTestInput,
    tenantId?: string
  ): Promise<TemplateTestResult> => {
    const response = await apiClient.post<TemplateTestResult>(
      `/api/admin/email-templates/${id}/test`,
      data,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Update template status (enable/disable)
   */
  updateTemplateStatus: async (
    id: string,
    isActive: boolean,
    tenantId?: string
  ): Promise<{ id: string; isActive: boolean; updatedAt: string }> => {
    const response = await apiClient.patch<{ id: string; isActive: boolean; updatedAt: string }>(
      `/api/admin/email-templates/${id}/status`,
      { isActive },
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },

  /**
   * Duplicate template to another language
   */
  duplicateTemplate: async (
    id: string,
    data: DuplicateTemplateInput,
    tenantId?: string
  ): Promise<EmailTemplate> => {
    const response = await apiClient.post<EmailTemplate>(
      `/api/admin/email-templates/${id}/duplicate`,
      data,
      { params: tenantId ? { tenantId } : undefined }
    );
    return response.data;
  },
};







