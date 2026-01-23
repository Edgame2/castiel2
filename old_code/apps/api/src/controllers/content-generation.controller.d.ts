import type { FastifyRequest, FastifyReply } from 'fastify';
import { ContentGenerationService } from '../services/content-generation/content-generation.service.js';
import { AIConnectionService } from '../services/ai/ai-connection.service.js';
interface GenerateContentBody {
    prompt: string;
    connectionId?: string;
    temperature?: number;
    templateId?: string;
    variables?: Record<string, string>;
    format?: 'html' | 'pdf' | 'docx' | 'pptx';
}
export declare class ContentGenerationController {
    private contentGenerationService;
    private aiConnectionService;
    constructor(contentGenerationService: ContentGenerationService, aiConnectionService: AIConnectionService);
    /**
     * Generate content
     *
     * Note: Input validation is handled by Fastify schema validation (prompt length, temperature range, etc.).
     * This method handles business logic and security (input sanitization for AI interactions).
     */
    generate: (request: FastifyRequest<{
        Body: GenerateContentBody;
    }>, reply: FastifyReply) => Promise<void>;
}
export {};
//# sourceMappingURL=content-generation.controller.d.ts.map