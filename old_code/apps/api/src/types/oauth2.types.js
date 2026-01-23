/**
 * OAuth2 types for authorization server implementation
 */
/**
 * OAuth2 grant types
 */
export var OAuth2GrantType;
(function (OAuth2GrantType) {
    OAuth2GrantType["AUTHORIZATION_CODE"] = "authorization_code";
    OAuth2GrantType["CLIENT_CREDENTIALS"] = "client_credentials";
    OAuth2GrantType["REFRESH_TOKEN"] = "refresh_token";
})(OAuth2GrantType || (OAuth2GrantType = {}));
/**
 * OAuth2 response types
 */
export var OAuth2ResponseType;
(function (OAuth2ResponseType) {
    OAuth2ResponseType["CODE"] = "code";
    OAuth2ResponseType["TOKEN"] = "token";
})(OAuth2ResponseType || (OAuth2ResponseType = {}));
/**
 * OAuth2 client types
 */
export var OAuth2ClientType;
(function (OAuth2ClientType) {
    OAuth2ClientType["CONFIDENTIAL"] = "confidential";
    OAuth2ClientType["PUBLIC"] = "public";
})(OAuth2ClientType || (OAuth2ClientType = {}));
/**
 * OAuth2 token types
 */
export var OAuth2TokenType;
(function (OAuth2TokenType) {
    OAuth2TokenType["BEARER"] = "Bearer";
})(OAuth2TokenType || (OAuth2TokenType = {}));
/**
 * OAuth2 client status
 */
export var OAuth2ClientStatus;
(function (OAuth2ClientStatus) {
    OAuth2ClientStatus["ACTIVE"] = "active";
    OAuth2ClientStatus["INACTIVE"] = "inactive";
    OAuth2ClientStatus["SUSPENDED"] = "suspended";
})(OAuth2ClientStatus || (OAuth2ClientStatus = {}));
//# sourceMappingURL=oauth2.types.js.map