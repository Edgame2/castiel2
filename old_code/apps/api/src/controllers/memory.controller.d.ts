/**
 * Memory Controller
 *
 * Handles HTTP requests for AI chat memory management
 * Supports explicit memory management (remember/forget) and memory search
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { MemoryContextService } from '../services/memory-context.service.js';
export declare class MemoryController {
    private readonly memoryService;
    constructor(memoryService: MemoryContextService);
    /**
     * POST /api/v1/memory/remember
     * Remember explicit information
     */
    remember(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/memory/forget
     * Forget information matching a query
     */
    forget(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/memory/search
     * Search user memory
     */
    search(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/memory/facts
     * List all user facts
     */
    listFacts(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/memory/facts/:factId
     * Remove a specific fact
     */
    removeFact(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/memory
     * Get user memory summary
     */
    getMemory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/memory
     * Clear all user memory (for privacy/GDPR)
     */
    clearMemory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=memory.controller.d.ts.map