/**
 * Template Engine
 * 
 * Renders notification templates using Handlebars
 */

import Handlebars from 'handlebars';
import { getDatabaseClient } from '@coder/shared';
import { TemplateData } from '../types/notification';
import { getConfig } from '../config';

export interface RenderedTemplate {
  subject?: string;
  body: string;
  bodyHtml?: string;
  text?: string;
}

export class TemplateEngine {
  private db = getDatabaseClient() as any;
  private config = getConfig();

  /**
   * Register Handlebars helpers
   */
  constructor() {
    this.registerHelpers();
  }

  /**
   * Render template by name
   */
  async renderTemplate(
    templateName: string,
    eventType: string,
    channel: string,
    locale: string,
    data: TemplateData,
    organizationId?: string
  ): Promise<RenderedTemplate> {
    // Try to load template from database
    const template = await this.loadTemplate(templateName, eventType, channel, locale, organizationId);
    
    if (!template) {
      // Fallback to default templates
      return this.renderDefaultTemplate(templateName, data);
    }

    // Render subject if available
    const subject = template.subject 
      ? Handlebars.compile(template.subject)(data)
      : undefined;

    // Render body
    const body = Handlebars.compile(template.body)(data);
    const bodyHtml = template.bodyHtml 
      ? Handlebars.compile(template.bodyHtml)(data)
      : undefined;

    // Generate text from HTML if needed
    const text = bodyHtml 
      ? this.htmlToText(bodyHtml)
      : body;

    return {
      subject,
      body,
      bodyHtml,
      text,
    };
  }

  /**
   * Load template from database
   */
  private async loadTemplate(
    name: string,
    eventType: string,
    channel: string,
    locale: string,
    organizationId?: string
  ) {
    const template = await this.db.notification_templates.findFirst({
      where: {
        name,
        eventType,
        channel,
        locale,
        organizationId: organizationId || null,
        enabled: true,
      },
      orderBy: {
        // Prefer organization-specific templates over global
        organizationId: organizationId ? 'asc' : 'desc',
      },
    });

    return template;
  }

  /**
   * Render default template (fallback)
   */
  private renderDefaultTemplate(templateName: string, data: TemplateData): RenderedTemplate {
    // Simple default template
    const body = `{{title}}\n\n{{body}}`;
    const rendered = Handlebars.compile(body)({
      title: data.title || 'Notification',
      body: data.body || data.message || '',
      ...data,
    });

    return {
      body: rendered,
      text: rendered,
    };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date
    Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      if (format === 'time') {
        return d.toLocaleTimeString();
      }
      return d.toLocaleString();
    });

    // Format relative time
    Handlebars.registerHelper('relativeTime', (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return d.toLocaleDateString();
    });

    // Uppercase
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Default value
    Handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value != null ? value : defaultValue;
    });

    // Conditional
    Handlebars.registerHelper('if_eq', (a: any, b: any, options: any) => {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }
}

