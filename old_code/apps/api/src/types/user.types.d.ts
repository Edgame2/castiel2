/**
 * User status
 */
export declare enum UserStatus {
    PENDING_VERIFICATION = "pending_verification",
    PENDING_APPROVAL = "pending_approval",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    DELETED = "deleted"
}
/**
 * External user ID status
 */
export declare enum ExternalUserIdStatus {
    ACTIVE = "active",
    INVALID = "invalid",
    PENDING = "pending"
}
/**
 * External user ID from integrated applications
 */
export interface ExternalUserId {
    integrationId: string;
    externalUserId: string;
    integrationName?: string;
    connectionId?: string;
    connectedAt: Date;
    lastSyncedAt?: Date;
    status: ExternalUserIdStatus;
    metadata?: Record<string, any>;
}
/**
 * User document in Cosmos DB
 */
export interface User {
    id: string;
    tenantId: string;
    tenantIds?: string[];
    activeTenantId?: string;
    email: string;
    emailVerified: boolean;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    status: UserStatus;
    pendingTenantId?: string;
    organizationId?: string;
    roles: string[];
    isDefaultTenant?: boolean;
    verificationToken?: string;
    verificationTokenExpiry?: Date;
    passwordResetToken?: string;
    passwordResetTokenExpiry?: Date;
    passwordHistory?: {
        hash: string;
        createdAt: Date;
    }[];
    lastPasswordChangeAt?: Date;
    providers?: {
        provider: string;
        providerId: string;
        email?: string;
        connectedAt: Date;
    }[];
    oauthProviders?: {
        provider: string;
        providerId: string;
        connectedAt: Date;
    }[];
    ssoProvider?: string;
    ssoSubject?: string;
    ssoSessionIndex?: string;
    metadata?: Record<string, any>;
    linkedUserId?: string;
    linkedTenantIds?: string[];
    externalUserIds?: ExternalUserId[];
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    partitionKey: string;
}
/**
 * User registration data
 */
export interface UserRegistrationData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    tenantId: string;
    tenantIds?: string[];
    activeTenantId?: string;
    roles?: string[];
    status?: UserStatus;
    emailVerified?: boolean;
    pendingTenantId?: string;
    metadata?: Record<string, any>;
    linkedUserId?: string;
    isDefaultTenant?: boolean;
}
/**
 * User login credentials
 */
export interface UserLoginCredentials {
    email: string;
    password: string;
    tenantId: string;
}
//# sourceMappingURL=user.types.d.ts.map