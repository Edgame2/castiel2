/**
 * Shard Relationship Types
 *
 * Types for managing relationships between shards (knowledge graph)
 */
/**
 * Relationship type enum
 */
export var RelationshipType;
(function (RelationshipType) {
    RelationshipType["REFERENCES"] = "references";
    RelationshipType["RELATED_TO"] = "relatedTo";
    RelationshipType["PART_OF"] = "partOf";
    RelationshipType["CONTAINS"] = "contains";
    RelationshipType["PRECEDES"] = "precedes";
    RelationshipType["FOLLOWS"] = "follows";
    RelationshipType["DERIVED_FROM"] = "derivedFrom";
    RelationshipType["SIMILAR_TO"] = "similarTo";
    RelationshipType["OPPOSITE_OF"] = "oppositeOf";
    RelationshipType["DEPENDS_ON"] = "dependsOn";
    RelationshipType["MENTIONS"] = "mentions";
    RelationshipType["TAGS"] = "tags";
    RelationshipType["LINKS_TO"] = "linksTo";
    RelationshipType["CUSTOM"] = "custom";
})(RelationshipType || (RelationshipType = {}));
/**
 * Relationship direction
 */
export var RelationshipDirection;
(function (RelationshipDirection) {
    RelationshipDirection["OUTGOING"] = "outgoing";
    RelationshipDirection["INCOMING"] = "incoming";
    RelationshipDirection["BOTH"] = "both";
})(RelationshipDirection || (RelationshipDirection = {}));
//# sourceMappingURL=shard-relationship.types.js.map