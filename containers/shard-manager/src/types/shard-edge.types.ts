/**
 * Shard Edge Types
 * Separate collection for efficient relationship/graph queries
 */

/**
 * Relationship types between shards
 */
export enum RelationshipType {
  // Hierarchical
  PARENT_OF = 'parent_of',
  CHILD_OF = 'child_of',
  
  // Association
  RELATED_TO = 'related_to',
  LINKED_TO = 'linked_to',
  REFERENCES = 'references',
  
  // Ownership/Assignment
  OWNS = 'owns',
  OWNED_BY = 'owned_by',
  ASSIGNED_TO = 'assigned_to',
  ASSIGNED_BY = 'assigned_by',
  
  // Organizational
  BELONGS_TO = 'belongs_to',
  CONTAINS = 'contains',
  MEMBER_OF = 'member_of',
  HAS_MEMBER = 'has_member',
  
  // Business relationships
  HAS_CONTACT = 'has_contact',
  CONTACT_OF = 'contact_of',
  HAS_STAKEHOLDER = 'has_stakeholder',
  STAKEHOLDER_IN = 'stakeholder_in',
  HAS_OPPORTUNITY = 'has_opportunity',
  OPPORTUNITY_FOR = 'opportunity_for',
  COMPETITOR_OF = 'competitor_of',
  HAS_COMPETITOR = 'has_competitor',
  CONTACT_ROLE_IN = 'contact_role_in',
  HAS_CONTACT_ROLE = 'has_contact_role',
  LINE_ITEM_OF = 'line_item_of',
  HAS_LINE_ITEM = 'has_line_item',
  
  // Communication relationships
  REPLIES_TO = 'replies_to',
  IN_THREAD = 'in_thread',
  HAS_ATTACHMENT = 'has_attachment',
  ATTACHED_TO = 'attached_to',
  MESSAGE_IN_CHANNEL = 'message_in_channel',
  CHANNEL_HAS_MESSAGE = 'channel_has_message',
  CHANNEL_IN_TEAM = 'channel_in_team',
  TEAM_HAS_CHANNEL = 'team_has_channel',
  
  // Calendar & Meeting relationships
  HAS_ATTENDEE = 'has_attendee',
  ATTENDEE_OF = 'attendee_of',
  EVENT_IN_CALENDAR = 'event_in_calendar',
  CALENDAR_HAS_EVENT = 'calendar_has_event',
  MEETING_FOR = 'meeting_for',
  HAS_MEETING = 'has_meeting',
  
  // Marketing relationships
  WEBINAR_FOR_CAMPAIGN = 'webinar_for_campaign',
  CAMPAIGN_HAS_WEBINAR = 'campaign_has_webinar',
  ASSET_FOR_CAMPAIGN = 'asset_for_campaign',
  CAMPAIGN_HAS_ASSET = 'campaign_has_asset',
  REGISTRATION_FOR_EVENT = 'registration_for_event',
  EVENT_HAS_REGISTRATION = 'event_has_registration',
  SCORE_FOR_LEAD = 'score_for_lead',
  LEAD_HAS_SCORE = 'lead_has_score',
  
  // Sales Operations relationships
  ASSET_FOR_ORDER = 'asset_for_order',
  ORDER_HAS_ASSET = 'order_has_asset',
  PAYMENT_FOR_INVOICE = 'payment_for_invoice',
  INVOICE_HAS_PAYMENT = 'invoice_has_payment',
  REVENUE_FOR_CONTRACT = 'revenue_for_contract',
  CONTRACT_HAS_REVENUE = 'contract_has_revenue',
  ORDER_FOR_OPPORTUNITY = 'order_for_opportunity',
  OPPORTUNITY_HAS_ORDER = 'opportunity_has_order',
  INVOICE_FOR_ORDER = 'invoice_for_order',
  ORDER_HAS_INVOICE = 'order_has_invoice',
  QUOTE_FOR_OPPORTUNITY = 'quote_for_opportunity',
  OPPORTUNITY_HAS_QUOTE = 'opportunity_has_quote',
  
  // Content relationships
  MENTIONS = 'mentions',
  MENTIONED_IN = 'mentioned_in',
  DERIVED_FROM = 'derived_from',
  SOURCE_OF = 'source_of',
  
  // Templates
  TEMPLATE_FOR = 'template_for',
  USES_TEMPLATE = 'uses_template',
  INHERITS_FROM = 'inherits_from',
  INHERITED_BY = 'inherited_by',
  
  // Custom
  CUSTOM = 'custom',
}

/**
 * Get the inverse relationship type
 */
export function getInverseRelationship(type: RelationshipType): RelationshipType | null {
  const inverses: Record<RelationshipType, RelationshipType> = {
    [RelationshipType.PARENT_OF]: RelationshipType.CHILD_OF,
    [RelationshipType.CHILD_OF]: RelationshipType.PARENT_OF,
    [RelationshipType.RELATED_TO]: RelationshipType.RELATED_TO,
    [RelationshipType.LINKED_TO]: RelationshipType.LINKED_TO,
    [RelationshipType.REFERENCES]: RelationshipType.MENTIONED_IN,
    [RelationshipType.OWNS]: RelationshipType.OWNED_BY,
    [RelationshipType.OWNED_BY]: RelationshipType.OWNS,
    [RelationshipType.ASSIGNED_TO]: RelationshipType.ASSIGNED_BY,
    [RelationshipType.ASSIGNED_BY]: RelationshipType.ASSIGNED_TO,
    [RelationshipType.BELONGS_TO]: RelationshipType.CONTAINS,
    [RelationshipType.CONTAINS]: RelationshipType.BELONGS_TO,
    [RelationshipType.MEMBER_OF]: RelationshipType.HAS_MEMBER,
    [RelationshipType.HAS_MEMBER]: RelationshipType.MEMBER_OF,
    [RelationshipType.HAS_CONTACT]: RelationshipType.CONTACT_OF,
    [RelationshipType.CONTACT_OF]: RelationshipType.HAS_CONTACT,
    [RelationshipType.HAS_STAKEHOLDER]: RelationshipType.STAKEHOLDER_IN,
    [RelationshipType.STAKEHOLDER_IN]: RelationshipType.HAS_STAKEHOLDER,
    [RelationshipType.HAS_OPPORTUNITY]: RelationshipType.OPPORTUNITY_FOR,
    [RelationshipType.OPPORTUNITY_FOR]: RelationshipType.HAS_OPPORTUNITY,
    [RelationshipType.COMPETITOR_OF]: RelationshipType.HAS_COMPETITOR,
    [RelationshipType.HAS_COMPETITOR]: RelationshipType.COMPETITOR_OF,
    [RelationshipType.CONTACT_ROLE_IN]: RelationshipType.HAS_CONTACT_ROLE,
    [RelationshipType.HAS_CONTACT_ROLE]: RelationshipType.CONTACT_ROLE_IN,
    [RelationshipType.LINE_ITEM_OF]: RelationshipType.HAS_LINE_ITEM,
    [RelationshipType.HAS_LINE_ITEM]: RelationshipType.LINE_ITEM_OF,
    [RelationshipType.REPLIES_TO]: RelationshipType.IN_THREAD,
    [RelationshipType.IN_THREAD]: RelationshipType.REPLIES_TO,
    [RelationshipType.HAS_ATTACHMENT]: RelationshipType.ATTACHED_TO,
    [RelationshipType.ATTACHED_TO]: RelationshipType.HAS_ATTACHMENT,
    [RelationshipType.MESSAGE_IN_CHANNEL]: RelationshipType.CHANNEL_HAS_MESSAGE,
    [RelationshipType.CHANNEL_HAS_MESSAGE]: RelationshipType.MESSAGE_IN_CHANNEL,
    [RelationshipType.CHANNEL_IN_TEAM]: RelationshipType.TEAM_HAS_CHANNEL,
    [RelationshipType.TEAM_HAS_CHANNEL]: RelationshipType.CHANNEL_IN_TEAM,
    [RelationshipType.HAS_ATTENDEE]: RelationshipType.ATTENDEE_OF,
    [RelationshipType.ATTENDEE_OF]: RelationshipType.HAS_ATTENDEE,
    [RelationshipType.EVENT_IN_CALENDAR]: RelationshipType.CALENDAR_HAS_EVENT,
    [RelationshipType.CALENDAR_HAS_EVENT]: RelationshipType.EVENT_IN_CALENDAR,
    [RelationshipType.MEETING_FOR]: RelationshipType.HAS_MEETING,
    [RelationshipType.HAS_MEETING]: RelationshipType.MEETING_FOR,
    [RelationshipType.WEBINAR_FOR_CAMPAIGN]: RelationshipType.CAMPAIGN_HAS_WEBINAR,
    [RelationshipType.CAMPAIGN_HAS_WEBINAR]: RelationshipType.WEBINAR_FOR_CAMPAIGN,
    [RelationshipType.ASSET_FOR_CAMPAIGN]: RelationshipType.CAMPAIGN_HAS_ASSET,
    [RelationshipType.CAMPAIGN_HAS_ASSET]: RelationshipType.ASSET_FOR_CAMPAIGN,
    [RelationshipType.REGISTRATION_FOR_EVENT]: RelationshipType.EVENT_HAS_REGISTRATION,
    [RelationshipType.EVENT_HAS_REGISTRATION]: RelationshipType.REGISTRATION_FOR_EVENT,
    [RelationshipType.SCORE_FOR_LEAD]: RelationshipType.LEAD_HAS_SCORE,
    [RelationshipType.LEAD_HAS_SCORE]: RelationshipType.SCORE_FOR_LEAD,
    [RelationshipType.ASSET_FOR_ORDER]: RelationshipType.ORDER_HAS_ASSET,
    [RelationshipType.ORDER_HAS_ASSET]: RelationshipType.ASSET_FOR_ORDER,
    [RelationshipType.PAYMENT_FOR_INVOICE]: RelationshipType.INVOICE_HAS_PAYMENT,
    [RelationshipType.INVOICE_HAS_PAYMENT]: RelationshipType.PAYMENT_FOR_INVOICE,
    [RelationshipType.REVENUE_FOR_CONTRACT]: RelationshipType.CONTRACT_HAS_REVENUE,
    [RelationshipType.CONTRACT_HAS_REVENUE]: RelationshipType.REVENUE_FOR_CONTRACT,
    [RelationshipType.ORDER_FOR_OPPORTUNITY]: RelationshipType.OPPORTUNITY_HAS_ORDER,
    [RelationshipType.OPPORTUNITY_HAS_ORDER]: RelationshipType.ORDER_FOR_OPPORTUNITY,
    [RelationshipType.INVOICE_FOR_ORDER]: RelationshipType.ORDER_HAS_INVOICE,
    [RelationshipType.ORDER_HAS_INVOICE]: RelationshipType.INVOICE_FOR_ORDER,
    [RelationshipType.QUOTE_FOR_OPPORTUNITY]: RelationshipType.OPPORTUNITY_HAS_QUOTE,
    [RelationshipType.OPPORTUNITY_HAS_QUOTE]: RelationshipType.QUOTE_FOR_OPPORTUNITY,
    [RelationshipType.MENTIONS]: RelationshipType.MENTIONED_IN,
    [RelationshipType.MENTIONED_IN]: RelationshipType.MENTIONS,
    [RelationshipType.DERIVED_FROM]: RelationshipType.SOURCE_OF,
    [RelationshipType.SOURCE_OF]: RelationshipType.DERIVED_FROM,
    [RelationshipType.TEMPLATE_FOR]: RelationshipType.USES_TEMPLATE,
    [RelationshipType.USES_TEMPLATE]: RelationshipType.TEMPLATE_FOR,
    [RelationshipType.INHERITS_FROM]: RelationshipType.INHERITED_BY,
    [RelationshipType.INHERITED_BY]: RelationshipType.INHERITS_FROM,
    [RelationshipType.CUSTOM]: RelationshipType.CUSTOM,
  };
  return inverses[type] || null;
}

/**
 * Check if relationship is bidirectional (same in both directions)
 */
export function isBidirectional(type: RelationshipType): boolean {
  return type === RelationshipType.RELATED_TO || type === RelationshipType.LINKED_TO;
}

/**
 * Shard Edge document stored in Cosmos DB
 * Represents a directed relationship between two shards
 */
export interface ShardEdge {
  /** Unique edge ID */
  id: string;
  /** Tenant ID (partition key) */
  tenantId: string;

  // Source shard
  /** Source shard ID */
  sourceShardId: string;
  /** Source shard type ID */
  sourceShardTypeId: string;
  /** Source shard type name (denormalized for queries) */
  sourceShardTypeName: string;

  // Target shard
  /** Target shard ID */
  targetShardId: string;
  /** Target shard type ID */
  targetShardTypeId: string;
  /** Target shard type name (denormalized for queries) */
  targetShardTypeName: string;

  // Relationship details
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

  // Metadata
  /** Additional metadata about the relationship */
  metadata?: Record<string, any>;
  /** Order/position for sorted relationships */
  order?: number;

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;

  // Cosmos DB system fields
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
  sourceShardTypeId?: string;
  sourceShardTypeName?: string;
  targetShardId: string;
  targetShardTypeId?: string;
  targetShardTypeName?: string;
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
