/**
 * Template Service
 * 
 * CRUD operations for notification templates
 */

import { getDatabaseClient } from '@coder/shared';
import { NotFoundError } from '@coder/shared';
import { NotificationChannel } from '../types/notification';

export interface CreateTemplateInput {
  tenantId?: string;
  name: string;
  eventType: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  bodyHtml?: string;
  variables?: string[];
  locale?: string;
  enabled?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  variables?: string[];
  enabled?: boolean;
}

export class TemplateService {
  private db = getDatabaseClient() as unknown as { notification_templates: { findUnique: (args: any) => Promise<any>; findMany: (args: any) => Promise<any>; create: (args: any) => Promise<any>; update: (args: any) => Promise<any>; delete: (args: any) => Promise<any> } };

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<any> {
    const template = await this.db.notification_templates.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundError('Template', id);
    }

    return template;
  }

  /**
   * Create template
   */
  async createTemplate(input: CreateTemplateInput): Promise<any> {
    // Check for duplicate
    const existing = await this.db.notification_templates.findUnique({
      where: {
        tenantId_name_channel_locale: {
          tenantId: input.tenantId || null,
          name: input.name,
          channel: input.channel,
          locale: input.locale || 'en',
        },
      },
    });

    if (existing) {
      throw new Error(`Template with name "${input.name}" already exists for channel ${input.channel} and locale ${input.locale || 'en'}`);
    }

    return await this.db.notification_templates.create({
      data: {
        tenantId: input.tenantId || null,
        name: input.name,
        eventType: input.eventType,
        channel: input.channel,
        subject: input.subject || null,
        body: input.body,
        bodyHtml: input.bodyHtml || null,
        variables: input.variables || [],
        locale: input.locale || 'en',
        enabled: input.enabled !== false,
      },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<any> {
    await this.getTemplate(id); // Throws if not found

    return await this.db.notification_templates.update({
      where: { id },
      data: {
        name: input.name,
        subject: input.subject,
        body: input.body,
        bodyHtml: input.bodyHtml,
        variables: input.variables,
        enabled: input.enabled,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.getTemplate(id); // Throws if not found
    
    await this.db.notification_templates.delete({
      where: { id },
    });
  }

  /**
   * List templates
   */
  async listTemplates(filters: {
    tenantId?: string;
    eventType?: string;
    channel?: NotificationChannel;
    locale?: string;
    enabled?: boolean;
  }): Promise<any[]> {
    const where: any = {};
    
    if (filters.tenantId !== undefined) {
      where.tenantId = filters.tenantId || null;
    }
    if (filters.eventType) {
      where.eventType = filters.eventType;
    }
    if (filters.channel) {
      where.channel = filters.channel;
    }
    if (filters.locale) {
      where.locale = filters.locale;
    }
    if (filters.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    return await this.db.notification_templates.findMany({
      where,
      orderBy: [
        { tenantId: 'asc' }, // Tenant-specific first
        { name: 'asc' },
      ],
    });
  }
}

