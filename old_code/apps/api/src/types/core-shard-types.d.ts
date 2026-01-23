/**
 * Core ShardType Definitions
 * System-provided ShardTypes that are available to all tenants
 */
import { ShardTypeCategory, RichSchema } from './shard-type.types.js';
import type { EmbeddingTemplate } from './embedding-template.types.js';
/**
 * Core ShardType names
 */
export declare const CORE_SHARD_TYPE_NAMES: {
    readonly COMPANY: "c_company";
    readonly CONTACT: "c_contact";
    readonly PROJECT: "c_project";
    readonly OPPORTUNITY: "c_opportunity";
    readonly OPPORTUNITY_HISTORY: "c_opportunityHistory";
    readonly OPPORTUNITY_COMPETITOR: "c_opportunityCompetitor";
    readonly OPPORTUNITY_CONTACT_ROLE: "c_opportunityContactRole";
    readonly OPPORTUNITY_LINE_ITEM: "c_opportunityLineItem";
    readonly DOCUMENT: "c_document";
    readonly NOTE: "c_note";
    readonly NEWS: "c_news";
    readonly TASK: "c_task";
    readonly EVENT: "c_event";
    readonly EMAIL: "c_email";
    readonly ACTIVITY: "c_activity";
    readonly PRODUCT: "c_product";
    readonly ASSISTANT: "c_assistant";
    readonly CONTEXT_TEMPLATE: "c_contextTemplate";
    readonly CONVERSATION_TEMPLATE: "c_conversationTemplate";
    readonly AI_MODEL: "c_aimodel";
    readonly AI_CONFIG: "c_aiconfig";
    readonly CONVERSATION: "c_conversation";
    readonly CONVERSATION_MESSAGE: "c_conversationMessage";
    readonly DASHBOARD: "c_dashboard";
    readonly DASHBOARD_WIDGET: "c_dashboardWidget";
    readonly DASHBOARD_VERSION: "c_dashboardVersion";
    readonly WEBPAGES: "c_webpages";
    readonly ACCOUNT: "c_account";
    readonly LEAD: "c_lead";
    readonly TICKET: "c_ticket";
    readonly CAMPAIGN: "c_campaign";
    readonly QUOTE: "c_quote";
    readonly MEETING: "c_meeting";
    readonly CALENDAR: "c_calendar";
    readonly MESSAGE: "c_message";
    readonly TEAM: "c_team";
    readonly ATTACHMENT: "c_attachment";
    readonly COMPETITOR: "c_competitor";
    readonly CONTRACT: "c_contract";
    readonly ORDER: "c_order";
    readonly INVOICE: "c_invoice";
    readonly PAYMENT: "c_payment";
    readonly REVENUE: "c_revenue";
    readonly CALL: "c_call";
    readonly WEBINAR: "c_webinar";
    readonly MARKETING_ASSET: "c_marketingAsset";
    readonly EVENT_REGISTRATION: "c_eventRegistration";
    readonly LEAD_SCORE: "c_leadScore";
    readonly PRICE_BOOK: "c_priceBook";
    readonly ASSET: "c_asset";
    readonly FOLDER: "c_folder";
    readonly FILE: "c_file";
    readonly SP_SITE: "c_sp_site";
    readonly CHANNEL: "c_channel";
    readonly INTEGRATION_STATE: "integration.state";
    readonly INSIGHT_KPI: "c_insight_kpi";
    readonly RISK_CATALOG: "c_risk_catalog";
    readonly RISK_SNAPSHOT: "c_risk_snapshot";
    readonly QUOTA: "c_quota";
    readonly RISK_SIMULATION: "c_risk_simulation";
    readonly BENCHMARK: "c_benchmark";
    readonly USER_TEAMS: "c_userTeams";
    readonly SYSTEM_METRIC: "system.metric";
    readonly SYSTEM_AUDIT_LOG: "system.audit_log";
};
export type CoreShardTypeName = typeof CORE_SHARD_TYPE_NAMES[keyof typeof CORE_SHARD_TYPE_NAMES];
/**
 * Core ShardType definition
 */
export interface CoreShardTypeDefinition {
    name: CoreShardTypeName;
    displayName: string;
    description: string;
    category: ShardTypeCategory;
    schema: RichSchema;
    icon?: string;
    color?: string;
    tags: string[];
}
export declare const TASK_SHARD_TYPE: CoreShardTypeDefinition;
export declare const EVENT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_event
 * Used for vector search and AI insights on calendar events
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const EVENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const EMAIL_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_email
 * Used for vector search and AI insights on email messages
 * CRITICAL: Uses chunking for long email bodies
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const EMAIL_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const ACTIVITY_SHARD_TYPE: CoreShardTypeDefinition;
export declare const PRODUCT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_product
 * Used for vector search and AI insights on products
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const PRODUCT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const NEWS_SHARD_TYPE: CoreShardTypeDefinition;
export declare const AI_MODEL_SHARD_TYPE: CoreShardTypeDefinition;
export declare const CONVERSATION_SHARD_TYPE: CoreShardTypeDefinition;
export declare const CONVERSATION_MESSAGE_SHARD_TYPE: CoreShardTypeDefinition;
export declare const CONVERSATION_TEMPLATE_SHARD_TYPE: CoreShardTypeDefinition;
export declare const AI_CONFIG_SHARD_TYPE: CoreShardTypeDefinition;
export declare const DASHBOARD_SHARD_TYPE: CoreShardTypeDefinition;
export declare const DASHBOARD_WIDGET_SHARD_TYPE: CoreShardTypeDefinition;
export declare const DASHBOARD_VERSION_SHARD_TYPE: CoreShardTypeDefinition;
export declare const PROJECT_SHARD_TYPE: CoreShardTypeDefinition;
export declare const WEBPAGES_SHARD_TYPE: CoreShardTypeDefinition;
export declare const OPPORTUNITY_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_opportunity
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const OPPORTUNITY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const ACCOUNT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_account
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const ACCOUNT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CONTACT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_contact
 * CRITICAL: Uses quality model (text-embedding-3-large) for highest precision
 * Used for vector search, AI insights, chats, and risk analysis
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const CONTACT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const LEAD_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_lead
 * Used for vector search, AI insights, and lead qualification
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const LEAD_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const COMPANY_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_company
 * Used for vector search and AI insights on company data
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const COMPANY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const NOTE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_note
 * Used for vector search and AI insights on notes
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const NOTE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const OPPORTUNITY_COMPETITOR_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_opportunityCompetitor
 * Used for vector search and AI insights on competitors
 */
export declare const OPPORTUNITY_COMPETITOR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const OPPORTUNITY_CONTACT_ROLE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_opportunityContactRole
 * Used for vector search and AI insights on contact roles
 */
export declare const OPPORTUNITY_CONTACT_ROLE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const OPPORTUNITY_LINE_ITEM_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_opportunityLineItem
 * Used for vector search and AI insights on line items
 */
export declare const OPPORTUNITY_LINE_ITEM_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const TICKET_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_ticket
 * Used for vector search and AI insights on support tickets
 */
export declare const TICKET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CAMPAIGN_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_campaign
 * Used for vector search and AI insights on marketing campaigns
 */
export declare const CAMPAIGN_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const QUOTE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_quote
 * Used for vector search and AI insights on quotes
 */
export declare const QUOTE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const OPPORTUNITY_HISTORY_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_opportunityHistory
 * Used for vector search and AI insights on opportunity history
 *
 * Note: This template should be applied when creating/updating the ShardType
 * from CoreShardTypeDefinition. Store in ShardType.embeddingTemplate
 */
export declare const OPPORTUNITY_HISTORY_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const FOLDER_SHARD_TYPE: CoreShardTypeDefinition;
export declare const FILE_SHARD_TYPE: CoreShardTypeDefinition;
export declare const SP_SITE_SHARD_TYPE: CoreShardTypeDefinition;
export declare const CHANNEL_SHARD_TYPE: CoreShardTypeDefinition;
export declare const MEETING_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_meeting
 * Used for vector search and AI insights on meetings
 */
export declare const MEETING_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CALENDAR_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_calendar
 * Used for vector search and AI insights on calendars
 */
export declare const CALENDAR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const MESSAGE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_message
 * Used for vector search and AI insights on messages
 */
export declare const MESSAGE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const TEAM_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_team
 * Used for vector search and AI insights on teams
 */
export declare const TEAM_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const ATTACHMENT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_attachment
 * Used for vector search and AI insights on attachments
 */
export declare const ATTACHMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const COMPETITOR_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_competitor
 * Used for vector search and AI insights on competitors
 */
export declare const COMPETITOR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CONTRACT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_contract
 * Used for vector search and AI insights on contracts
 */
export declare const CONTRACT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const ORDER_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_order
 * Used for vector search and AI insights on orders
 */
export declare const ORDER_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const INVOICE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_invoice
 * Used for vector search and AI insights on invoices
 */
export declare const INVOICE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const PAYMENT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_payment
 * Used for vector search and AI insights on payments
 */
export declare const PAYMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const REVENUE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_revenue
 * Used for vector search and AI insights on revenue recognition
 */
export declare const REVENUE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CALL_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_call
 * Used for vector search and AI insights on calls
 */
export declare const CALL_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const WEBINAR_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_webinar
 * Used for vector search and AI insights on webinars
 */
export declare const WEBINAR_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const MARKETING_ASSET_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_marketingAsset
 * Used for vector search and AI insights on marketing assets
 */
export declare const MARKETING_ASSET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const EVENT_REGISTRATION_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_eventRegistration
 * Used for vector search and AI insights on event registrations
 */
export declare const EVENT_REGISTRATION_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const LEAD_SCORE_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_leadScore
 * Used for vector search and AI insights on lead scores
 */
export declare const LEAD_SCORE_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const PRICE_BOOK_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_priceBook
 * Used for vector search and AI insights on price books
 */
export declare const PRICE_BOOK_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const ASSET_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_asset
 * Used for vector search and AI insights on assets
 */
export declare const ASSET_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const INTEGRATION_STATE_SHARD_TYPE: CoreShardTypeDefinition;
export declare const SYSTEM_METRIC_SHARD_TYPE: CoreShardTypeDefinition;
export declare const SYSTEM_AUDIT_LOG_SHARD_TYPE: CoreShardTypeDefinition;
export declare const INSIGHT_KPI_SHARD_TYPE: CoreShardTypeDefinition;
export declare const RISK_CATALOG_SHARD_TYPE: CoreShardTypeDefinition;
export declare const RISK_SNAPSHOT_SHARD_TYPE: CoreShardTypeDefinition;
export declare const QUOTA_SHARD_TYPE: CoreShardTypeDefinition;
export declare const RISK_SIMULATION_SHARD_TYPE: CoreShardTypeDefinition;
export declare const BENCHMARK_SHARD_TYPE: CoreShardTypeDefinition;
export declare const USER_TEAMS_SHARD_TYPE: CoreShardTypeDefinition;
export declare const DOCUMENT_SHARD_TYPE: CoreShardTypeDefinition;
export declare const ASSISTANT_SHARD_TYPE: CoreShardTypeDefinition;
/**
 * Embedding Template for c_document
 * Used for vector search and AI insights on documents
 */
export declare const DOCUMENT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
/**
 * Embedding Template for c_assistant
 * Used for vector search and AI insights on assistant configurations
 */
export declare const ASSISTANT_EMBEDDING_TEMPLATE: Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;
export declare const CORE_SHARD_TYPES: CoreShardTypeDefinition[];
/**
 * Get core ShardType definition by name
 */
export declare function getCoreShardType(name: CoreShardTypeName): CoreShardTypeDefinition | undefined;
/**
 * Mapping from shard type names to their embedding templates
 * Used by CoreTypesSeederService to include embedding templates when creating ShardTypes
 */
export declare const EMBEDDING_TEMPLATE_MAP: Record<CoreShardTypeName, Omit<EmbeddingTemplate, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'> | undefined>;
/**
 * Check if a ShardType name is a core type
 */
export declare function isCoreShardType(name: string): boolean;
//# sourceMappingURL=core-shard-types.d.ts.map