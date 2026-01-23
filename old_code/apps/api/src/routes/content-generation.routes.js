import { authenticate } from '../middleware/authenticate.js';
export async function registerContentGenerationRoutes(server, controller) {
    server.post('/content-generation/generate', {
        preHandler: [authenticate(server.tokenValidationCache)],
        schema: {
            body: {
                type: 'object',
                required: ['prompt'],
                properties: {
                    prompt: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 10000,
                        description: 'Prompt for content generation (max 10000 characters to prevent token exhaustion)',
                    },
                    connectionId: {
                        type: 'string',
                        description: 'Optional AI connection ID (uses default if not provided)',
                    },
                    temperature: {
                        type: 'number',
                        minimum: 0,
                        maximum: 2,
                        description: 'Temperature for AI generation (0-2)',
                    },
                    templateId: {
                        type: 'string',
                        description: 'Optional template ID to use',
                    },
                    variables: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                        description: 'Optional variables to substitute in template',
                    },
                    format: {
                        type: 'string',
                        enum: ['html', 'pdf', 'docx', 'pptx'],
                        description: 'Output format for generated content',
                    },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        content: { type: 'string' },
                    },
                },
            },
        },
    }, controller.generate);
}
//# sourceMappingURL=content-generation.routes.js.map