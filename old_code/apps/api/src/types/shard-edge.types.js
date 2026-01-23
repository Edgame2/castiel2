/**
 * Shard Edge Types
 * Separate collection for efficient relationship/graph queries
 */
/**
 * Relationship types between shards
 */
export var RelationshipType;
(function (RelationshipType) {
    // Hierarchical
    RelationshipType["PARENT_OF"] = "parent_of";
    RelationshipType["CHILD_OF"] = "child_of";
    // Association
    RelationshipType["RELATED_TO"] = "related_to";
    RelationshipType["LINKED_TO"] = "linked_to";
    RelationshipType["REFERENCES"] = "references";
    // Ownership/Assignment
    RelationshipType["OWNS"] = "owns";
    RelationshipType["OWNED_BY"] = "owned_by";
    RelationshipType["ASSIGNED_TO"] = "assigned_to";
    RelationshipType["ASSIGNED_BY"] = "assigned_by";
    // Organizational
    RelationshipType["BELONGS_TO"] = "belongs_to";
    RelationshipType["CONTAINS"] = "contains";
    RelationshipType["MEMBER_OF"] = "member_of";
    RelationshipType["HAS_MEMBER"] = "has_member";
    // Business relationships
    RelationshipType["HAS_CONTACT"] = "has_contact";
    RelationshipType["CONTACT_OF"] = "contact_of";
    RelationshipType["HAS_STAKEHOLDER"] = "has_stakeholder";
    RelationshipType["STAKEHOLDER_IN"] = "stakeholder_in";
    RelationshipType["HAS_OPPORTUNITY"] = "has_opportunity";
    RelationshipType["OPPORTUNITY_FOR"] = "opportunity_for";
    RelationshipType["COMPETITOR_OF"] = "competitor_of";
    RelationshipType["HAS_COMPETITOR"] = "has_competitor";
    RelationshipType["CONTACT_ROLE_IN"] = "contact_role_in";
    RelationshipType["HAS_CONTACT_ROLE"] = "has_contact_role";
    RelationshipType["LINE_ITEM_OF"] = "line_item_of";
    RelationshipType["HAS_LINE_ITEM"] = "has_line_item";
    // Communication relationships
    RelationshipType["REPLIES_TO"] = "replies_to";
    RelationshipType["IN_THREAD"] = "in_thread";
    RelationshipType["HAS_ATTACHMENT"] = "has_attachment";
    RelationshipType["ATTACHED_TO"] = "attached_to";
    RelationshipType["MESSAGE_IN_CHANNEL"] = "message_in_channel";
    RelationshipType["CHANNEL_HAS_MESSAGE"] = "channel_has_message";
    RelationshipType["CHANNEL_IN_TEAM"] = "channel_in_team";
    RelationshipType["TEAM_HAS_CHANNEL"] = "team_has_channel";
    // Calendar & Meeting relationships
    RelationshipType["HAS_ATTENDEE"] = "has_attendee";
    RelationshipType["ATTENDEE_OF"] = "attendee_of";
    RelationshipType["EVENT_IN_CALENDAR"] = "event_in_calendar";
    RelationshipType["CALENDAR_HAS_EVENT"] = "calendar_has_event";
    RelationshipType["MEETING_FOR"] = "meeting_for";
    RelationshipType["HAS_MEETING"] = "has_meeting";
    // Marketing relationships
    RelationshipType["WEBINAR_FOR_CAMPAIGN"] = "webinar_for_campaign";
    RelationshipType["CAMPAIGN_HAS_WEBINAR"] = "campaign_has_webinar";
    RelationshipType["ASSET_FOR_CAMPAIGN"] = "asset_for_campaign";
    RelationshipType["CAMPAIGN_HAS_ASSET"] = "campaign_has_asset";
    RelationshipType["REGISTRATION_FOR_EVENT"] = "registration_for_event";
    RelationshipType["EVENT_HAS_REGISTRATION"] = "event_has_registration";
    RelationshipType["SCORE_FOR_LEAD"] = "score_for_lead";
    RelationshipType["LEAD_HAS_SCORE"] = "lead_has_score";
    // Sales Operations relationships
    RelationshipType["ASSET_FOR_ORDER"] = "asset_for_order";
    RelationshipType["ORDER_HAS_ASSET"] = "order_has_asset";
    RelationshipType["PAYMENT_FOR_INVOICE"] = "payment_for_invoice";
    RelationshipType["INVOICE_HAS_PAYMENT"] = "invoice_has_payment";
    RelationshipType["REVENUE_FOR_CONTRACT"] = "revenue_for_contract";
    RelationshipType["CONTRACT_HAS_REVENUE"] = "contract_has_revenue";
    RelationshipType["ORDER_FOR_OPPORTUNITY"] = "order_for_opportunity";
    RelationshipType["OPPORTUNITY_HAS_ORDER"] = "opportunity_has_order";
    RelationshipType["INVOICE_FOR_ORDER"] = "invoice_for_order";
    RelationshipType["ORDER_HAS_INVOICE"] = "order_has_invoice";
    RelationshipType["QUOTE_FOR_OPPORTUNITY"] = "quote_for_opportunity";
    RelationshipType["OPPORTUNITY_HAS_QUOTE"] = "opportunity_has_quote";
    // Content relationships
    RelationshipType["MENTIONS"] = "mentions";
    RelationshipType["MENTIONED_IN"] = "mentioned_in";
    RelationshipType["DERIVED_FROM"] = "derived_from";
    RelationshipType["SOURCE_OF"] = "source_of";
    // Templates
    RelationshipType["TEMPLATE_FOR"] = "template_for";
    RelationshipType["USES_TEMPLATE"] = "uses_template";
    RelationshipType["INHERITS_FROM"] = "inherits_from";
    RelationshipType["INHERITED_BY"] = "inherited_by";
    // Custom
    RelationshipType["CUSTOM"] = "custom";
})(RelationshipType || (RelationshipType = {}));
/**
 * Get the inverse relationship type
 */
export function getInverseRelationship(type) {
    const inverses = {
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
export function isBidirectional(type) {
    return type === RelationshipType.RELATED_TO || type === RelationshipType.LINKED_TO;
}
//# sourceMappingURL=shard-edge.types.js.map