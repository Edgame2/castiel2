/**
 * User status
 */
export var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
    UserStatus["PENDING_APPROVAL"] = "pending_approval";
    UserStatus["ACTIVE"] = "active";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["DELETED"] = "deleted";
})(UserStatus || (UserStatus = {}));
/**
 * External user ID status
 */
export var ExternalUserIdStatus;
(function (ExternalUserIdStatus) {
    ExternalUserIdStatus["ACTIVE"] = "active";
    ExternalUserIdStatus["INVALID"] = "invalid";
    ExternalUserIdStatus["PENDING"] = "pending";
})(ExternalUserIdStatus || (ExternalUserIdStatus = {}));
//# sourceMappingURL=user.types.js.map