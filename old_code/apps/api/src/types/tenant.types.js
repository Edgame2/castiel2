/**
 * Tenant Management Types
 * Types for tenant/organization management
 */
/**
 * Tenant status
 */
export var TenantStatus;
(function (TenantStatus) {
    TenantStatus["PENDING"] = "pending";
    TenantStatus["ACTIVE"] = "active";
    TenantStatus["INACTIVE"] = "inactive";
    TenantStatus["SUSPENDED"] = "suspended";
})(TenantStatus || (TenantStatus = {}));
/**
 * Tenant plan/tier
 */
export var TenantPlan;
(function (TenantPlan) {
    TenantPlan["FREE"] = "free";
    TenantPlan["PRO"] = "pro";
    TenantPlan["ENTERPRISE"] = "enterprise";
})(TenantPlan || (TenantPlan = {}));
//# sourceMappingURL=tenant.types.js.map