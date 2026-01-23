/**
 * Import/Export Types
 *
 * Types for shard data import and export operations
 */
/**
 * Supported export formats
 */
export var ExportFormat;
(function (ExportFormat) {
    ExportFormat["JSON"] = "json";
    ExportFormat["CSV"] = "csv";
    ExportFormat["EXCEL"] = "xlsx";
    ExportFormat["NDJSON"] = "ndjson";
})(ExportFormat || (ExportFormat = {}));
/**
 * Supported import formats
 */
export var ImportFormat;
(function (ImportFormat) {
    ImportFormat["JSON"] = "json";
    ImportFormat["CSV"] = "csv";
    ImportFormat["EXCEL"] = "xlsx";
    ImportFormat["NDJSON"] = "ndjson";
})(ImportFormat || (ImportFormat = {}));
/**
 * Export job status
 */
export var ExportJobStatus;
(function (ExportJobStatus) {
    ExportJobStatus["PENDING"] = "pending";
    ExportJobStatus["IN_PROGRESS"] = "in_progress";
    ExportJobStatus["COMPLETED"] = "completed";
    ExportJobStatus["FAILED"] = "failed";
    ExportJobStatus["EXPIRED"] = "expired";
})(ExportJobStatus || (ExportJobStatus = {}));
/**
 * Import job status
 */
export var ImportJobStatus;
(function (ImportJobStatus) {
    ImportJobStatus["PENDING"] = "pending";
    ImportJobStatus["VALIDATING"] = "validating";
    ImportJobStatus["IN_PROGRESS"] = "in_progress";
    ImportJobStatus["COMPLETED"] = "completed";
    ImportJobStatus["COMPLETED_WITH_ERRORS"] = "completed_with_errors";
    ImportJobStatus["FAILED"] = "failed";
})(ImportJobStatus || (ImportJobStatus = {}));
//# sourceMappingURL=import-export.types.js.map