import { FastifyInstance } from 'fastify';
import { TemplateController } from '../controllers/template.controller.js';
import { authenticate } from '../middleware/authenticate.js';

export async function registerTemplateRoutes(
    server: FastifyInstance,
    controller: TemplateController
) {
    server.register(async (api) => {
        api.addHook('preHandler', authenticate((server as any).tokenValidationCache));

        // Create template
        api.post(
            '/templates',
            {
                schema: {
                    body: {
                        type: 'object',
                        required: ['name', 'content', 'type'],
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            content: { type: 'string' },
                            type: { type: 'string', enum: ['document', 'presentation'] },
                        },
                    },
                },
            },
            controller.create
        );

        // List templates
        api.get('/templates', controller.list);

        // Get template
        api.get(
            '/templates/:id',
            {
                schema: {
                    params: {
                        type: 'object',
                        required: ['id'],
                        properties: {
                            id: { type: 'string', minLength: 1 },
                        },
                    },
                },
            },
            controller.get
        );

        // Update template
        api.put(
            '/templates/:id',
            {
                schema: {
                    params: {
                        type: 'object',
                        required: ['id'],
                        properties: {
                            id: { type: 'string', minLength: 1 },
                        },
                    },
                    body: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            content: { type: 'string' },
                            type: { type: 'string', enum: ['document', 'presentation'] },
                        },
                    },
                },
            },
            controller.update
        );

        // Delete template
        api.delete(
            '/templates/:id',
            {
                schema: {
                    params: {
                        type: 'object',
                        required: ['id'],
                        properties: {
                            id: { type: 'string', minLength: 1 },
                        },
                    },
                },
            },
            controller.delete
        );
    });
}
