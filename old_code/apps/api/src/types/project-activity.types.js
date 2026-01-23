/**
 * Project Activity Tracking Types
 * Defines structures for comprehensive activity trail logging across projects
 * Supports filtering, pagination, and audit trail leverage
 */
export var ProjectActivityType;
(function (ProjectActivityType) {
    ProjectActivityType["PROJECT_CREATED"] = "PROJECT_CREATED";
    ProjectActivityType["PROJECT_UPDATED"] = "PROJECT_UPDATED";
    ProjectActivityType["PROJECT_DELETED"] = "PROJECT_DELETED";
    ProjectActivityType["PROJECT_SHARED"] = "PROJECT_SHARED";
    ProjectActivityType["PROJECT_UNSHARED"] = "PROJECT_UNSHARED";
    ProjectActivityType["PROJECT_OWNERSHIP_TRANSFERRED"] = "PROJECT_OWNERSHIP_TRANSFERRED";
    ProjectActivityType["SHARD_LINKED"] = "SHARD_LINKED";
    ProjectActivityType["SHARD_UNLINKED"] = "SHARD_UNLINKED";
    ProjectActivityType["SHARD_RELATIONSHIP_CHANGED"] = "SHARD_RELATIONSHIP_CHANGED";
    ProjectActivityType["AI_CHAT_INITIATED"] = "AI_CHAT_INITIATED";
    ProjectActivityType["AI_CHAT_COMPLETED"] = "AI_CHAT_COMPLETED";
    ProjectActivityType["RECOMMENDATION_GENERATED"] = "RECOMMENDATION_GENERATED";
    ProjectActivityType["RECOMMENDATION_ACCEPTED"] = "RECOMMENDATION_ACCEPTED";
    ProjectActivityType["RECOMMENDATION_DISMISSED"] = "RECOMMENDATION_DISMISSED";
    ProjectActivityType["COLLABORATOR_ADDED"] = "COLLABORATOR_ADDED";
    ProjectActivityType["COLLABORATOR_ROLE_CHANGED"] = "COLLABORATOR_ROLE_CHANGED";
    ProjectActivityType["COLLABORATOR_REMOVED"] = "COLLABORATOR_REMOVED";
    ProjectActivityType["TEMPLATE_USED"] = "TEMPLATE_USED";
    ProjectActivityType["VERSION_SNAPSHOT_CREATED"] = "VERSION_SNAPSHOT_CREATED";
    ProjectActivityType["VERSION_SNAPSHOT_RESTORED"] = "VERSION_SNAPSHOT_RESTORED";
    ProjectActivityType["CUSTOM_QUESTION_ADDED"] = "CUSTOM_QUESTION_ADDED";
    ProjectActivityType["CUSTOM_QUESTION_REMOVED"] = "CUSTOM_QUESTION_REMOVED";
    ProjectActivityType["ACTIVITY_EXPORTED"] = "ACTIVITY_EXPORTED";
})(ProjectActivityType || (ProjectActivityType = {}));
export var ActivitySeverity;
(function (ActivitySeverity) {
    ActivitySeverity["LOW"] = "low";
    ActivitySeverity["MEDIUM"] = "medium";
    ActivitySeverity["HIGH"] = "high";
    ActivitySeverity["CRITICAL"] = "critical";
})(ActivitySeverity || (ActivitySeverity = {}));
//# sourceMappingURL=project-activity.types.js.map