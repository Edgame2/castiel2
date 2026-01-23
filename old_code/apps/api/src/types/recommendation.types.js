/**
 * Recommendation Types
 * Multi-factor recommendation engine with explanation generation
 */
export var RecommendationType;
(function (RecommendationType) {
    RecommendationType["SHARD_LINK"] = "SHARD_LINK";
    RecommendationType["SHARD_INCLUSION"] = "SHARD_INCLUSION";
    RecommendationType["COLLABORATOR"] = "COLLABORATOR";
    RecommendationType["TEMPLATE"] = "TEMPLATE";
    RecommendationType["AI_CONTEXT"] = "AI_CONTEXT";
})(RecommendationType || (RecommendationType = {}));
export var RecommendationSource;
(function (RecommendationSource) {
    RecommendationSource["VECTOR_SEARCH"] = "VECTOR_SEARCH";
    RecommendationSource["COLLABORATIVE_FILTERING"] = "COLLABORATIVE_FILTERING";
    RecommendationSource["TEMPORAL"] = "TEMPORAL";
    RecommendationSource["CONTENT_BASED"] = "CONTENT_BASED";
    RecommendationSource["HYBRID"] = "HYBRID";
})(RecommendationSource || (RecommendationSource = {}));
export var RecommendationStatus;
(function (RecommendationStatus) {
    RecommendationStatus["PENDING"] = "PENDING";
    RecommendationStatus["ACCEPTED"] = "ACCEPTED";
    RecommendationStatus["DISMISSED"] = "DISMISSED";
    RecommendationStatus["EXPIRED"] = "EXPIRED";
})(RecommendationStatus || (RecommendationStatus = {}));
//# sourceMappingURL=recommendation.types.js.map