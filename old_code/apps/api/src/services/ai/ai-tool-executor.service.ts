// Type safety improvements - removed @ts-nocheck
/**
 * AI Tool Executor Service
 * Handles execution of function calls from AI models
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ToolCall, ToolDefinition } from './unified-ai-client.service.js';
import {
  ShardRepository,
  UnifiedEmailService,
} from '@castiel/api-core';
import { WebSearchService } from '../web-search/web-search.service.js';
import { CreateShardInput, ShardSource } from '../../types/shard.types.js';
import { hasPermission as checkStaticPermission, UserRole } from '@castiel/shared-types';
import type { RoleManagementService } from '../auth/role-management.service.js';

export interface ToolExecutionResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ToolHandler {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
  requiresPermission?: string;
  enabledByDefault?: boolean;
}

export interface ToolExecutionContext {
  tenantId: string;
  userId: string;
  userRoles?: string[]; // User roles for permission checking
  projectId?: string;
  shardRepository?: ShardRepository;
  webSearchService?: WebSearchService;
  emailService?: UnifiedEmailService;
}

/**
 * AI Tool Executor Service
 * Executes function calls from AI models
 */
export class AIToolExecutorService {
  private tools: Map<string, ToolHandler> = new Map();
  private comprehensiveAuditTrailService?: {
    logToolExecution: (data: {
      tenantId: string;
      userId: string;
      toolName: string;
      toolCallId: string;
      arguments?: Record<string, unknown>;
      result?: unknown;
      durationMs: number;
      success: boolean;
      error?: string;
      errorCode?: string;
      metadata?: Record<string, unknown>;
    }) => Promise<void>;
  };
  private executionStats: Map<string, { total: number; success: number; failed: number; denied: number }> = new Map();

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository?: ShardRepository,
    private webSearchService?: WebSearchService,
    private emailService?: UnifiedEmailService,
    private roleManagementService?: RoleManagementService,
    comprehensiveAuditTrailService?: {
      logToolExecution: (data: {
        tenantId: string;
        userId: string;
        toolName: string;
        toolCallId: string;
        arguments?: Record<string, unknown>;
        result?: unknown;
        durationMs: number;
        success: boolean;
        error?: string;
        errorCode?: string;
        metadata?: Record<string, unknown>;
      }) => Promise<void>;
    }
  ) {
    this.comprehensiveAuditTrailService = comprehensiveAuditTrailService;
    this.registerDefaultTools();
  }

  /**
   * Set comprehensive audit trail service (for late injection)
   */
  setComprehensiveAuditTrailService(service: {
    logToolExecution: (data: {
      tenantId: string;
      userId: string;
      toolName: string;
      toolCallId: string;
      arguments?: Record<string, unknown>;
      result?: unknown;
      durationMs: number;
      success: boolean;
      error?: string;
      errorCode?: string;
      metadata?: Record<string, unknown>;
    }) => Promise<void>;
  }): void {
    this.comprehensiveAuditTrailService = service;
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
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

        const query = args.query as string;
        const searchType = (args.searchType as string) || 'general';
        const timeRange = (args.timeRange as string) || undefined;

        this.monitoring.trackEvent('ai-tool-executor.web_search', {
          tenantId: context.tenantId,
          userId: context.userId,
          query,
          searchType,
        });

        try {
          const searchOptions: any = {
            timeRange: timeRange as 'day' | 'week' | 'month' | 'year' | undefined,
          };
          // Add type if webSearchService supports it (SearchOptions uses 'type' not 'searchType')
          if (searchType) {
            searchOptions.type = searchType as 'general' | 'news' | 'company';
          }
          const result = await this.webSearchService.search(context.tenantId, query, searchOptions);

          return {
            success: true,
            results: result.search.results?.slice(0, 5).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
            })) || [],
            summary: `Found ${result.search.results?.length || 0} results for "${query}"`,
          };
        } catch (error: any) {
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
      requiresPermission: 'shard:read:assigned', // Phase 2.3: Added missing permission check
      execute: async (args, context) => {
        if (!this.shardRepository) {
          throw new Error('Shard repository is not available');
        }

        const shardId = args.shardId as string;
        const includeRelationships = (args.includeRelationships as boolean) || false;

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

          const result: any = {
            success: true,
            shard: {
              id: shard.id,
              shardTypeId: shard.shardTypeId,
              structuredData: shard.structuredData,
              metadata: shard.metadata,
            },
          };

          if (includeRelationships && shard.internal_relationships) {
            result.relationships = shard.internal_relationships.map((rel: any) => ({
              shardId: rel.shardId,
              shardTypeId: rel.shardTypeId,
              shardName: rel.shardName,
            }));
          }

          return result;
        } catch (error: any) {
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

        const title = args.title as string;
        const description = (args.description as string) || '';
        const priority = (args.priority as string) || 'medium';
        const dueDate = args.dueDate ? new Date(args.dueDate as string) : undefined;
        const assigneeUserId = (args.assigneeUserId as string) || context.userId;
        const projectId = (args.projectId as string) || context.projectId;
        const tags = (args.tags as string[]) || [];

        this.monitoring.trackEvent('ai-tool-executor.create_task', {
          tenantId: context.tenantId,
          userId: context.userId,
          title,
          priority,
        });

        try {
          const structuredData: any = {
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

          const createInput: CreateShardInput = {
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
                  shardName: (projectShard.structuredData as any)?.name || projectId,
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
        } catch (error: any) {
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

        const title = args.title as string;
        const content = args.content as string;
        const projectId = (args.projectId as string) || context.projectId;
        const tags = (args.tags as string[]) || [];

        this.monitoring.trackEvent('ai-tool-executor.create_note', {
          tenantId: context.tenantId,
          userId: context.userId,
          title,
        });

        try {
          const structuredData: any = {
            name: title,
            content,
          };

          if (tags.length > 0) {
            structuredData.tags = tags;
          }

          const createInput: CreateShardInput = {
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
                  shardName: (projectShard.structuredData as any)?.name || projectId,
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
        } catch (error: any) {
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

        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;
        const cc = (args.cc as string[]) || [];
        const bcc = (args.bcc as string[]) || [];
        const shouldSend = (args.send as boolean) !== false;

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
            } else {
              throw new Error(result.error || 'Failed to send email');
            }
          } else {
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
        } catch (error: any) {
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
   * Validates that tools have proper permission requirements
   */
  registerTool(tool: ToolHandler): void {
    // Validate tool registration: warn if tool doesn't have permission requirement
    if (!tool.requiresPermission && tool.enabledByDefault !== false) {
      this.monitoring.trackEvent('ai-tool-executor.tool-registered-without-permission', {
        toolName: tool.name,
        severity: 'warning',
        message: `Tool "${tool.name}" registered without permission requirement but is enabled by default`,
      });
    }

    // Initialize execution stats for this tool
    if (!this.executionStats.has(tool.name)) {
      this.executionStats.set(tool.name, { total: 0, success: 0, failed: 0, denied: 0 });
    }

    this.tools.set(tool.name, tool);
    
    this.monitoring.trackEvent('ai-tool-executor.tool-registered', {
      toolName: tool.name,
      hasPermission: !!tool.requiresPermission,
      permission: tool.requiresPermission || 'none',
      enabledByDefault: tool.enabledByDefault !== false,
    });
  }

  /**
   * List all registered tools (for admin UI)
   */
  listTools(): Array<{
    name: string;
    description: string;
    requiresPermission?: string;
    enabledByDefault: boolean;
    parameters: Record<string, unknown>;
  }> {
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
  getTool(name: string): {
    name: string;
    description: string;
    requiresPermission?: string;
    enabledByDefault: boolean;
    parameters: Record<string, unknown>;
  } | null {
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
  async getAvailableTools(context: ToolExecutionContext): Promise<ToolDefinition[]> {
    const available: ToolDefinition[] = [];

    for (const tool of this.tools.values()) {
      // Check if tool is enabled by default
      if (tool.enabledByDefault === false) {
        continue;
      }

      // Check permissions if required
      if (tool.requiresPermission) {
        const hasPerm = await this.checkPermission(
          context,
          tool.requiresPermission,
          tool.name
        );
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
   * Phase 2.3: Enhanced with audit trail logging
   */
  private async checkPermission(
    context: ToolExecutionContext,
    permission: string,
    toolName?: string
  ): Promise<boolean> {
    const userRoles = context.userRoles || [];
    const startTime = Date.now();

    // Check static system roles
    for (const roleName of userRoles) {
      const asEnum = roleName as UserRole;
      if (Object.values(UserRole).includes(asEnum)) {
        if (checkStaticPermission(asEnum, permission)) {
          const durationMs = Date.now() - startTime;
          // Log successful permission check
          this.monitoring.trackEvent('ai-tool-executor.permission-check', {
            tenantId: context.tenantId,
            userId: context.userId,
            permission,
            toolName: toolName || 'unknown',
            granted: true,
            method: 'static-role',
            roleName,
            durationMs,
          });
          return true;
        }
      }
    }

    // Check dynamic roles via RoleManagementService
    if (this.roleManagementService) {
      for (const roleName of userRoles) {
        try {
          const roleDef = await this.roleManagementService.getRoleByName(
            context.tenantId,
            roleName
          );
          if (roleDef && roleDef.permissions.includes(permission)) {
            const durationMs = Date.now() - startTime;
            // Log successful permission check
            this.monitoring.trackEvent('ai-tool-executor.permission-check', {
              tenantId: context.tenantId,
              userId: context.userId,
              permission,
              toolName: toolName || 'unknown',
              granted: true,
              method: 'dynamic-role',
              roleName,
              durationMs,
            });
            return true;
          }
        } catch (e) {
          // Ignore missing roles or errors, try next role
          this.monitoring.trackEvent('ai-tool-executor.role-check-failed', {
            tenantId: context.tenantId,
            roleName,
            error: (e as Error).message,
          });
        }
      }
    }

    // Log denied permission check
    const durationMs = Date.now() - startTime;
    this.monitoring.trackEvent('ai-tool-executor.permission-check', {
      tenantId: context.tenantId,
      userId: context.userId,
      permission,
      toolName: toolName || 'unknown',
      granted: false,
      userRoles: userRoles.join(','),
      durationMs,
    });

    return false;
  }

  /**
   * Execute a tool call
   */
  async executeToolCall(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
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
      const hasPerm = await this.checkPermission(context, tool.requiresPermission, tool.name);
      if (!hasPerm) {
        this.monitoring.trackEvent('ai-tool-executor.tool-execution-denied', {
          tenantId: context.tenantId,
          userId: context.userId,
          toolName: tool.name,
          requiredPermission: tool.requiresPermission,
          toolCallId: toolCall.id,
        });

        // Log permission denial to comprehensive audit trail if available
        if (this.comprehensiveAuditTrailService) {
          this.comprehensiveAuditTrailService.logToolExecution({
            tenantId: context.tenantId,
            userId: context.userId,
            toolName: tool.name,
            toolCallId: toolCall.id,
            durationMs: 0,
            success: false,
            error: `Permission denied: Missing required permission "${tool.requiresPermission}"`,
            errorCode: 'PERMISSION_DENIED',
            metadata: {
              requiredPermission: tool.requiresPermission,
              userRoles: context.userRoles || [],
            },
          }).catch((auditError: Error) => {
            // Log audit error but don't break main flow
            this.monitoring.trackException(auditError, {
              operation: 'ai-tool-executor.audit-logging-error',
              tenantId: context.tenantId,
              toolName: tool.name,
            });
          });
        }

        return {
          toolCallId: toolCall.id,
          result: null,
          error: `Permission denied: You don't have the required permission "${tool.requiresPermission}" to use the "${tool.name}" tool. Please contact your administrator if you need access to this feature.`,
        };
      }
    }

    const executionStartTime = Date.now();
    let parsedArgs: Record<string, unknown> = {};
    
    try {
      // Parse arguments
      parsedArgs = JSON.parse(toolCall.function.arguments) || {};

      // Log tool execution start (Phase 2.3: Enhanced audit trail)
      this.monitoring.trackEvent('ai-tool-executor.tool-execution-start', {
        tenantId: context.tenantId,
        userId: context.userId,
        toolName: tool.name,
        toolCallId: toolCall.id,
        hasArguments: !!parsedArgs,
        argumentKeys: parsedArgs ? Object.keys(parsedArgs).join(',') : '',
      });

      // Execute tool
      const result = await tool.execute(parsedArgs, context);

      const durationMs = Date.now() - executionStartTime;

      // Update execution stats
      const stats = this.executionStats.get(tool.name);
      if (stats) {
        stats.total++;
        stats.success++;
      }

      // Log successful tool execution (Phase 2.3: Enhanced audit trail)
      this.monitoring.trackEvent('ai-tool-executor.tool-executed', {
        tenantId: context.tenantId,
        userId: context.userId,
        toolName: tool.name,
        toolCallId: toolCall.id,
        success: true,
        durationMs,
        hasResult: !!result,
        resultType: result ? typeof result : 'null',
      });

      // Always log to audit trail (comprehensive service if available, otherwise monitoring)
      const auditData = {
        tenantId: context.tenantId,
        userId: context.userId,
        toolName: tool.name,
        toolCallId: toolCall.id,
        arguments: parsedArgs,
        result: result,
        durationMs,
        success: true,
        metadata: {
          hasResult: !!result,
          resultType: result ? typeof result : 'null',
          projectId: context.projectId,
          requiredPermission: tool.requiresPermission,
        },
      };

      if (this.comprehensiveAuditTrailService) {
        this.comprehensiveAuditTrailService.logToolExecution(auditData).catch((auditError: Error) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError, {
            operation: 'ai-tool-executor.audit-logging-error',
            tenantId: context.tenantId,
            toolName: tool.name,
          });
        });
      } else {
        // Fallback: log to monitoring as audit trail
        this.monitoring.trackEvent('ai-tool-executor.audit-trail', {
          ...auditData,
          auditSource: 'monitoring-fallback',
        });
      }

      return {
        toolCallId: toolCall.id,
        result,
      };
    } catch (error: any) {
      const durationMs = Date.now() - executionStartTime;

      this.monitoring.trackException(error, {
        operation: 'ai-tool-executor.execute-tool',
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        tenantId: context.tenantId,
        durationMs,
      });

      // Update execution stats
      const stats = this.executionStats.get(tool.name);
      if (stats) {
        stats.total++;
        stats.failed++;
      }

      // Log failed tool execution (Phase 2.3: Enhanced audit trail)
      this.monitoring.trackEvent('ai-tool-executor.tool-executed', {
        tenantId: context.tenantId,
        userId: context.userId,
        toolName: tool.name,
        toolCallId: toolCall.id,
        success: false,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });

      // Always log to audit trail (comprehensive service if available, otherwise monitoring)
      const auditData = {
        tenantId: context.tenantId,
        userId: context.userId,
        toolName: tool.name,
        toolCallId: toolCall.id,
        arguments: parsedArgs,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'TOOL_EXECUTION_ERROR',
        metadata: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          projectId: context.projectId,
          requiredPermission: tool.requiresPermission,
        },
      };

      if (this.comprehensiveAuditTrailService) {
        this.comprehensiveAuditTrailService.logToolExecution(auditData).catch((auditError: Error) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError, {
            operation: 'ai-tool-executor.audit-logging-error',
            tenantId: context.tenantId,
            toolName: tool.name,
          });
        });
      } else {
        // Fallback: log to monitoring as audit trail
        this.monitoring.trackEvent('ai-tool-executor.audit-trail', {
          ...auditData,
          auditSource: 'monitoring-fallback',
        });
      }

      return {
        toolCallId: toolCall.id,
        result: null,
        error: error instanceof Error ? error.message : String(error) || 'Tool execution failed',
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    // Use Promise.allSettled to ensure all tool calls are attempted even if some fail
    const results = await Promise.allSettled(
      toolCalls.map(toolCall => this.executeToolCall(toolCall, context))
    );

    // Convert settled results to execution results, handling failures gracefully
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // If a tool call failed, return an error result instead of throwing
        const toolCall = toolCalls[index];
        const toolName = toolCall.function.name;
        this.monitoring.trackException(result.reason instanceof Error ? result.reason : new Error(String(result.reason)), {
          operation: 'ai-tool-executor.executeToolCalls.individualFailure',
          toolName: toolName,
          toolCallId: toolCall.id,
        });
        return {
          toolCallId: toolCall.id,
          result: null,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      }
    });
  }

  /**
   * Get tool execution statistics
   */
  getExecutionStats(): Map<string, { total: number; success: number; failed: number; denied: number }> {
    return new Map(this.executionStats);
  }

  /**
   * Get execution statistics for a specific tool
   */
  getToolExecutionStats(toolName: string): { total: number; success: number; failed: number; denied: number } | null {
    return this.executionStats.get(toolName) || null;
  }

  /**
   * Reset execution statistics (for testing or periodic cleanup)
   */
  resetExecutionStats(toolName?: string): void {
    if (toolName) {
      const stats = this.executionStats.get(toolName);
      if (stats) {
        stats.total = 0;
        stats.success = 0;
        stats.failed = 0;
        stats.denied = 0;
      }
    } else {
      // Reset all stats
      for (const stats of this.executionStats.values()) {
        stats.total = 0;
        stats.success = 0;
        stats.failed = 0;
        stats.denied = 0;
      }
    }
  }

  /**
   * Validate all registered tools have proper permission requirements
   * Returns list of tools without permissions
   */
  validateToolPermissions(): Array<{ toolName: string; enabledByDefault: boolean; hasPermission: boolean }> {
    const issues: Array<{ toolName: string; enabledByDefault: boolean; hasPermission: boolean }> = [];

    for (const [toolName, tool] of this.tools.entries()) {
      if (!tool.requiresPermission && tool.enabledByDefault !== false) {
        issues.push({
          toolName,
          enabledByDefault: tool.enabledByDefault !== false,
          hasPermission: false,
        });
      }
    }

    return issues;
  }
}

