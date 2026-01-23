import type { FastifyRequest, FastifyReply } from 'fastify';
import { ContentGenerationService } from '../services/content-generation/content-generation.service.js';
import { AIConnectionService } from '../services/ai/ai-connection.service.js';
import { AppError, NotFoundError, UnauthorizedError, ValidationError } from '../middleware/error-handler.js';
import { sanitizeUserInput } from '../utils/input-sanitization.js';

interface GenerateContentBody {
    prompt: string;
    connectionId?: string;
    temperature?: number;
    templateId?: string;
    variables?: Record<string, string>;
    format?: 'html' | 'pdf' | 'docx' | 'pptx';
}

export class ContentGenerationController {
    constructor(
        private contentGenerationService: ContentGenerationService,
        private aiConnectionService: AIConnectionService
    ) { }

    /**
     * Generate content
     * 
     * Note: Input validation is handled by Fastify schema validation (prompt length, temperature range, etc.).
     * This method handles business logic and security (input sanitization for AI interactions).
     */
    generate = async (request: FastifyRequest<{ Body: GenerateContentBody }>, reply: FastifyReply): Promise<void> => {
        // Fastify schema validation ensures prompt is present, non-empty, and within length limits
        // Fastify schema validation ensures temperature is within 0-2 range if provided
        const { prompt, connectionId, temperature, templateId, variables, format } = request.body;

        // Sanitize prompt to prevent injection attacks (security concern - must stay in controller)
        const sanitizedPrompt = sanitizeUserInput(prompt.trim());

        const user = (request as any).user || (request as any).auth;
        const tenantId = user?.tenantId || 'system';
        const userId = user?.id || user?.userId;

        if (!userId) {
            throw new UnauthorizedError('User ID is required');
        }

        try {
            // Get connection and credentials
            let credentials;
            if (connectionId) {
                credentials = await this.aiConnectionService.getConnectionWithCredentials(connectionId);
                if (!credentials) {
                    throw new NotFoundError(`Connection not found: ${connectionId}`);
                }
            } else {
                // Find a default connection (LLM)
                credentials = await this.aiConnectionService.getDefaultConnection(
                    tenantId === 'system' ? null : tenantId,
                    'LLM'
                );

                if (!credentials) {
                    throw new ValidationError('No suitable AI connection found. Please configure an AI connection.');
                }
            }

            const { connection, apiKey } = credentials;

            // Sanitize variables if provided (security concern - must stay in controller)
            let sanitizedVariables: Record<string, string> | undefined;
            if (variables) {
                sanitizedVariables = {};
                for (const [key, value] of Object.entries(variables)) {
                    if (typeof value === 'string') {
                        sanitizedVariables[key] = sanitizeUserInput(value);
                    } else {
                        sanitizedVariables[key] = String(value);
                    }
                }
            }

            const result = await this.contentGenerationService.generateContent(
                sanitizedPrompt,
                connection,
                apiKey,
                {
                    temperature,
                    templateId,
                    tenantId,
                    userId,
                    variables: sanitizedVariables,
                    format
                }
            );

            if (Buffer.isBuffer(result)) {
                const contentTypeMap = {
                    pdf: 'application/pdf',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                };

                const contentType = contentTypeMap[format as keyof typeof contentTypeMap] || 'application/octet-stream';

                reply.header('Content-Type', contentType);
                reply.header('Content-Disposition', `attachment; filename="generated-content.${format}"`);
                reply.status(200).send(result);
                return;
            }

            reply.status(200).send({ content: result });
        } catch (error: unknown) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }

            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to generate content');
            throw new AppError('Failed to generate content', 500);
        }
    };
}
