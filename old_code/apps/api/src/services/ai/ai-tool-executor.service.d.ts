/**
 * AI Tool Executor Service
 * Handles execution of function calls from AI models
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ToolCall, ToolDefinition } from './unified-ai-client.service.js';
import { ShardRepository } from '../../repositories/shard.repository.js';
import { WebSearchService } from '../web-search/web-search.service.js';
import { UnifiedEmailService } from '../email/email.service.js';
import type { RoleManagementService } from '../auth/role-management.service.js';
export interface ToolExecutionResult {
    toolCallId: string;
    result: unknown;
    error?: string;
}
export interface ToolHandler {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
    requiresPermission?: string;
    enabledByDefault?: boolean;
}
export interface ToolExecutionContext {
    tenantId: string;
    userId: string;
    userRoles?: string[];
    projectId?: string;
    shardRepository?: ShardRepository;
    webSearchService?: WebSearchService;
    emailService?: UnifiedEmailService;
}
/**
 * AI Tool Executor Service
 * Executes function calls from AI models
 */
export declare class AIToolExecutorService {
    private monitoring;
    private shardRepository?;
    private webSearchService?;
    private emailService?;
    private roleManagementService?;
    private tools;
    constructor(monitoring: IMonitoringProvider, shardRepository?: ShardRepository | undefined, webSearchService?: WebSearchService | undefined, emailService?: UnifiedEmailService | undefined, roleManagementService?: RoleManagementService | undefined);
    /**
     * Register default tools
     */
    private registerDefaultTools;
    /**
     * Register a custom tool
     */
    registerTool(tool: ToolHandler): void;
    /**
     * List all registered tools (for admin UI)
     */
    listTools(): Array<{
        name: string;
        description: string;
        requiresPermission?: string;
        enabledByDefault: boolean;
        parameters: Record<string, unknown>;
    }>;
    /**
     * Get tool information by name
     */
    getTool(name: string): {
        name: string;
        description: string;
        requiresPermission?: string;
        enabledByDefault: boolean;
        parameters: Record<string, unknown>;
    } | null;
    /**
     * Get available tools as ToolDefinitions for the AI model
     */
    getAvailableTools(context: ToolExecutionContext): Promise<ToolDefinition[]>;
    /**
     * Check if user has the required permission
     */
    private checkPermission;
    /**
     * Execute a tool call
     */
    executeToolCall(toolCall: ToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult>;
    /**
     * Execute multiple tool calls
     */
    executeToolCalls(toolCalls: ToolCall[], context: ToolExecutionContext): Promise<ToolExecutionResult[]>;
}
//# sourceMappingURL=ai-tool-executor.service.d.ts.map