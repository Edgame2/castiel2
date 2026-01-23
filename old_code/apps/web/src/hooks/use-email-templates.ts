import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateApi } from '@/lib/api/email-templates';
import {
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  EmailTemplateFilters,
  DuplicateTemplateInput,
  TemplateTestInput,
} from '@/types/email-template';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api/client';

// Query keys
export const emailTemplateKeys = {
  all: ['email-templates'] as const,
  lists: () => [...emailTemplateKeys.all, 'list'] as const,
  list: (filters?: EmailTemplateFilters) => [...emailTemplateKeys.lists(), filters] as const,
  details: () => [...emailTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailTemplateKeys.details(), id] as const,
  byNameAndLanguage: (name: string, language: string) =>
    [...emailTemplateKeys.all, 'name-language', name, language] as const,
  languages: (name: string) => [...emailTemplateKeys.all, 'languages', name] as const,
};

/**
 * Hook to fetch paginated email templates with filters
 */
export function useEmailTemplates(filters?: EmailTemplateFilters) {
  return useQuery({
    queryKey: emailTemplateKeys.list(filters),
    queryFn: () => emailTemplateApi.getTemplates(filters),
  });
}

/**
 * Hook to fetch a single template by ID
 */
export function useEmailTemplate(id: string, tenantId?: string) {
  return useQuery({
    queryKey: emailTemplateKeys.detail(id),
    queryFn: () => emailTemplateApi.getTemplate(id, tenantId),
    enabled: !!id,
  });
}

/**
 * Hook to fetch template by name and language
 */
export function useEmailTemplateByLanguage(
  name: string,
  language: string,
  tenantId?: string
) {
  return useQuery({
    queryKey: emailTemplateKeys.byNameAndLanguage(name, language),
    queryFn: () => emailTemplateApi.getTemplateByLanguage(name, language, tenantId),
    enabled: !!name && !!language,
  });
}

/**
 * Hook to fetch all language variants of a template
 */
export function useTemplateLanguages(name: string, tenantId?: string) {
  return useQuery({
    queryKey: emailTemplateKeys.languages(name),
    queryFn: () => emailTemplateApi.getTemplateLanguages(name, tenantId),
    enabled: !!name,
  });
}

/**
 * Hook to create a new email template
 */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmailTemplateInput) => emailTemplateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      toast.success('Email template created successfully');
    },
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}

/**
 * Hook to update an email template
 */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      tenantId,
    }: {
      id: string;
      data: UpdateEmailTemplateInput;
      tenantId?: string;
    }) => emailTemplateApi.updateTemplate(id, data, tenantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(data.id) });
      toast.success('Email template updated successfully');
    },
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}

/**
 * Hook to delete an email template
 */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tenantId }: { id: string; tenantId?: string }) =>
      emailTemplateApi.deleteTemplate(id, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      toast.success('Email template deleted successfully');
    },
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}

/**
 * Hook to test template rendering
 */
export function useTestEmailTemplate() {
  return useMutation({
    mutationFn: ({
      id,
      data,
      tenantId,
    }: {
      id: string;
      data: TemplateTestInput;
      tenantId?: string;
    }) => emailTemplateApi.testTemplate(id, data, tenantId),
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}

/**
 * Hook to update template status (enable/disable)
 */
export function useUpdateTemplateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isActive,
      tenantId,
    }: {
      id: string;
      isActive: boolean;
      tenantId?: string;
    }) => emailTemplateApi.updateTemplateStatus(id, isActive, tenantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(data.id) });
      toast.success(`Template ${data.isActive ? 'enabled' : 'disabled'} successfully`);
    },
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}

/**
 * Hook to duplicate template to another language
 */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      tenantId,
    }: {
      id: string;
      data: DuplicateTemplateInput;
      tenantId?: string;
    }) => emailTemplateApi.duplicateTemplate(id, data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      toast.success('Template duplicated successfully');
    },
    onError: (error) => {
      const message = handleApiError(error);
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred');
    },
  });
}







