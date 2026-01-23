/**
 * Analytics & Metrics Types
 * Usage analytics, trending, predictive insights, and custom metrics
 */
/**
 * Analytics metric types
 */
export var MetricType;
(function (MetricType) {
    MetricType["COUNTER"] = "counter";
    MetricType["GAUGE"] = "gauge";
    MetricType["HISTOGRAM"] = "histogram";
    MetricType["TIMER"] = "timer";
    MetricType["CUSTOM"] = "custom";
})(MetricType || (MetricType = {}));
/**
 * Time aggregation levels
 */
export var TimeAggregation;
(function (TimeAggregation) {
    TimeAggregation["MINUTE"] = "minute";
    TimeAggregation["HOUR"] = "hour";
    TimeAggregation["DAY"] = "day";
    TimeAggregation["WEEK"] = "week";
    TimeAggregation["MONTH"] = "month";
    TimeAggregation["QUARTER"] = "quarter";
    TimeAggregation["YEAR"] = "year";
})(TimeAggregation || (TimeAggregation = {}));
/**
 * Trending directions
 */
export var TrendDirection;
(function (TrendDirection) {
    TrendDirection["UP"] = "up";
    TrendDirection["DOWN"] = "down";
    TrendDirection["STABLE"] = "stable";
    TrendDirection["ANOMALY"] = "anomaly";
})(TrendDirection || (TrendDirection = {}));
//# sourceMappingURL=analytics.types.js.map