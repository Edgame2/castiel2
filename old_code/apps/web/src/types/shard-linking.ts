export enum LinkRelationshipType {
    /** Reference document or knowledge base */
    REFERENCE_DOCUMENT = 'REFERENCE_DOCUMENT',

    /** Blocking task that must be completed first */
    BLOCKING_TASK = 'BLOCKING_TASK',

    /** Blocked by another task */
    BLOCKED_BY = 'BLOCKED_BY',

    /** Related task with dependency */
    DEPENDS_ON = 'DEPENDS_ON',

    /** This task is depended on by another */
    DEPENDENCY_FOR = 'DEPENDENCY_FOR',

    /** Contains sub-tasks or related items */
    CONTAINS = 'CONTAINS',

    /** Related context or background information */
    RELATED_CONTEXT = 'RELATED_CONTEXT',

    /** Links to external resource or reference */
    EXTERNAL_LINK = 'EXTERNAL_LINK',

    /** Parent item for hierarchical relationships */
    PARENT_OF = 'PARENT_OF',

    /** Child item in hierarchy */
    CHILD_OF = 'CHILD_OF',

    /** Associated with (generic relationship) */
    ASSOCIATED_WITH = 'ASSOCIATED_WITH',

    /** Duplicates or conflicts with */
    CONFLICTS_WITH = 'CONFLICTS_WITH',

    /** Implementation detail or spec for */
    IMPLEMENTS = 'IMPLEMENTS',

    /** Risk or issue for this */
    RISK_FOR = 'RISK_FOR',

    /** Mitigation for risk */
    MITIGATES = 'MITIGATES',

    /** Evidence or support for claim */
    EVIDENCE_FOR = 'EVIDENCE_FOR',

    /** Impact analysis or outcome of */
    IMPACTS = 'IMPACTS',

    /** Custom user-defined relationship */
    CUSTOM = 'CUSTOM',
}

export interface CreateLinkInput {
    fromShardId: string;
    toShardId: string;
    relationshipType: LinkRelationshipType;
    customLabel?: string;
    description?: string;
    strength?: number;
    isBidirectional?: boolean;
    priority?: number;
    tags?: string[];
    projectId: string;
}

export interface ShardLink {
    id: string;
    tenantId: string;
    projectId: string;
    fromShardId: string;
    toShardId: string;
    relationshipType: LinkRelationshipType;
    // ... add other fields if needed for UI, but keeping it minimal for now
    createdAt: string;
    updatedAt: string;
}
