import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PromptRepository } from '../services/ai-insights/prompt.repository.js';
import { PromptResolverService } from '../services/ai-insights/prompt-resolver.service.js';
import { PromptRendererService } from '../services/ai-insights/prompt-renderer.service.js';
import type { Prompt } from '../types/ai-insights/prompt.types.js';
import { PromptScope } from '../types/ai-insights/prompt.types.js';
import { isGlobalAdmin, requireRole } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
import { ForbiddenError } from '../middleware/error-handler.js';
import { z } from 'zod';

// ==========================================================================
// Schemas
// ==========================================================================

const SystemPromptSchema = z.object({
    slug: z.string().min(1, 'Slug is required'),
    name: z.string().min(1, 'Name is required'),
    template: z.object({
        systemPrompt: z.string().optional(),
        userPrompt: z.string().optional(),
        variables: z.array(z.string()).optional(),
    }),
    insightType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    ragConfig: z.object({
        topK: z.number().optional(),
        minScore: z.number().optional(),
        includeCitations: z.boolean().optional(),
        requiresContext: z.boolean().optional(),
    }).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
    metadata: z.record(z.any()).optional(),
});

const TenantPromptSchema = SystemPromptSchema.pick({
    slug: true,
    name: true,
    template: true,
    insightType: true,
    tags: true,
    ragConfig: true,
    status: true,
    metadata: true,
});

const UserPromptSchema = TenantPromptSchema;

const PromptResolutionSchema = z.object({
    slug: z.string().min(1, 'Slug is required'),
    insightType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    variables: z.record(z.any()).optional(),
});

const PreviewSchema = z.object({
    template: z.object({
        systemPrompt: z.string().optional(),
        userPrompt: z.string().optional(),
        variables: z.array(z.string()).optional(),
    }),
    variables: z.record(z.any()),
});

// ==========================================================================
// Helpers
// ==========================================================================

/**
 * Verify RBAC: Only Super Admin can access system prompts
 */
function requireSuperAdmin(req: FastifyRequest): void {
    const user = getUser(req);
    if (!isGlobalAdmin(user)) {
        throw new ForbiddenError('Only Super Admins can manage system prompts');
    }
}

/**
 * Verify RBAC: Only Tenant Admin or Super Admin can manage tenant prompts
 */
function requireTenantAdmin(req: FastifyRequest): void {
    const user = getUser(req);
    if (!isGlobalAdmin(user) && !user.roles?.includes('tenant_admin')) {
        throw new ForbiddenError('Tenant Admin or Super Admin privileges required');
    }
}

/**
 * Verify user owns the prompt (for user scope)
 */
async function verifyPromptOwnership(
    repo: PromptRepository,
    tenantId: string,
    promptId: string,
    userId: string
): Promise<Prompt> {
    const prompt = await repo.findById(tenantId, promptId);
    if (!prompt) {
        throw new Error('Prompt not found');
    }
    if (prompt.scope === PromptScope.User && prompt.ownerId !== userId) {
        throw new ForbiddenError('You do not have permission to access this prompt');
    }
    return prompt;
}

// ==========================================================================
// Routes
// ==========================================================================

export async function promptsRoutes(fastify: FastifyInstance, opts: any) {
    // Resolve Services from Options or DI Container
    const promptRepository = opts.promptRepository || (fastify as any).diContainer?.resolve?.('PromptRepository') as PromptRepository | undefined;
    const promptResolver = opts.promptResolver || (fastify as any).diContainer?.resolve?.('PromptResolverService') as PromptResolverService | undefined;
    const promptRenderer = opts.promptRenderer || (fastify as any).diContainer?.resolve?.('PromptRendererService') as PromptRendererService | undefined;
    
    // Get authentication decorator
    const authDecorator = (fastify as any).authenticate;
    
    if (!authDecorator) {
        fastify.log.warn('⚠️  Prompts routes not registered - authentication decorator missing');
        return;
    }

    // Health check route to verify prompts routes are registered
    fastify.get('/health', {}, async (req: FastifyRequest, reply) => {
        return reply.send({ status: 'ok', message: 'Prompts routes loaded' });
    });

    // =============================================================================
    // SYSTEM PROMPTS (Super Admin Only)
    // =============================================================================

    /**
     * POST /api/v1/prompts/system
     * Create system prompt (Super Admin only)
     */
    fastify.post<{ Body: any }>('/system', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const user = getUser(req);
        const body = SystemPromptSchema.parse(req.body);

        const newPrompt: Prompt = {
            id: crypto.randomUUID(),
            tenantId: 'SYSTEM', // System prompts use special partition
            slug: body.slug,
            name: body.name,
            scope: PromptScope.System,
            template: body.template,
            insightType: body.insightType,
            tags: body.tags,
            ragConfig: body.ragConfig,
            status: body.status as any,
            version: 1,
            createdBy: { userId: user.id, at: new Date() },
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: body.metadata,
            type: 'prompt',
            partitionKey: 'SYSTEM'
        } as Prompt;

        const created = await promptRepository.create(newPrompt);
        return reply.status(201).send(created);
    });

    /**
     * GET /api/v1/prompts/system
     * List system prompts (Super Admin only)
     */
    fastify.get<{ Querystring: any }>('/system', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const prompts = await promptRepository.list('SYSTEM', { scope: PromptScope.System });
        return reply.send(prompts);
    });

    /**
     * GET /api/v1/prompts/system/:id
     * Get system prompt by ID (Super Admin only)
     */
    fastify.get<{ Params: { id: string } }>('/system/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const prompt = await promptRepository.findById('SYSTEM', (req.params as { id: string }).id);
        if (!prompt) {return reply.status(404).send({ error: 'System prompt not found' });}
        return reply.send(prompt);
    });

    /**
     * PUT /api/v1/prompts/system/:id
     * Update system prompt (Super Admin only)
     */
    fastify.put<{ Params: { id: string }; Body: any }>('/system/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const user = getUser(req);
        const body = SystemPromptSchema.partial().parse(req.body);

        const updated = await promptRepository.update('SYSTEM', (req.params as { id: string }).id, {
            ...body,
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/system/:id/activate
     * Activate system prompt (Super Admin only)
     */
    fastify.post<{ Params: { id: string } }>('/system/:id/activate', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const user = getUser(req);
        const updated = await promptRepository.update('SYSTEM', (req.params as { id: string }).id, {
            status: 'active',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);
        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/system/:id/archive
     * Archive system prompt (Super Admin only)
     */
    fastify.post<{ Params: { id: string } }>('/system/:id/archive', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - System'] }
    }, async (req: FastifyRequest, reply) => {
        requireSuperAdmin(req);
        const user = getUser(req);
        const updated = await promptRepository.update('SYSTEM', (req.params as { id: string }).id, {
            status: 'archived',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);
        return reply.send(updated);
    });

    // =============================================================================
    // TENANT PROMPTS (Tenant Admin)
    // =============================================================================

    /**
     * POST /api/v1/prompts/tenant
     * Create tenant prompt (Tenant Admin only)
     */
    fastify.post<{ Body: any }>('/tenant', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const body = TenantPromptSchema.parse(req.body);

        const newPrompt: Prompt = {
            id: crypto.randomUUID(),
            tenantId: user.tenantId,
            slug: body.slug,
            name: body.name,
            scope: PromptScope.Tenant,
            template: body.template,
            insightType: body.insightType,
            tags: body.tags,
            ragConfig: body.ragConfig,
            status: body.status as any,
            version: 1,
            createdBy: { userId: user.id, at: new Date() },
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: body.metadata,
            type: 'prompt',
            partitionKey: user.tenantId
        } as Prompt;

        const created = await promptRepository.create(newPrompt);
        return reply.status(201).send(created);
    });

    /**
     * GET /api/v1/prompts/tenant
     * List tenant prompts (Tenant Admin only)
     */
    fastify.get<{ Querystring: any }>('/tenant', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const prompts = await promptRepository.list(user.tenantId, { scope: PromptScope.Tenant });
        return reply.send(prompts);
    });

    /**
     * GET /api/v1/prompts/tenant/:id
     * Get tenant prompt by ID (Tenant Admin only)
     */
    fastify.get<{ Params: { id: string } }>('/tenant/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const prompt = await promptRepository.findById(user.tenantId, (req.params as { id: string }).id);
        if (!prompt || prompt.scope !== PromptScope.Tenant) {
            return reply.status(404).send({ error: 'Tenant prompt not found' });
        }
        return reply.send(prompt);
    });

    /**
     * PUT /api/v1/prompts/tenant/:id
     * Update tenant prompt (Tenant Admin only)
     */
    fastify.put<{ Params: { id: string }; Body: any }>('/tenant/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const body = TenantPromptSchema.partial().parse(req.body);

        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            ...body,
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/tenant/:id/activate
     * Activate tenant prompt (Tenant Admin only)
     */
    fastify.post<{ Params: { id: string } }>('/tenant/:id/activate', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            status: 'active',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);
        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/tenant/:id/archive
     * Archive tenant prompt (Tenant Admin only)
     */
    fastify.post<{ Params: { id: string } }>('/tenant/:id/archive', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            status: 'archived',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);
        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/tenant/import
     * Clone system prompt to tenant (Tenant Admin only)
     */
    fastify.post<{ Body: { systemPromptId: string } }>('/tenant/import', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Tenant'] }
    }, async (req: FastifyRequest, reply) => {
        requireTenantAdmin(req);
        const user = getUser(req);
        const { systemPromptId } = req.body as { systemPromptId: string };

        const systemPrompt = await promptRepository.findById('SYSTEM', systemPromptId);
        if (!systemPrompt) {
            return reply.status(404).send({ error: 'System prompt not found' });
        }

        const clonedPrompt: Prompt = {
            ...systemPrompt,
            id: crypto.randomUUID(),
            tenantId: user.tenantId,
            scope: PromptScope.Tenant,
            status: 'draft', // Always create as draft when importing
            version: 1,
            createdBy: { userId: user.id, at: new Date() },
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: undefined,
            partitionKey: user.tenantId
        };

        const created = await promptRepository.create(clonedPrompt);
        return reply.status(201).send(created);
    });

    // =============================================================================
    // USER PROMPTS (Authenticated Users)
    // =============================================================================

    /**
     * POST /api/v1/prompts/user
     * Create user prompt
     */
    fastify.post<{ Body: any }>('/user', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        const body = UserPromptSchema.parse(req.body);

        const newPrompt: Prompt = {
            id: crypto.randomUUID(),
            tenantId: user.tenantId,
            ownerId: user.id, // User must own their prompts
            slug: body.slug,
            name: body.name,
            scope: PromptScope.User,
            template: body.template,
            insightType: body.insightType,
            tags: body.tags,
            ragConfig: body.ragConfig,
            status: body.status as any,
            version: 1,
            createdBy: { userId: user.id, at: new Date() },
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: body.metadata,
            type: 'prompt',
            partitionKey: user.tenantId
        } as Prompt;

        const created = await promptRepository.create(newPrompt);
        return reply.status(201).send(created);
    });

    /**
     * GET /api/v1/prompts/user
     * List user's own prompts
     */
    fastify.get<{ Querystring: any }>('/user', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        const prompts = await promptRepository.list(user.tenantId, {
            scope: PromptScope.User,
            ownerId: user.id
        });
        return reply.send(prompts);
    });

    /**
     * GET /api/v1/prompts/user/:id
     * Get user's prompt by ID
     */
    fastify.get<{ Params: { id: string } }>('/user/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        const prompt = await verifyPromptOwnership(promptRepository, user.tenantId, (req.params as { id: string }).id, user.id);
        return reply.send(prompt);
    });

    /**
     * PUT /api/v1/prompts/user/:id
     * Update user's prompt
     */
    fastify.put<{ Params: { id: string }; Body: any }>('/user/:id', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        await verifyPromptOwnership(promptRepository, user.tenantId, (req.params as { id: string }).id, user.id);

        const body = UserPromptSchema.partial().parse(req.body);
        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            ...body,
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/user/:id/activate
     * Activate user's prompt
     */
    fastify.post<{ Params: { id: string } }>('/user/:id/activate', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        await verifyPromptOwnership(promptRepository, user.tenantId, (req.params as { id: string }).id, user.id);

        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            status: 'active',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/user/:id/archive
     * Archive user's prompt
     */
    fastify.post<{ Params: { id: string } }>('/user/:id/archive', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        await verifyPromptOwnership(promptRepository, user.tenantId, (req.params as { id: string }).id, user.id);

        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            status: 'archived',
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.send(updated);
    });

    /**
     * POST /api/v1/prompts/user/:id/propose
     * Propose user prompt for tenant promotion
     */
    fastify.post<{ Params: { id: string }; Body: any }>('/user/:id/propose', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - User'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        const prompt = await verifyPromptOwnership(promptRepository, user.tenantId, (req.params as { id: string }).id, user.id);

        // PRODUCTION BLOCKER: Promotion system incomplete
        // TODO: Create promotion record in a promotions collection
        // For now, just mark as proposed - this is a temporary workaround
        const updated = await promptRepository.update(user.tenantId, (req.params as { id: string }).id, {
            metadata: {
                ...(prompt.metadata || {}),
                proposedForPromotion: true,
                proposedAt: new Date(),
            },
            updatedBy: { userId: user.id, at: new Date() },
        } as any);

        return reply.status(202).send(updated);
    });

    // =============================================================================
    // RESOLUTION & PREVIEW (All Users)
    // =============================================================================

    /**
     * POST /api/v1/prompts/resolve
     * Resolve best prompt for context (User > Tenant > System precedence)
     */
    fastify.post<{ Body: any }>('/resolve', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Resolution'] }
    }, async (req: FastifyRequest, reply) => {
        const user = getUser(req);
        const body = PromptResolutionSchema.parse(req.body);

        const result = await promptResolver.resolveAndRender({
            ...body,
            tenantId: user.tenantId,
            userId: user.id
        } as any);

        if (!result) {
            return reply.status(404).send({ error: 'No matching prompt found' });
        }

        return reply.send(result);
    });

    /**
     * POST /api/v1/prompts/preview
     * Preview template rendering without saving
     */
    fastify.post<{ Body: any }>('/preview', {
        preHandler: [authDecorator] as any,
        schema: { tags: ['Prompts - Preview'] }
    }, async (req: FastifyRequest, reply) => {
        const body = PreviewSchema.parse(req.body);
        const result = promptRenderer.render(body.template, body.variables);
        return reply.send(result);
    });
}
