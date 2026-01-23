/**
 * Shard Edge Types
 * Separate collection for efficient relationship/graph queries
 */
/**
 * Relationship types between shards
 */
export declare enum RelationshipType {
    PARENT_OF = "parent_of",
    CHILD_OF = "child_of",
    RELATED_TO = "related_to",
    LINKED_TO = "linked_to",
    REFERENCES = "references",
    OWNS = "owns",
    OWNED_BY = "owned_by",
    ASSIGNED_TO = "assigned_to",
    ASSIGNED_BY = "assigned_by",
    BELONGS_TO = "belongs_to",
    CONTAINS = "contains",
    MEMBER_OF = "member_of",
    HAS_MEMBER = "has_member",
    HAS_CONTACT = "has_contact",
    CONTACT_OF = "contact_of",
    HAS_STAKEHOLDER = "has_stakeholder",
    STAKEHOLDER_IN = "stakeholder_in",
    HAS_OPPORTUNITY = "has_opportunity",
    OPPORTUNITY_FOR = "opportunity_for",
    COMPETITOR_OF = "competitor_of",
    HAS_COMPETITOR = "has_competitor",
    CONTACT_ROLE_IN = "contact_role_in",
    HAS_CONTACT_ROLE = "has_contact_role",
    LINE_ITEM_OF = "line_item_of",
    HAS_LINE_ITEM = "has_line_item",
    REPLIES_TO = "replies_to",
    IN_THREAD = "in_thread",
    HAS_ATTACHMENT = "has_attachment",
    ATTACHED_TO = "attached_to",
    MESSAGE_IN_CHANNEL = "message_in_channel",
    CHANNEL_HAS_MESSAGE = "channel_has_message",
    CHANNEL_IN_TEAM = "channel_in_team",
    TEAM_HAS_CHANNEL = "team_has_channel",
    HAS_ATTENDEE = "has_attendee",
    ATTENDEE_OF = "attendee_of",
    EVENT_IN_CALENDAR = "event_in_calendar",
    CALENDAR_HAS_EVENT = "calendar_has_event",
    MEETING_FOR = "meeting_for",
    HAS_MEETING = "has_meeting",
    WEBINAR_FOR_CAMPAIGN = "webinar_for_campaign",
    CAMPAIGN_HAS_WEBINAR = "campaign_has_webinar",
    ASSET_FOR_CAMPAIGN = "asset_for_campaign",
    CAMPAIGN_HAS_ASSET = "campaign_has_asset",
    REGISTRATION_FOR_EVENT = "registration_for_event",
    EVENT_HAS_REGISTRATION = "event_has_registration",
    SCORE_FOR_LEAD = "score_for_lead",
    LEAD_HAS_SCORE = "lead_has_score",
    ASSET_FOR_ORDER = "asset_for_order",
    ORDER_HAS_ASSET = "order_has_asset",
    PAYMENT_FOR_INVOICE = "payment_for_invoice",
    INVOICE_HAS_PAYMENT = "invoice_has_payment",
    REVENUE_FOR_CONTRACT = "revenue_for_contract",
    CONTRACT_HAS_REVENUE = "contract_has_revenue",
    ORDER_FOR_OPPORTUNITY = "order_for_opportunity",
    OPPORTUNITY_HAS_ORDER = "opportunity_has_order",
    INVOICE_FOR_ORDER = "invoice_for_order",
    ORDER_HAS_INVOICE = "order_has_invoice",
    QUOTE_FOR_OPPORTUNITY = "quote_for_opportunity",
    OPPORTUNITY_HAS_QUOTE = "opportunity_has_quote",
    MENTIONS = "mentions",
    MENTIONED_IN = "mentioned_in",
    DERIVED_FROM = "derived_from",
    SOURCE_OF = "source_of",
    TEMPLATE_FOR = "template_for",
    USES_TEMPLATE = "uses_template",
    INHERITS_FROM = "inherits_from",
    INHERITED_BY = "inherited_by",
    CUSTOM = "custom"
}
/**
 * Get the inverse relationship type
 */
export declare function getInverseRelationship(type: RelationshipType): RelationshipType | null;
/**
 * Check if relationship is bidirectional (same in both directions)
 */
export declare function isBidirectional(type: RelationshipType): boolean;
/**
 * Shard Edge document stored in Cosmos DB
 * Represents a directed relationship between two shards
 */
export interface ShardEdge {
    /** Unique edge ID */
    id: string;
    /** Tenant ID (partition key) */
    tenantId: string;
    /** Source shard ID */
    sourceShardId: string;
    /** Source shard type ID */
    sourceShardTypeId: string;
    /** Source shard type name (denormalized for queries) */
    sourceShardTypeName: string;
    /** Target shard ID */
    targetShardId: string;
    /** Target shard type ID */
    targetShardTypeId: string;
    /** Target shard type name (denormalized for queries) */
    targetShardTypeName: string;
    /** Type of relationship */
    relationshipType: RelationshipType | string;
    /** Human-readable label for this specific relationship */
    label?: string;
    /** Weight/strength of relationship (for ranking) */
    weight?: number;
    /** Whether an inverse edge should be auto-created */
    bidirectional: boolean;
    /** ID of the inverse edge (if bidirectional) */
    inverseEdgeId?: string;
    /** Additional metadata about the relationship */
    metadata?: Record<string, any>;
    /** Order/position for sorted relationships */
    order?: number;
    createdAt: Date;
    createdBy: string;
    updatedAt?: Date;
    updatedBy?: string;
    _rid?: string;
    _self?: string;
    _etag?: string;
    _ts?: number;
}
/**
 * Input for creating an edge
 */
export interface CreateEdgeInput {
    tenantId: string;
    sourceShardId: string;
    sourceShardTypeId: string;
    sourceShardTypeName: string;
    targetShardId: string;
    targetShardTypeId: string;
    targetShardTypeName: string;
    relationshipType: RelationshipType | string;
    label?: string;
    weight?: number;
    bidirectional?: boolean;
    metadata?: Record<string, any>;
    order?: number;
    createdBy: string;
}
/**
 * Input for updating an edge
 */
export interface UpdateEdgeInput {
    label?: string;
    weight?: number;
    metadata?: Record<string, any>;
    order?: number;
    updatedBy: string;
}
/**
 * Edge query filters
 */
export interface EdgeQueryFilter {
    tenantId: string;
    sourceShardId?: string;
    targetShardId?: string;
    sourceShardTypeId?: string;
    targetShardTypeId?: string;
    relationshipType?: RelationshipType | string;
    label?: string;
    minWeight?: number;
    maxWeight?: number;
}
/**
 * Edge query options
 */
export interface EdgeQueryOptions {
    filter: EdgeQueryFilter;
    limit?: number;
    continuationToken?: string;
    orderBy?: 'createdAt' | 'weight' | 'order';
    orderDirection?: 'asc' | 'desc';
    includeInverse?: boolean;
}
/**
 * Edge query result
 */
export interface EdgeQueryResult {
    edges: ShardEdge[];
    continuationToken?: string;
    count: number;
}
/**
 * Graph node for visualization
 */
export interface GraphNode {
    id: string;
    shardTypeId: string;
    shardTypeName: string;
    label?: string;
    data?: Record<string, any>;
}
/**
 * Graph data for visualization
 */
export interface GraphData {
    nodes: GraphNode[];
    edges: ShardEdge[];
    rootNodeId: string;
    depth: number;
}
/**
 * Options for graph traversal
 */
export interface GraphTraversalOptions {
    tenantId: string;
    rootShardId: string;
    maxDepth?: number;
    direction?: 'outgoing' | 'incoming' | 'both';
    relationshipTypes?: (RelationshipType | string)[];
    excludeShardTypes?: string[];
    includeShardTypes?: string[];
    maxNodes?: number;
}
/**
 * Relationship summary for a shard
 */
export interface RelationshipSummary {
    shardId: string;
    tenantId: string;
    outgoing: {
        total: number;
        byType: Record<string, number>;
    };
    incoming: {
        total: number;
        byType: Record<string, number>;
    };
}
/**
 * Bulk edge operation input
 */
export interface BulkEdgeInput {
    edges: CreateEdgeInput[];
    options?: {
        skipInverseCreation?: boolean;
        onError?: 'continue' | 'abort';
    };
}
/**
 * Bulk edge operation result
 */
export interface BulkEdgeResult {
    success: boolean;
    summary: {
        total: number;
        created: number;
        failed: number;
    };
    results: Array<{
        index: number;
        status: 'created' | 'failed';
        edgeId?: string;
        error?: string;
    }>;
}
//# sourceMappingURL=shard-edge.types.d.ts.map