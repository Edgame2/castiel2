/**
 * Email Template Controller
 * HTTP handlers for email template management
 */
import { CreateTemplateSchema, UpdateTemplateSchema, TestTemplateSchema, DuplicateTemplateSchema, TemplateStatusSchema, TemplateFiltersSchema, } from '../schemas/email-template.schemas.js';
export class EmailTemplateController {
    emailTemplateService;
    constructor(emailTemplateService) {
        this.emailTemplateService = emailTemplateService;
    }
    /**
     * POST /api/admin/email-templates
     * Create a new email template
     */
    async createTemplate(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
            }
            // Validate request body
            const validationResult = CreateTemplateSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: validationResult.error.errors,
                });
            }
            const data = validationResult.data;
            const template = await this.emailTemplateService.createTemplate(data, user);
            return reply.code(201).send(template);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to create email template');
            if (error.message.includes('already exists')) {
                return reply.code(409).send({
                    error: 'Conflict',
                    message: error.message,
                });
            }
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to create email template',
            });
        }
    }
    /**
     * GET /api/admin/email-templates
     * List email templates with filters
     */
    async listTemplates(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
            }
            // Validate query parameters
            const validationResult = TemplateFiltersSchema.safeParse(request.query);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid query parameters',
                    details: validationResult.error.errors,
                });
            }
            const filters = {
                tenantId: request.query.tenantId || 'system',
                category: request.query.category,
                language: request.query.language,
                isActive: request.query.isActive !== undefined ? request.query.isActive : true,
                search: request.query.search,
            };
            // Validate and sanitize pagination parameters to prevent DoS attacks
            const limitValue = request.query.limit || 20;
            const offsetValue = request.query.offset || 0;
            const validatedLimit = typeof limitValue === 'number'
                ? Math.min(Math.max(1, limitValue), 1000) // Max 1000 items per page
                : (() => {
                    const parsed = parseInt(String(limitValue), 10);
                    return isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 1000);
                })();
            const validatedOffset = typeof offsetValue === 'number'
                ? Math.max(0, offsetValue)
                : (() => {
                    const parsed = parseInt(String(offsetValue), 10);
                    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
                })();
            const pagination = {
                limit: validatedLimit,
                offset: validatedOffset,
            };
            const result = await this.emailTemplateService.listTemplates(filters, pagination);
            return reply.send({
                templates: result.items,
                pagination: {
                    total: result.total,
                    limit: result.limit,
                    offset: result.offset,
                    hasMore: result.hasMore,
                },
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to list email templates');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to list email templates',
            });
        }
    }
    /**
     * GET /api/admin/email-templates/:id
     * Get template by ID
     */
    async getTemplate(request, reply) {
        try {
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            const template = await this.emailTemplateService.getTemplate(id, tenantId);
            return reply.send(template);
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to get email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get email template',
            });
        }
    }
    /**
     * GET /api/admin/email-templates/:name/:language
     * Get template by name and language
     */
    async getTemplateByLanguage(request, reply) {
        try {
            const { name, language } = request.params;
            const tenantId = request.query.tenantId || 'system';
            const template = await this.emailTemplateService.getTemplateByLanguage(name, language, tenantId);
            return reply.send(template);
        }
        catch (error) {
            if (error.message.includes('not found')) {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to get email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get email template',
            });
        }
    }
    /**
     * GET /api/admin/email-templates/:name/languages
     * Get all language variants of a template
     */
    async getTemplateLanguages(request, reply) {
        try {
            const { name } = request.params;
            const tenantId = request.query.tenantId || 'system';
            const languages = await this.emailTemplateService.getTemplateLanguages(name, tenantId);
            return reply.send({
                templateName: name,
                languages,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to get template languages');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get template languages',
            });
        }
    }
    /**
     * PATCH /api/admin/email-templates/:id
     * Update template
     */
    async updateTemplate(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
            }
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            // Validate request body
            const validationResult = UpdateTemplateSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: validationResult.error.errors,
                });
            }
            const updates = validationResult.data;
            const template = await this.emailTemplateService.updateTemplate(id, tenantId, updates, user);
            return reply.send(template);
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to update email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to update email template',
            });
        }
    }
    /**
     * DELETE /api/admin/email-templates/:id
     * Delete template
     */
    async deleteTemplate(request, reply) {
        try {
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            await this.emailTemplateService.deleteTemplate(id, tenantId);
            return reply.code(204).send();
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to delete email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to delete email template',
            });
        }
    }
    /**
     * POST /api/admin/email-templates/:id/test
     * Test template rendering
     */
    async testTemplate(request, reply) {
        try {
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            // Validate request body
            const validationResult = TestTemplateSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: validationResult.error.errors,
                });
            }
            const { placeholders } = validationResult.data;
            const result = await this.emailTemplateService.testTemplate(id, tenantId, placeholders);
            return reply.send(result);
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to test email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to test email template',
            });
        }
    }
    /**
     * PATCH /api/admin/email-templates/:id/status
     * Enable/disable template
     */
    async updateTemplateStatus(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
            }
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            // Validate request body
            const validationResult = TemplateStatusSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: validationResult.error.errors,
                });
            }
            const { isActive } = validationResult.data;
            const template = await this.emailTemplateService.updateTemplate(id, tenantId, { isActive }, user);
            return reply.send({
                id: template.id,
                isActive: template.isActive,
                updatedAt: template.updatedAt,
            });
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to update template status');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to update template status',
            });
        }
    }
    /**
     * POST /api/admin/email-templates/:id/duplicate
     * Duplicate template to another language
     */
    async duplicateTemplate(request, reply) {
        try {
            const { id } = request.params;
            const tenantId = request.query.tenantId || 'system';
            // Validate request body
            const validationResult = DuplicateTemplateSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: validationResult.error.errors,
                });
            }
            const { language, displayName } = validationResult.data;
            const template = await this.emailTemplateService.duplicateTemplate(id, language, tenantId, displayName);
            return reply.code(201).send(template);
        }
        catch (error) {
            if (error.message === 'Template not found') {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
            }
            if (error.message.includes('already exists')) {
                return reply.code(409).send({
                    error: 'Conflict',
                    message: error.message,
                });
            }
            request.log.error({ err: error }, 'Failed to duplicate email template');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to duplicate email template',
            });
        }
    }
}
//# sourceMappingURL=email-template.controller.js.map