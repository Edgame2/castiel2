/**
 * Email Template Controller
 * HTTP handlers for email template management
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { EmailTemplateService } from '../services/email-template.service.js';
import { CreateTemplateInput, UpdateTemplateInput, TemplateFilters, PaginationOptions } from '../types/email-template.types.js';
export declare class EmailTemplateController {
    private readonly emailTemplateService;
    constructor(emailTemplateService: EmailTemplateService);
    /**
     * POST /api/admin/email-templates
     * Create a new email template
     */
    createTemplate(request: FastifyRequest<{
        Body: CreateTemplateInput;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/email-templates
     * List email templates with filters
     */
    listTemplates(request: FastifyRequest<{
        Querystring: TemplateFilters & PaginationOptions;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/email-templates/:id
     * Get template by ID
     */
    getTemplate(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/email-templates/:name/:language
     * Get template by name and language
     */
    getTemplateByLanguage(request: FastifyRequest<{
        Params: {
            name: string;
            language: string;
        };
        Querystring: {
            tenantId?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/email-templates/:name/languages
     * Get all language variants of a template
     */
    getTemplateLanguages(request: FastifyRequest<{
        Params: {
            name: string;
        };
        Querystring: {
            tenantId?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/admin/email-templates/:id
     * Update template
     */
    updateTemplate(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
        Body: UpdateTemplateInput;
    }>, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/admin/email-templates/:id
     * Delete template
     */
    deleteTemplate(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/email-templates/:id/test
     * Test template rendering
     */
    testTemplate(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
        Body: {
            placeholders: Record<string, any>;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/admin/email-templates/:id/status
     * Enable/disable template
     */
    updateTemplateStatus(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
        Body: {
            isActive: boolean;
        };
    }>, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/email-templates/:id/duplicate
     * Duplicate template to another language
     */
    duplicateTemplate(request: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            tenantId?: string;
        };
        Body: {
            language: string;
            displayName?: string;
            translate?: boolean;
        };
    }>, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=email-template.controller.d.ts.map