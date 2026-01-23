/**
 * Widget Catalog Types
 * Types for widget catalog management at platform and tenant levels
 * SuperAdmins manage system widget types; TenantAdmins only customize visibility/role access
 */
// ============================================================================
// Enums & Constants
// ============================================================================
export var WidgetCatalogStatus;
(function (WidgetCatalogStatus) {
    WidgetCatalogStatus["ACTIVE"] = "active";
    WidgetCatalogStatus["INACTIVE"] = "inactive";
    WidgetCatalogStatus["DEPRECATED"] = "deprecated";
    WidgetCatalogStatus["HIDDEN"] = "hidden";
})(WidgetCatalogStatus || (WidgetCatalogStatus = {}));
export var WidgetVisibilityLevel;
(function (WidgetVisibilityLevel) {
    WidgetVisibilityLevel["ALL"] = "all";
    WidgetVisibilityLevel["AUTHENTICATED"] = "authenticated";
    WidgetVisibilityLevel["TENANT"] = "tenant";
    WidgetVisibilityLevel["SPECIFIC_ROLES"] = "specific_roles";
    WidgetVisibilityLevel["HIDDEN"] = "hidden";
})(WidgetVisibilityLevel || (WidgetVisibilityLevel = {}));
//# sourceMappingURL=widget-catalog.types.js.map