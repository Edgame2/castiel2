/**
 * Centralized Audit Log Types
 * Used for logging all application events across the system
 */
/**
 * Categories of audit events
 */
export var AuditCategory;
(function (AuditCategory) {
    AuditCategory["AUTHENTICATION"] = "authentication";
    AuditCategory["AUTHORIZATION"] = "authorization";
    AuditCategory["USER_MANAGEMENT"] = "user_management";
    AuditCategory["TENANT_MANAGEMENT"] = "tenant_management";
    AuditCategory["DATA_ACCESS"] = "data_access";
    AuditCategory["DATA_MODIFICATION"] = "data_modification";
    AuditCategory["SYSTEM"] = "system";
    AuditCategory["SECURITY"] = "security";
    AuditCategory["API"] = "api";
})(AuditCategory || (AuditCategory = {}));
/**
 * Specific audit event types
 */
export var AuditEventType;
(function (AuditEventType) {
    // Authentication events
    AuditEventType["LOGIN_SUCCESS"] = "login_success";
    AuditEventType["LOGIN_FAILURE"] = "login_failure";
    AuditEventType["LOGOUT"] = "logout";
    AuditEventType["PASSWORD_RESET_REQUEST"] = "password_reset_request";
    AuditEventType["PASSWORD_RESET_SUCCESS"] = "password_reset_success";
    AuditEventType["PASSWORD_CHANGE"] = "password_change";
    AuditEventType["MFA_ENROLL"] = "mfa_enroll";
    AuditEventType["MFA_VERIFY"] = "mfa_verify";
    AuditEventType["MFA_DISABLE"] = "mfa_disable";
    AuditEventType["TOKEN_REFRESH"] = "token_refresh";
    AuditEventType["TOKEN_REVOKE"] = "token_revoke";
    AuditEventType["SESSION_CREATE"] = "session_create";
    AuditEventType["SESSION_TERMINATE"] = "session_terminate";
    // User management events
    AuditEventType["USER_CREATE"] = "user_create";
    AuditEventType["USER_UPDATE"] = "user_update";
    AuditEventType["USER_DELETE"] = "user_delete";
    AuditEventType["USER_ACTIVATE"] = "user_activate";
    AuditEventType["USER_DEACTIVATE"] = "user_deactivate";
    AuditEventType["USER_ROLE_CHANGE"] = "user_role_change";
    AuditEventType["USER_INVITE"] = "user_invite";
    AuditEventType["USER_JOIN_REQUEST"] = "user_join_request";
    AuditEventType["USER_JOIN_APPROVE"] = "user_join_approve";
    AuditEventType["USER_JOIN_REJECT"] = "user_join_reject";
    // Tenant management events
    AuditEventType["TENANT_CREATE"] = "tenant_create";
    AuditEventType["TENANT_UPDATE"] = "tenant_update";
    AuditEventType["TENANT_DELETE"] = "tenant_delete";
    AuditEventType["TENANT_ACTIVATE"] = "tenant_activate";
    AuditEventType["TENANT_SUSPEND"] = "tenant_suspend";
    AuditEventType["TENANT_SWITCH"] = "tenant_switch";
    AuditEventType["TENANT_SSO_CONFIG"] = "tenant_sso_config";
    // Data events
    AuditEventType["DATA_EXPORT"] = "data_export";
    AuditEventType["DATA_IMPORT"] = "data_import";
    AuditEventType["DATA_DELETE"] = "data_delete";
    AuditEventType["DOCUMENT_UPLOAD"] = "document_upload";
    // System events
    AuditEventType["CONFIG_CHANGE"] = "config_change";
    AuditEventType["PERMISSION_CHANGE"] = "permission_change";
    AuditEventType["API_KEY_CREATE"] = "api_key_create";
    AuditEventType["API_KEY_REVOKE"] = "api_key_revoke";
    // Security events
    AuditEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    AuditEventType["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
    AuditEventType["ACCOUNT_LOCKOUT"] = "account_lockout";
    AuditEventType["IP_BLOCKED"] = "ip_blocked";
})(AuditEventType || (AuditEventType = {}));
/**
 * Severity levels for audit events
 */
export var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "info";
    AuditSeverity["WARNING"] = "warning";
    AuditSeverity["ERROR"] = "error";
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (AuditSeverity = {}));
/**
 * Outcome of an audit event
 */
export var AuditOutcome;
(function (AuditOutcome) {
    AuditOutcome["SUCCESS"] = "success";
    AuditOutcome["FAILURE"] = "failure";
    AuditOutcome["PARTIAL"] = "partial";
})(AuditOutcome || (AuditOutcome = {}));
//# sourceMappingURL=audit.types.js.map