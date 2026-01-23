// @ts-nocheck - Optional AI service, not used by workers
/**
 * AI Tool Executor Service
 * Handles execution of function calls from AI models
 */
import { ShardSource } from '../../types/shard.types.js';
import { hasPermission as checkStaticPermission, UserRole } from '@castiel/shared-types';
/**
 * AI Tool Executor Service
 * Executes function calls from AI models
 */
export class AIToolExecutorService {
    monitoring;
    shardRepository;
    webSearchService;
    emailService;
    roleManagementService;
    tools = new Map();
    constructor(monitoring, shardRepository, webSearchService, emailService, roleManagementService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.webSearchService = webSearchService;
        this.emailService = emailService;
        this.roleManagementService = roleManagementService;
        this.registerDefaultTools();
    }
    /**
     * Register default tools
     */
    registerDefaultTools() {
        // Web Search Tool
        this.registerTool({
            name: 'web_search',
            description: 'Search the web for real-time information. Use this when the user asks about current events, recent news, or information that may not be in the knowledge base.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to execute',
                    },
                    searchType: {
                        type: 'string',
                        enum: ['general', 'news', 'company'],
                        description: 'Type of search to perform',
                    },
                    timeRange: {
                        type: 'string',
                        enum: ['day', 'week', 'month', 'year'],
                        description: 'Time range for search results',
                    },
                },
                required: ['query'],
            },
            enabledByDefault: true,
            requiresPermission: 'ai.web_search',
            execute: async (args, context) => {
                if (!this.webSearchService) {
                    throw new Error('Web search service is not available');
                }
                const query = args.query;
                const searchType = args.searchType || 'general';
                const timeRange = args.timeRange || undefined;
                this.monitoring.trackEvent('ai-tool-executor.web_search', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    query,
                    searchType,
                });
                try {
                    const result = await this.webSearchService.search(context.tenantId, query, {
                        searchType: searchType,
                        timeRange: timeRange,
                    });
                    return {
                        success: true,
                        results: result.search.results?.slice(0, 5).map((r) => ({
                            title: r.title,
                            url: r.url,
                            snippet: r.snippet,
                        })) || [],
                        summary: `Found ${result.search.results?.length || 0} results for "${query}"`,
                    };
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'ai-tool-executor.web_search',
                        tenantId: context.tenantId,
                    });
                    throw new Error(`Web search failed: ${error.message}`);
                }
            },
        });
        // Get Shard Details Tool
        this.registerTool({
            name: 'get_shard_details',
            description: 'Get detailed information about a specific shard (document, note, project, etc.). Use this when the user asks about a specific item or wants more details.',
            parameters: {
                type: 'object',
                properties: {
                    shardId: {
                        type: 'string',
                        description: 'The ID of the shard to retrieve',
                    },
                    includeRelationships: {
                        type: 'boolean',
                        description: 'Whether to include related shards',
                        default: false,
                    },
                },
                required: ['shardId'],
            },
            enabledByDefault: true,
            execute: async (args, context) => {
                if (!this.shardRepository) {
                    throw new Error('Shard repository is not available');
                }
                const shardId = args.shardId;
                const includeRelationships = args.includeRelationships || false;
                this.monitoring.trackEvent('ai-tool-executor.get_shard_details', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    shardId,
                });
                try {
                    const shard = await this.shardRepository.findById(shardId, context.tenantId);
                    if (!shard) {
                        return {
                            success: false,
                            error: 'Shard not found',
                        };
                    }
                    const result = {
                        success: true,
                        shard: {
                            id: shard.id,
                            shardTypeId: shard.shardTypeId,
                            structuredData: shard.structuredData,
                            metadata: shard.metadata,
                        },
                    };
                    if (includeRelationships && shard.internal_relationships) {
                        result.relationships = shard.internal_relationships.map((rel) => ({
                            shardId: rel.shardId,
                            shardTypeId: rel.shardTypeId,
                            shardName: rel.shardName,
                        }));
                    }
                    return result;
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'ai-tool-executor.get_shard_details',
                        tenantId: context.tenantId,
                    });
                    throw new Error(`Failed to get shard details: ${error.message}`);
                }
            },
        });
        // Create Task Tool
        this.registerTool({
            name: 'create_task',
            description: 'Create a new task or todo item. Use this when the user asks to create a task, add a todo, or schedule an action item.',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The task title or summary',
                    },
                    description: {
                        type: 'string',
                        description: 'Detailed description of the task',
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        description: 'Task priority level',
                        default: 'medium',
                    },
                    dueDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'When the task should be completed (ISO 8601 format)',
                    },
                    assigneeUserId: {
                        type: 'string',
                        description: 'User ID to assign the task to (defaults to current user if not specified)',
                    },
                    projectId: {
                        type: 'string',
                        description: 'Project ID to link the task to (optional)',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags to categorize the task',
                    },
                },
                required: ['title'],
            },
            enabledByDefault: true,
            requiresPermission: 'shards.create',
            execute: async (args, context) => {
                if (!this.shardRepository) {
                    throw new Error('Shard repository is not available');
                }
                const title = args.title;
                const description = args.description || '';
                const priority = args.priority || 'medium';
                const dueDate = args.dueDate ? new Date(args.dueDate) : undefined;
                const assigneeUserId = args.assigneeUserId || context.userId;
                const projectId = args.projectId || context.projectId;
                const tags = args.tags || [];
                this.monitoring.trackEvent('ai-tool-executor.create_task', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    title,
                    priority,
                });
                try {
                    const structuredData = {
                        name: title,
                        description,
                        status: 'todo',
                        priority,
                        assigneeUserId,
                    };
                    if (dueDate) {
                        structuredData.dueDate = dueDate.toISOString();
                    }
                    if (tags.length > 0) {
                        structuredData.tags = tags;
                    }
                    const createInput = {
                        tenantId: context.tenantId,
                        userId: context.userId,
                        shardTypeId: 'c_task',
                        structuredData,
                        source: ShardSource.API, // Use API source for AI tool-created shards
                        sourceDetails: {
                            originalId: `ai-tool-create_task-${Date.now()}`,
                        },
                    };
                    // Link to project if provided
                    if (projectId) {
                        // Get project shard to create proper relationship
                        const projectShard = await this.shardRepository?.findById(projectId, context.tenantId);
                        if (projectShard) {
                            createInput.internal_relationships = [
                                {
                                    shardId: projectId,
                                    shardTypeId: projectShard.shardTypeId,
                                    shardName: projectShard.structuredData?.name || projectId,
                                    createdAt: new Date(),
                                    metadata: {
                                        source: 'llm',
                                        extractionMethod: 'ai-tool',
                                    },
                                },
                            ];
                        }
                    }
                    const shard = await this.shardRepository.create(createInput);
                    return {
                        success: true,
                        taskId: shard.id,
                        title: shard.structuredData?.name || title,
                        message: `Task "${title}" created successfully`,
                    };
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'ai-tool-executor.create_task',
                        tenantId: context.tenantId,
                    });
                    throw new Error(`Failed to create task: ${error.message}`);
                }
            },
        });
        // Create Note Tool
        this.registerTool({
            name: 'create_note',
            description: 'Create a new note or memo. Use this when the user asks to create a note, save information, or jot down thoughts.',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The note title',
                    },
                    content: {
                        type: 'string',
                        description: 'The note content or body',
                    },
                    projectId: {
                        type: 'string',
                        description: 'Project ID to link the note to (optional)',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags to categorize the note',
                    },
                },
                required: ['title', 'content'],
            },
            enabledByDefault: true,
            requiresPermission: 'shards.create',
            execute: async (args, context) => {
                if (!this.shardRepository) {
                    throw new Error('Shard repository is not available');
                }
                const title = args.title;
                const content = args.content;
                const projectId = args.projectId || context.projectId;
                const tags = args.tags || [];
                this.monitoring.trackEvent('ai-tool-executor.create_note', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    title,
                });
                try {
                    const structuredData = {
                        name: title,
                        content,
                    };
                    if (tags.length > 0) {
                        structuredData.tags = tags;
                    }
                    const createInput = {
                        tenantId: context.tenantId,
                        userId: context.userId,
                        shardTypeId: 'c_note',
                        structuredData,
                        source: ShardSource.API, // Use API source for AI tool-created shards
                        sourceDetails: {
                            originalId: `ai-tool-create_note-${Date.now()}`,
                        },
                    };
                    // Link to project if provided
                    if (projectId) {
                        // Get project shard to create proper relationship
                        const projectShard = await this.shardRepository?.findById(projectId, context.tenantId);
                        if (projectShard) {
                            createInput.internal_relationships = [
                                {
                                    shardId: projectId,
                                    shardTypeId: projectShard.shardTypeId,
                                    shardName: projectShard.structuredData?.name || projectId,
                                    createdAt: new Date(),
                                    metadata: {
                                        source: 'llm',
                                        extractionMethod: 'ai-tool',
                                    },
                                },
                            ];
                        }
                    }
                    const shard = await this.shardRepository.create(createInput);
                    return {
                        success: true,
                        noteId: shard.id,
                        title: shard.structuredData?.name || title,
                        message: `Note "${title}" created successfully`,
                    };
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'ai-tool-executor.create_note',
                        tenantId: context.tenantId,
                    });
                    throw new Error(`Failed to create note: ${error.message}`);
                }
            },
        });
        // Draft Email Tool
        this.registerTool({
            name: 'draft_email',
            description: 'Draft and send an email. Use this when the user asks to send an email, draft a message, or compose an email.',
            parameters: {
                type: 'object',
                properties: {
                    to: {
                        type: 'string',
                        description: 'Recipient email address (or comma-separated list for multiple recipients)',
                    },
                    subject: {
                        type: 'string',
                        description: 'Email subject line',
                    },
                    body: {
                        type: 'string',
                        description: 'Email body content (plain text)',
                    },
                    cc: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'CC recipients (optional)',
                    },
                    bcc: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'BCC recipients (optional)',
                    },
                    send: {
                        type: 'boolean',
                        description: 'Whether to actually send the email (default: true). Set to false to only draft.',
                        default: true,
                    },
                },
                required: ['to', 'subject', 'body'],
            },
            enabledByDefault: true,
            requiresPermission: 'email.send',
            execute: async (args, context) => {
                if (!this.emailService) {
                    throw new Error('Email service is not available');
                }
                if (!this.emailService.isReady()) {
                    throw new Error('Email service is not ready');
                }
                const to = args.to;
                const subject = args.subject;
                const body = args.body;
                const cc = args.cc || [];
                const bcc = args.bcc || [];
                const shouldSend = args.send !== false;
                this.monitoring.trackEvent('ai-tool-executor.draft_email', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    to,
                    subject,
                    send: shouldSend,
                });
                try {
                    if (shouldSend) {
                        const result = await this.emailService.send({
                            to: to.split(',').map(e => e.trim()),
                            subject,
                            text: body,
                            cc: cc.length > 0 ? cc : undefined,
                            bcc: bcc.length > 0 ? bcc : undefined,
                        });
                        if (result.success) {
                            return {
                                success: true,
                                messageId: result.messageId,
                                message: `Email sent successfully to ${to}`,
                            };
                        }
                        else {
                            throw new Error(result.error || 'Failed to send email');
                        }
                    }
                    else {
                        // Just return the draft without sending
                        return {
                            success: true,
                            draft: {
                                to,
                                subject,
                                body,
                                cc,
                                bcc,
                            },
                            message: 'Email drafted (not sent)',
                        };
                    }
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        operation: 'ai-tool-executor.draft_email',
                        tenantId: context.tenantId,
                    });
                    throw new Error(`Failed to draft/send email: ${error.message}`);
                }
            },
        });
    }
    /**
     * Register a custom tool
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * List all registered tools (for admin UI)
     */
    listTools() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            requiresPermission: tool.requiresPermission,
            enabledByDefault: tool.enabledByDefault !== false,
            parameters: tool.parameters,
        }));
    }
    /**
     * Get tool information by name
     */
    getTool(name) {
        const tool = this.tools.get(name);
        if (!tool) {
            return null;
        }
        return {
            name: tool.name,
            description: tool.description,
            requiresPermission: tool.requiresPermission,
            enabledByDefault: tool.enabledByDefault !== false,
            parameters: tool.parameters,
        };
    }
    /**
     * Get available tools as ToolDefinitions for the AI model
     */
    async getAvailableTools(context) {
        const available = [];
        for (const tool of this.tools.values()) {
            // Check if tool is enabled by default
            if (tool.enabledByDefault === false) {
                continue;
            }
            // Check permissions if required
            if (tool.requiresPermission) {
                const hasPerm = await this.checkPermission(context, tool.requiresPermission);
                if (!hasPerm) {
                    // Skip this tool if user doesn't have permission
                    this.monitoring.trackEvent('ai-tool-executor.tool-skipped-permission', {
                        tenantId: context.tenantId,
                        userId: context.userId,
                        toolName: tool.name,
                        requiredPermission: tool.requiresPermission,
                    });
                    continue;
                }
            }
            available.push({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            });
        }
        return available;
    }
    /**
     * Check if user has the required permission
     */
    async checkPermission(context, permission) {
        const userRoles = context.userRoles || [];
        // Check static system roles
        for (const roleName of userRoles) {
            const asEnum = roleName;
            if (Object.values(UserRole).includes(asEnum)) {
                if (checkStaticPermission(asEnum, permission)) {
                    return true;
                }
            }
        }
        // Check dynamic roles via RoleManagementService
        if (this.roleManagementService) {
            for (const roleName of userRoles) {
                try {
                    const roleDef = await this.roleManagementService.getRoleByName(context.tenantId, roleName);
                    if (roleDef && roleDef.permissions.includes(permission)) {
                        return true;
                    }
                }
                catch (e) {
                    // Ignore missing roles or errors, try next role
                    this.monitoring.trackEvent('ai-tool-executor.role-check-failed', {
                        tenantId: context.tenantId,
                        roleName,
                        error: e.message,
                    });
                }
            }
        }
        return false;
    }
    /**
     * Execute a tool call
     */
    async executeToolCall(toolCall, context) {
        const tool = this.tools.get(toolCall.function.name);
        if (!tool) {
            return {
                toolCallId: toolCall.id,
                result: null,
                error: `Unknown tool: ${toolCall.function.name}`,
            };
        }
        // Check permissions before executing (defense in depth)
        if (tool.requiresPermission) {
            const hasPerm = await this.checkPermission(context, tool.requiresPermission);
            if (!hasPerm) {
                this.monitoring.trackEvent('ai-tool-executor.tool-execution-denied', {
                    tenantId: context.tenantId,
                    userId: context.userId,
                    toolName: tool.name,
                    requiredPermission: tool.requiresPermission,
                });
                return {
                    toolCallId: toolCall.id,
                    result: null,
                    error: `Permission denied: Missing required permission "${tool.requiresPermission}"`,
                };
            }
        }
        try {
            // Parse arguments
            const args = JSON.parse(toolCall.function.arguments);
            // Execute tool
            const result = await tool.execute(args, context);
            this.monitoring.trackEvent('ai-tool-executor.tool-executed', {
                tenantId: context.tenantId,
                userId: context.userId,
                toolName: tool.name,
                success: true,
            });
            return {
                toolCallId: toolCall.id,
                result,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-tool-executor.execute-tool',
                toolName: toolCall.function.name,
                tenantId: context.tenantId,
            });
            return {
                toolCallId: toolCall.id,
                result: null,
                error: error.message || 'Tool execution failed',
            };
        }
    }
    /**
     * Execute multiple tool calls
     */
    async executeToolCalls(toolCalls, context) {
        // Use Promise.allSettled to ensure all tool calls are attempted even if some fail
        const results = await Promise.allSettled(toolCalls.map(toolCall => this.executeToolCall(toolCall, context)));
        // Convert settled results to execution results, handling failures gracefully
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                // If a tool call failed, return an error result instead of throwing
                const toolCall = toolCalls[index];
                this.monitoring.trackException(result.reason instanceof Error ? result.reason : new Error(String(result.reason)), {
                    operation: 'ai-tool-executor.executeToolCalls.individualFailure',
                    toolName: toolCall.name,
                    toolCallId: toolCall.id,
                });
                return {
                    toolCallId: toolCall.id,
                    toolName: toolCall.name,
                    success: false,
                    result: null,
                    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                };
            }
        });
    }
}
//# sourceMappingURL=ai-tool-executor.service.js.map