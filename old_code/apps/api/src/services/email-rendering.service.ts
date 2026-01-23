/**
 * Email Rendering Service
 * Handles template rendering with Mustache syntax
 */

// @ts-ignore - mustache doesn't have proper type definitions for this import path
import Mustache from 'mustache/mustache.js';
import {
  EmailTemplateDocument,
  PlaceholderDefinition,
  RenderedTemplate,
  TemplateTestResult,
} from '../types/email-template.types.js';

/**
 * Validation result for placeholders
 */
interface ValidationResult {
  valid: boolean;
  missing: string[];
  unused: string[];
}

/**
 * Email Rendering Service
 */
export class EmailRenderingService {
  /**
   * Render template with placeholders
   */
  async render(
    template: EmailTemplateDocument,
    placeholders: Record<string, any>
  ): Promise<RenderedTemplate> {
    // Validate placeholders
    this.validatePlaceholders(template, placeholders);

    // Render subject
    const subject = this.renderString(template.subject, placeholders);

    // Render HTML body
    const htmlBody = this.renderString(template.htmlBody, placeholders);

    // Render text body
    const textBody = this.renderString(template.textBody, placeholders);

    return {
      subject,
      htmlBody,
      textBody,
    };
  }

  /**
   * Render a string template with placeholders
   */
  private renderString(template: string, placeholders: Record<string, any>): string {
    try {
      return Mustache.render(template, placeholders);
    } catch (error: any) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Validate placeholder values
   */
  validatePlaceholders(
    template: EmailTemplateDocument,
    placeholders: Record<string, any>
  ): ValidationResult {
    const required = template.placeholders
      .filter(p => p.required)
      .map(p => p.name);

    const missing = required.filter(
      name => !(name in placeholders) || placeholders[name] === undefined || placeholders[name] === null
    );

    const provided = Object.keys(placeholders);
    const defined = template.placeholders.map(p => p.name);
    const unused = provided.filter(name => !defined.includes(name));

    if (missing.length > 0) {
      throw new Error(`Missing required placeholders: ${missing.join(', ')}`);
    }

    return {
      valid: missing.length === 0,
      missing,
      unused,
    };
  }

  /**
   * Test template rendering with validation
   */
  testTemplate(
    template: EmailTemplateDocument,
    placeholders: Record<string, any>
  ): TemplateTestResult {
    let rendered: RenderedTemplate;
    let validation: ValidationResult;

    try {
      // Try to validate (will throw if required placeholders missing)
      validation = this.validatePlaceholders(template, placeholders);
      
      // Render template
      rendered = {
        subject: this.renderString(template.subject, placeholders),
        htmlBody: this.renderString(template.htmlBody, placeholders),
        textBody: this.renderString(template.textBody, placeholders),
      };
    } catch (error: any) {
      // If validation fails, still return partial results
      validation = {
        valid: false,
        missing: error.message.includes('Missing required placeholders')
          ? error.message.split(': ')[1]?.split(', ') || []
          : [],
        unused: [],
      };

      // Try to render anyway (may have missing placeholders)
      try {
        rendered = {
          subject: this.renderString(template.subject, placeholders),
          htmlBody: this.renderString(template.htmlBody, placeholders),
          textBody: this.renderString(template.textBody, placeholders),
        };
      } catch {
        rendered = {
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
        };
      }
    }

    const provided = Object.keys(placeholders);
    const defined = template.placeholders.map(p => p.name);
    const unused = provided.filter(name => !defined.includes(name));

    return {
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      placeholders: {
        provided,
        missing: validation.missing,
        unused,
      },
    };
  }

  /**
   * Extract placeholders from template string
   */
  extractPlaceholders(template: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[1].trim();
      // Skip Mustache helpers like {{#if}}, {{/if}}, {{#each}}, etc.
      if (!placeholder.startsWith('#') && !placeholder.startsWith('/') && !placeholder.startsWith('^')) {
        // Extract base name (handle nested properties like user.name)
        const baseName = placeholder.split('.')[0].trim();
        if (baseName && !placeholders.includes(baseName)) {
          placeholders.push(baseName);
        }
      }
    }

    return placeholders;
  }
}







