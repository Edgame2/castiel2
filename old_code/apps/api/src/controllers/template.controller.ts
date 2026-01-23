import type { FastifyRequest, FastifyReply } from 'fastify';
import { TemplateService } from '../services/content-generation/template.service.js';
import { CreateTemplateInput, UpdateTemplateInput } from '../types/content-template.types.js';
import { AppError, NotFoundError, UnauthorizedError } from '../middleware/error-handler.js';

export class TemplateController {
    constructor(private templateService: TemplateService) { }

    /**
     * Create a new template
     * 
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    create = async (request: FastifyRequest<{ Body: CreateTemplateInput }>, reply: FastifyReply): Promise<void> => {
        // Fastify schema validation ensures name, content, and type are present
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID required');
        }

        const createdBy = (request as any).user?.id || 'system';

        try {
            const template = await this.templateService.createTemplate(tenantId, request.body, createdBy);
            reply.status(201).send(template);
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to create template');
            throw new AppError('Failed to create template', 500);
        }
    };

    /**
     * List templates
     */
    list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID required');
        }

        try {
            const templates = await this.templateService.listTemplates(tenantId);
            reply.status(200).send({ templates });
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to list templates');
            throw new AppError('Failed to list templates', 500);
        }
    };

    /**
     * Get a template
     * 
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    get = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> => {
        // Fastify schema validation ensures id is present
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID required');
        }

        try {
            const template = await this.templateService.getTemplate(id, tenantId);
            if (!template) {
                throw new NotFoundError('Template not found');
            }

            reply.status(200).send(template);
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get template');
            throw new AppError('Failed to get template', 500);
        }
    };

    /**
     * Update a template
     * 
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    update = async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateTemplateInput }>, reply: FastifyReply): Promise<void> => {
        // Fastify schema validation ensures id is present and body is valid
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID required');
        }

        const updatedBy = (request as any).user?.id || 'system';

        try {
            const template = await this.templateService.updateTemplate(id, tenantId, request.body, updatedBy);
            reply.status(200).send(template);
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to update template');
            throw new AppError('Failed to update template', 500);
        }
    };

    /**
     * Delete a template
     * 
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    delete = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> => {
        // Fastify schema validation ensures id is present
        const { id } = request.params;
        const tenantId = (request as any).user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID required');
        }

        try {
            await this.templateService.deleteTemplate(id, tenantId);
            reply.status(204).send();
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to delete template');
            throw new AppError('Failed to delete template', 500);
        }
    };
}
