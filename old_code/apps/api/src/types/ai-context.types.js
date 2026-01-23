/**
 * AI Chat Context Types
 * Context assembly for AI-powered chat with topic extraction, clustering, and optimization
 */
export var ContextSourceType;
(function (ContextSourceType) {
    ContextSourceType["SHARD"] = "SHARD";
    ContextSourceType["ACTIVITY_LOG"] = "ACTIVITY_LOG";
    ContextSourceType["RECOMMENDATION"] = "RECOMMENDATION";
    ContextSourceType["TEMPLATE"] = "TEMPLATE";
    ContextSourceType["RELATED_LINK"] = "RELATED_LINK";
    ContextSourceType["USER_PREFERENCE"] = "USER_PREFERENCE";
    ContextSourceType["SEARCH_RESULT"] = "SEARCH_RESULT";
    ContextSourceType["CONVERSATION_HISTORY"] = "CONVERSATION_HISTORY";
})(ContextSourceType || (ContextSourceType = {}));
export var TopicCategory;
(function (TopicCategory) {
    TopicCategory["TECHNICAL"] = "TECHNICAL";
    TopicCategory["BUSINESS"] = "BUSINESS";
    TopicCategory["PROCESS"] = "PROCESS";
    TopicCategory["PLANNING"] = "PLANNING";
    TopicCategory["ANALYSIS"] = "ANALYSIS";
    TopicCategory["DOCUMENTATION"] = "DOCUMENTATION";
    TopicCategory["REQUIREMENTS"] = "REQUIREMENTS";
    TopicCategory["WORKFLOW"] = "WORKFLOW";
    TopicCategory["DECISION"] = "DECISION";
    TopicCategory["OTHER"] = "OTHER";
})(TopicCategory || (TopicCategory = {}));
export var ContextQualityLevel;
(function (ContextQualityLevel) {
    ContextQualityLevel["HIGH"] = "HIGH";
    ContextQualityLevel["MEDIUM"] = "MEDIUM";
    ContextQualityLevel["LOW"] = "LOW";
    ContextQualityLevel["MINIMAL"] = "MINIMAL";
})(ContextQualityLevel || (ContextQualityLevel = {}));
//# sourceMappingURL=ai-context.types.js.map