'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// ============================================
// Gmail Hooks
// ============================================

/**
 * Get Gmail inbox summary
 */
export function useGmailInbox(
  integrationId: string,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: ['google-workspace', 'gmail', 'inbox', integrationId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));

      const response = await apiClient.get<{
        unreadCount: number;
        recentMessages: Array<{
          id: string;
          threadId: string;
          snippet: string;
          subject: string;
          from: string;
          date: string;
          labelIds: string[];
        }>;
      }>(`/api/tenant/integrations/${integrationId}/widgets/gmail/inbox?${params.toString()}`);
      return response.data;
    },
    enabled: !!integrationId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get Gmail thread
 */
export function useGmailThread(integrationId: string, threadId: string) {
  return useQuery({
    queryKey: ['google-workspace', 'gmail', 'thread', integrationId, threadId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/tenant/integrations/${integrationId}/gmail/threads/${threadId}`
      );
      return response.data;
    },
    enabled: !!integrationId && !!threadId,
  });
}

/**
 * Send Gmail message
 */
export function useSendGmailMessage(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      to: string;
      subject: string;
      body: string;
      bodyType?: 'text' | 'html';
      cc?: string;
      bcc?: string;
    }) => {
      const response = await apiClient.post(
        `/api/tenant/integrations/${integrationId}/gmail/send`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['google-workspace', 'gmail', integrationId],
      });
    },
  });
}

// ============================================
// Calendar Hooks
// ============================================

/**
 * Get Calendar events
 */
export function useCalendarEvents(
  integrationId: string,
  options?: { timeMin?: Date; timeMax?: Date; calendarId?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['google-workspace', 'calendar', 'events', integrationId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.timeMin) params.set('timeMin', options.timeMin.toISOString());
      if (options?.timeMax) params.set('timeMax', options.timeMax.toISOString());
      if (options?.calendarId) params.set('calendarId', options.calendarId);
      if (options?.limit) params.set('limit', String(options.limit));

      const response = await apiClient.get<{
        events: Array<{
          id: string;
          summary: string;
          description?: string;
          start: { dateTime?: string; date?: string; timeZone?: string };
          end: { dateTime?: string; date?: string; timeZone?: string };
          location?: string;
          attendees?: Array<{ email: string; responseStatus?: string }>;
          organizer?: string;
          hangoutLink?: string;
        }>;
      }>(`/api/tenant/integrations/${integrationId}/widgets/calendar/upcoming?${params.toString()}`);
      return response.data;
    },
    enabled: !!integrationId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Create Calendar event
 */
export function useCreateCalendarEvent(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      location?: string;
      attendees?: string[];
      calendarId?: string;
    }) => {
      const response = await apiClient.post(
        `/api/tenant/integrations/${integrationId}/calendar/events`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['google-workspace', 'calendar', integrationId],
      });
    },
  });
}

/**
 * Update Calendar event
 */
export function useUpdateCalendarEvent(integrationId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      summary?: string;
      description?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
      location?: string;
      attendees?: string[];
    }) => {
      const response = await apiClient.patch(
        `/api/tenant/integrations/${integrationId}/calendar/events/${eventId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['google-workspace', 'calendar', integrationId],
      });
    },
  });
}

// ============================================
// Drive Hooks
// ============================================

/**
 * Get Drive files
 */
export function useDriveFiles(
  integrationId: string,
  options?: { folderId?: string; limit?: number; query?: string }
) {
  return useQuery({
    queryKey: ['google-workspace', 'drive', 'files', integrationId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.folderId) params.set('folderId', options.folderId);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.query) params.set('q', options.query);

      const response = await apiClient.get<{
        files: Array<{
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          webViewLink?: string;
          webContentLink?: string;
          createdTime?: string;
          modifiedTime?: string;
          ownerEmail?: string;
          isShared?: boolean;
        }>;
      }>(`/api/tenant/integrations/${integrationId}/widgets/drive/recent?${params.toString()}`);
      return response.data;
    },
    enabled: !!integrationId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Get Drive file details
 */
export function useDriveFile(integrationId: string, fileId: string) {
  return useQuery({
    queryKey: ['google-workspace', 'drive', 'file', integrationId, fileId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/tenant/integrations/${integrationId}/drive/files/${fileId}`
      );
      return response.data;
    },
    enabled: !!integrationId && !!fileId,
  });
}

// ============================================
// Contacts Hooks
// ============================================

/**
 * Get Contacts
 */
export function useContacts(integrationId: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['google-workspace', 'contacts', integrationId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));

      const response = await apiClient.get<{
        totalCount: number;
        recentContacts: Array<{
          resourceName: string;
          displayName?: string;
          email?: string;
          phone?: string;
          company?: string;
        }>;
      }>(`/api/tenant/integrations/${integrationId}/widgets/contacts/stats?${params.toString()}`);
      return response.data;
    },
    enabled: !!integrationId,
  });
}

/**
 * Get Contact details
 */
export function useContact(integrationId: string, contactId: string) {
  return useQuery({
    queryKey: ['google-workspace', 'contact', integrationId, contactId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/tenant/integrations/${integrationId}/contacts/${contactId}`
      );
      return response.data;
    },
    enabled: !!integrationId && !!contactId,
  });
}

// ============================================
// Tasks Hooks
// ============================================

/**
 * Get Tasks
 */
export function useTasks(integrationId: string, tasklistId?: string) {
  return useQuery({
    queryKey: ['google-workspace', 'tasks', integrationId, tasklistId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tasklistId) params.set('tasklistId', tasklistId);

      const response = await apiClient.get<{
        pendingCount: number;
        completedCount: number;
        totalCount: number;
        recentTasks: Array<{
          id: string;
          title: string;
          notes?: string;
          status?: string;
          due?: string;
        }>;
      }>(`/api/tenant/integrations/${integrationId}/widgets/tasks/summary?${params.toString()}`);
      return response.data;
    },
    enabled: !!integrationId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get Task details
 */
export function useTask(
  integrationId: string,
  taskId: string,
  tasklistId: string
) {
  return useQuery({
    queryKey: ['google-workspace', 'task', integrationId, taskId, tasklistId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/tenant/integrations/${integrationId}/tasks/${tasklistId}/${taskId}`
      );
      return response.data;
    },
    enabled: !!integrationId && !!taskId && !!tasklistId,
  });
}







