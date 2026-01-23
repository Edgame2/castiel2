/**
 * SSO Provider types
 */
export var SSOProvider;
(function (SSOProvider) {
    SSOProvider["OKTA"] = "okta";
    SSOProvider["AZURE_AD"] = "azure_ad";
    SSOProvider["GOOGLE_WORKSPACE"] = "google_workspace";
    SSOProvider["GENERIC_SAML"] = "generic_saml";
})(SSOProvider || (SSOProvider = {}));
/**
 * SSO Configuration Status
 */
export var SSOConfigStatus;
(function (SSOConfigStatus) {
    SSOConfigStatus["ACTIVE"] = "active";
    SSOConfigStatus["INACTIVE"] = "inactive";
    SSOConfigStatus["PENDING"] = "pending";
})(SSOConfigStatus || (SSOConfigStatus = {}));
//# sourceMappingURL=sso.types.js.map