/**
 * Shard Linking Types
 * Defines structures for enhanced shard linking with relationship types and batch operations
 */
export var RelationshipType;
(function (RelationshipType) {
    /** Reference document or knowledge base */
    RelationshipType["REFERENCE_DOCUMENT"] = "REFERENCE_DOCUMENT";
    /** Blocking task that must be completed first */
    RelationshipType["BLOCKING_TASK"] = "BLOCKING_TASK";
    /** Blocked by another task */
    RelationshipType["BLOCKED_BY"] = "BLOCKED_BY";
    /** Related task with dependency */
    RelationshipType["DEPENDS_ON"] = "DEPENDS_ON";
    /** This task is depended on by another */
    RelationshipType["DEPENDENCY_FOR"] = "DEPENDENCY_FOR";
    /** Contains sub-tasks or related items */
    RelationshipType["CONTAINS"] = "CONTAINS";
    /** Related context or background information */
    RelationshipType["RELATED_CONTEXT"] = "RELATED_CONTEXT";
    /** Links to external resource or reference */
    RelationshipType["EXTERNAL_LINK"] = "EXTERNAL_LINK";
    /** Parent item for hierarchical relationships */
    RelationshipType["PARENT_OF"] = "PARENT_OF";
    /** Child item in hierarchy */
    RelationshipType["CHILD_OF"] = "CHILD_OF";
    /** Associated with (generic relationship) */
    RelationshipType["ASSOCIATED_WITH"] = "ASSOCIATED_WITH";
    /** Duplicates or conflicts with */
    RelationshipType["CONFLICTS_WITH"] = "CONFLICTS_WITH";
    /** Implementation detail or spec for */
    RelationshipType["IMPLEMENTS"] = "IMPLEMENTS";
    /** Risk or issue for this */
    RelationshipType["RISK_FOR"] = "RISK_FOR";
    /** Mitigation for risk */
    RelationshipType["MITIGATES"] = "MITIGATES";
    /** Evidence or support for claim */
    RelationshipType["EVIDENCE_FOR"] = "EVIDENCE_FOR";
    /** Impact analysis or outcome of */
    RelationshipType["IMPACTS"] = "IMPACTS";
    /** Custom user-defined relationship */
    RelationshipType["CUSTOM"] = "CUSTOM";
})(RelationshipType || (RelationshipType = {}));
//# sourceMappingURL=shard-linking.types.js.map