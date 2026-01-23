/**
 * User Group Types
 * Types for user groups and SSO group integration
 */
// ============================================================================
// Enums
// ============================================================================
/**
 * Group source - how the group was created
 */
export var GroupSource;
(function (GroupSource) {
    GroupSource["MANUAL"] = "manual";
    GroupSource["SSO"] = "sso";
})(GroupSource || (GroupSource = {}));
/**
 * SSO provider types
 */
export var SSOProviderType;
(function (SSOProviderType) {
    SSOProviderType["AZURE_AD"] = "azure_ad";
    SSOProviderType["OKTA"] = "okta";
    SSOProviderType["GOOGLE"] = "google";
    SSOProviderType["SAML"] = "saml";
    SSOProviderType["OIDC"] = "oidc";
})(SSOProviderType || (SSOProviderType = {}));
// ============================================================================
// Default Values
// ============================================================================
/**
 * Default SSO group mapping config
 */
export const DEFAULT_SSO_GROUP_CONFIG = {
    groupClaim: {
        claimName: 'groups',
        claimType: 'array',
    },
    mappings: [],
    autoCreateGroups: false,
    syncOnLogin: true,
};
//# sourceMappingURL=group.types.js.map