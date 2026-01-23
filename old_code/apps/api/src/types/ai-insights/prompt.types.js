/**
 * Prompt Scopes
 */
export var PromptScope;
(function (PromptScope) {
    PromptScope["System"] = "system";
    PromptScope["Tenant"] = "tenant";
    PromptScope["Project"] = "project";
    PromptScope["User"] = "user";
})(PromptScope || (PromptScope = {}));
/**
 * Canonical Insight Types (shared with frontend/DB)
 */
export var InsightType;
(function (InsightType) {
    InsightType["Summary"] = "summary";
    InsightType["Analysis"] = "analysis";
    InsightType["Comparison"] = "comparison";
    InsightType["Recommendation"] = "recommendation";
    InsightType["Prediction"] = "prediction";
    InsightType["Extraction"] = "extraction";
    InsightType["Search"] = "search";
    InsightType["Generation"] = "generation";
})(InsightType || (InsightType = {}));
export var PromptStatus;
(function (PromptStatus) {
    PromptStatus["Draft"] = "draft";
    PromptStatus["Active"] = "active";
    PromptStatus["Archived"] = "archived";
})(PromptStatus || (PromptStatus = {}));
//# sourceMappingURL=prompt.types.js.map