import type { FastifyRequest, FastifyReply } from 'fastify';
import { TemplateService } from '../services/content-generation/template.service.js';
import { CreateTemplateInput, UpdateTemplateInput } from '../types/content-template.types.js';
export declare class TemplateController {
    private templateService;
    constructor(templateService: TemplateService);
    /**
     * Create a new template
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    create: (request: FastifyRequest<{
        Body: CreateTemplateInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * List templates
     */
    list: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * Get a template
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    get: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Update a template
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    update: (request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: UpdateTemplateInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Delete a template
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    delete: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
}
//# sourceMappingURL=template.controller.d.ts.map