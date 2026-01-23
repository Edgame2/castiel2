/**
 * Memory Routes
 *
 * API routes for AI chat memory management
 * Supports explicit memory management (remember/forget) and memory search
 */
import type { FastifyInstance } from 'fastify';
import { MemoryController } from '../controllers/memory.controller.js';
export declare function registerMemoryRoutes(server: FastifyInstance, controller: MemoryController): Promise<void>;
//# sourceMappingURL=memory.routes.d.ts.map