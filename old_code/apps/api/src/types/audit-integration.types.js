/**
 * Audit & Enterprise Integration Types
 * Audit logging, SSO integration, data warehouse connectors, real-time streaming
 */
/**
 * Audit Actions
 */
export var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["READ"] = "READ";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["RESTORE"] = "RESTORE";
    AuditAction["ARCHIVE"] = "ARCHIVE";
    AuditAction["UNARCHIVE"] = "UNARCHIVE";
    AuditAction["SHARE"] = "SHARE";
    AuditAction["UNSHARE"] = "UNSHARE";
    AuditAction["EXPORT"] = "EXPORT";
    AuditAction["IMPORT"] = "IMPORT";
    AuditAction["PUBLISH"] = "PUBLISH";
    AuditAction["ROLLBACK"] = "ROLLBACK";
    AuditAction["LINK"] = "LINK";
    AuditAction["UNLINK"] = "UNLINK";
    AuditAction["BULK_ACTION"] = "BULK_ACTION";
    AuditAction["PERMISSION_CHANGE"] = "PERMISSION_CHANGE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["AUTH_FAILURE"] = "AUTH_FAILURE";
    AuditAction["PROFILE_UPDATE"] = "PROFILE_UPDATE";
    AuditAction["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditAction["API_KEY_GENERATE"] = "API_KEY_GENERATE";
    AuditAction["API_KEY_REVOKE"] = "API_KEY_REVOKE";
    AuditAction["CUSTOM"] = "CUSTOM";
})(AuditAction || (AuditAction = {}));
/**
 * Resource Types
 */
export var ResourceType;
(function (ResourceType) {
    ResourceType["PROJECT"] = "PROJECT";
    ResourceType["TEMPLATE"] = "TEMPLATE";
    ResourceType["SHARD"] = "SHARD";
    ResourceType["SHARED_PROJECT"] = "SHARED_PROJECT";
    ResourceType["VERSION"] = "VERSION";
    ResourceType["ACTIVITY"] = "ACTIVITY";
    ResourceType["NOTIFICATION"] = "NOTIFICATION";
    ResourceType["USER"] = "USER";
    ResourceType["ROLE"] = "ROLE";
    ResourceType["PERMISSION"] = "PERMISSION";
    ResourceType["TENANT_CONFIG"] = "TENANT_CONFIG";
    ResourceType["INTEGRATION"] = "INTEGRATION";
    ResourceType["API_KEY"] = "API_KEY";
    ResourceType["EXPORT"] = "EXPORT";
    ResourceType["REPORT"] = "REPORT";
    ResourceType["CUSTOM_METRIC"] = "CUSTOM_METRIC";
    ResourceType["WEBHOOK"] = "WEBHOOK";
    ResourceType["SSO_CONFIG"] = "SSO_CONFIG";
})(ResourceType || (ResourceType = {}));
/**
 * Audit Severity Levels
 */
export var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "INFO";
    AuditSeverity["WARNING"] = "WARNING";
    AuditSeverity["CRITICAL"] = "CRITICAL";
    AuditSeverity["SECURITY_EVENT"] = "SECURITY_EVENT";
})(AuditSeverity || (AuditSeverity = {}));
/**
 * Audit Status
 */
export var AuditStatus;
(function (AuditStatus) {
    AuditStatus["SUCCESS"] = "SUCCESS";
    AuditStatus["FAILURE"] = "FAILURE";
    AuditStatus["PARTIAL"] = "PARTIAL";
})(AuditStatus || (AuditStatus = {}));
/**
 * Audit Report Types
 */
export var AuditReportType;
(function (AuditReportType) {
    AuditReportType["SUMMARY"] = "SUMMARY";
    AuditReportType["DETAILED"] = "DETAILED";
    AuditReportType["SECURITY"] = "SECURITY";
    AuditReportType["COMPLIANCE"] = "COMPLIANCE";
    AuditReportType["USER_ACTIVITY"] = "USER_ACTIVITY";
    AuditReportType["RESOURCE_ACCESS"] = "RESOURCE_ACCESS";
})(AuditReportType || (AuditReportType = {}));
/**
 * SSO Providers
 */
export var SSOProvider;
(function (SSOProvider) {
    SSOProvider["OAUTH2"] = "OAUTH2";
    SSOProvider["SAML2"] = "SAML2";
    SSOProvider["OPENID_CONNECT"] = "OPENID_CONNECT";
    SSOProvider["AZURE_AD"] = "AZURE_AD";
    SSOProvider["GOOGLE"] = "GOOGLE";
    SSOProvider["OKTA"] = "OKTA";
    SSOProvider["AUTH0"] = "AUTH0";
})(SSOProvider || (SSOProvider = {}));
/**
 * Data Warehouse Types
 */
export var DataWarehouseType;
(function (DataWarehouseType) {
    DataWarehouseType["SNOWFLAKE"] = "SNOWFLAKE";
    DataWarehouseType["BIGQUERY"] = "BIGQUERY";
    DataWarehouseType["REDSHIFT"] = "REDSHIFT";
    DataWarehouseType["DATABRICKS"] = "DATABRICKS";
    DataWarehouseType["SYNAPSE"] = "SYNAPSE";
    DataWarehouseType["POSTGRES"] = "POSTGRES";
    DataWarehouseType["MYSQL"] = "MYSQL";
})(DataWarehouseType || (DataWarehouseType = {}));
/**
 * Sync Frequency
 */
export var SyncFrequency;
(function (SyncFrequency) {
    SyncFrequency["HOURLY"] = "HOURLY";
    SyncFrequency["DAILY"] = "DAILY";
    SyncFrequency["WEEKLY"] = "WEEKLY";
    SyncFrequency["MONTHLY"] = "MONTHLY";
    SyncFrequency["CUSTOM"] = "CUSTOM";
})(SyncFrequency || (SyncFrequency = {}));
/**
 * Sync Status
 */
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["IDLE"] = "IDLE";
    SyncStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SyncStatus["SUCCESS"] = "SUCCESS";
    SyncStatus["FAILURE"] = "FAILURE";
    SyncStatus["PARTIAL"] = "PARTIAL";
})(SyncStatus || (SyncStatus = {}));
/**
 * Stream Types (Event Hub, Kafka, Kinesis, etc.)
 */
export var StreamType;
(function (StreamType) {
    StreamType["EVENT_HUB"] = "EVENT_HUB";
    StreamType["KAFKA"] = "KAFKA";
    StreamType["KINESIS"] = "KINESIS";
    StreamType["PUBSUB"] = "PUBSUB";
    StreamType["SQS"] = "SQS";
    StreamType["RABBITMQ"] = "RABBITMQ";
})(StreamType || (StreamType = {}));
/**
 * Export Formats
 */
export var ExportFormat;
(function (ExportFormat) {
    ExportFormat["JSON"] = "JSON";
    ExportFormat["CSV"] = "CSV";
    ExportFormat["EXCEL"] = "EXCEL";
    ExportFormat["PARQUET"] = "PARQUET";
    ExportFormat["AVRO"] = "AVRO";
    ExportFormat["PDF"] = "PDF";
})(ExportFormat || (ExportFormat = {}));
/**
 * Export Status
 */
export var ExportStatus;
(function (ExportStatus) {
    ExportStatus["PENDING"] = "PENDING";
    ExportStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ExportStatus["COMPLETED"] = "COMPLETED";
    ExportStatus["FAILED"] = "FAILED";
    ExportStatus["ARCHIVED"] = "ARCHIVED";
})(ExportStatus || (ExportStatus = {}));
/**
 * Webhook Events
 */
export var WebhookEvent;
(function (WebhookEvent) {
    WebhookEvent["PROJECT_CREATED"] = "PROJECT_CREATED";
    WebhookEvent["PROJECT_UPDATED"] = "PROJECT_UPDATED";
    WebhookEvent["PROJECT_DELETED"] = "PROJECT_DELETED";
    WebhookEvent["SHARING_CHANGED"] = "SHARING_CHANGED";
    WebhookEvent["VERSION_CREATED"] = "VERSION_CREATED";
    WebhookEvent["USER_CREATED"] = "USER_CREATED";
    WebhookEvent["USER_DELETED"] = "USER_DELETED";
    WebhookEvent["EXPORT_COMPLETED"] = "EXPORT_COMPLETED";
    WebhookEvent["SYNC_COMPLETED"] = "SYNC_COMPLETED";
    WebhookEvent["SECURITY_EVENT"] = "SECURITY_EVENT";
})(WebhookEvent || (WebhookEvent = {}));
//# sourceMappingURL=audit-integration.types.js.map