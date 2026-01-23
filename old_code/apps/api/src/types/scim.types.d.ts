/**
 * SCIM 2.0 Types
 * System for Cross-domain Identity Management (SCIM) protocol types
 */
/**
 * SCIM User Resource (SCIM 2.0)
 */
export interface SCIMUser {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'];
    id: string;
    externalId?: string;
    userName: string;
    name: {
        formatted?: string;
        familyName?: string;
        givenName?: string;
        middleName?: string;
        honorificPrefix?: string;
        honorificSuffix?: string;
    };
    displayName?: string;
    nickName?: string;
    profileUrl?: string;
    title?: string;
    userType?: string;
    preferredLanguage?: string;
    locale?: string;
    timezone?: string;
    active: boolean;
    password?: string;
    emails: Array<{
        value: string;
        display?: string;
        type?: 'work' | 'home' | 'other';
        primary?: boolean;
    }>;
    phoneNumbers?: Array<{
        value: string;
        display?: string;
        type?: 'work' | 'home' | 'mobile' | 'fax' | 'pager' | 'other';
        primary?: boolean;
    }>;
    ims?: Array<{
        value: string;
        display?: string;
        type?: 'aim' | 'gtalk' | 'icq' | 'xmpp' | 'msn' | 'skype' | 'qq' | 'yahoo';
        primary?: boolean;
    }>;
    photos?: Array<{
        value: string;
        display?: string;
        type?: 'photo' | 'thumbnail';
        primary?: boolean;
    }>;
    addresses?: Array<{
        formatted?: string;
        streetAddress?: string;
        locality?: string;
        region?: string;
        postalCode?: string;
        country?: string;
        type?: 'work' | 'home' | 'other';
        primary?: boolean;
    }>;
    groups?: Array<{
        value: string;
        $ref?: string;
        display?: string;
        type?: 'direct' | 'indirect';
    }>;
    entitlements?: Array<{
        value: string;
        display?: string;
        type?: string;
        primary?: boolean;
    }>;
    roles?: Array<{
        value: string;
        display?: string;
        type?: string;
        primary?: boolean;
    }>;
    x509Certificates?: Array<{
        value: string;
        display?: string;
        type?: string;
        primary?: boolean;
    }>;
    meta: SCIMMeta;
}
/**
 * SCIM Group Resource (SCIM 2.0)
 */
export interface SCIMGroup {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
    id: string;
    externalId?: string;
    displayName: string;
    members?: Array<{
        value: string;
        $ref?: string;
        display?: string;
        type?: 'User' | 'Group';
    }>;
    meta: SCIMMeta;
}
/**
 * SCIM Meta Information
 */
export interface SCIMMeta {
    resourceType: 'User' | 'Group';
    created: string;
    lastModified: string;
    location?: string;
    version?: string;
}
/**
 * SCIM List Response
 */
export interface SCIMListResponse<T> {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
    totalResults: number;
    itemsPerPage: number;
    startIndex: number;
    Resources: T[];
}
/**
 * SCIM Error Response
 */
export interface SCIMError {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'];
    detail: string;
    status: string;
    scimType?: string;
}
/**
 * SCIM Patch Operation
 */
export interface SCIMPatchOperation {
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: any;
}
/**
 * SCIM Patch Request
 */
export interface SCIMPatchRequest {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'];
    Operations: SCIMPatchOperation[];
}
/**
 * SCIM Bulk Request
 */
export interface SCIMBulkRequest {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'];
    failOnErrors?: number;
    Operations: Array<{
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        bulkId?: string;
        path: string;
        data?: any;
    }>;
}
/**
 * SCIM Bulk Response
 */
export interface SCIMBulkResponse {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'];
    Operations: Array<{
        location?: string;
        method: string;
        bulkId?: string;
        status: string;
        response?: any;
    }>;
}
/**
 * SCIM Service Provider Configuration
 */
export interface SCIMServiceProviderConfig {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'];
    patch: {
        supported: boolean;
    };
    bulk: {
        supported: boolean;
        maxOperations: number;
        maxPayloadSize: number;
    };
    filter: {
        supported: boolean;
        maxResults: number;
    };
    changePassword: {
        supported: boolean;
    };
    sort: {
        supported: boolean;
    };
    etag: {
        supported: boolean;
    };
    authenticationSchemes: Array<{
        type: string;
        name: string;
        description: string;
        specUri?: string;
        documentationUri?: string;
    }>;
}
/**
 * SCIM Resource Type
 */
export interface SCIMResourceType {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'];
    id: string;
    name: string;
    endpoint: string;
    description?: string;
    schema: string;
    schemaExtensions?: Array<{
        schema: string;
        required: boolean;
    }>;
    meta?: SCIMMeta;
}
/**
 * SCIM Schema
 */
export interface SCIMSchema {
    id: string;
    name: string;
    description?: string;
    attributes: Array<{
        name: string;
        type: string;
        multiValued: boolean;
        description?: string;
        required: boolean;
        caseExact: boolean;
        mutability: 'readOnly' | 'readWrite' | 'immutable' | 'writeOnly';
        returned: 'always' | 'never' | 'default' | 'request';
        uniqueness: 'none' | 'server' | 'global';
        canonicalValues?: string[];
        referenceTypes?: string[];
    }>;
}
/**
 * Tenant SCIM Configuration
 */
export interface TenantSCIMConfig {
    id: string;
    tenantId: string;
    enabled: boolean;
    token: string;
    tokenHash: string;
    endpointUrl: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    lastRotatedAt?: Date;
    partitionKey: string;
}
/**
 * SCIM Activity Log Entry
 */
export interface SCIMActivityLog {
    id: string;
    tenantId: string;
    timestamp: Date;
    operation: 'create' | 'update' | 'delete' | 'get' | 'list' | 'patch';
    resourceType: 'User' | 'Group';
    resourceId?: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
    partitionKey: string;
}
/**
 * Create SCIM Config Request
 */
export interface CreateSCIMConfigRequest {
    tenantId: string;
}
/**
 * SCIM Config Response (for API, token is only shown once)
 */
export interface SCIMConfigResponse {
    enabled: boolean;
    endpointUrl: string;
    token?: string;
    createdAt: Date;
    lastRotatedAt?: Date;
}
//# sourceMappingURL=scim.types.d.ts.map