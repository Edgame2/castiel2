// Temporary type definitions until proper package resolution is configured
// These should be imported from @castiel/shared-types

export interface JSONSchema {
    $schema?: string;
    type?: string | string[];
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
}

export interface ShardMetadata {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    version?: number;
    [key: string]: any;
}

export enum ShardTypeCategory {
    DOCUMENT = 'document',
    DATA = 'data',
    MEDIA = 'media',
    CONFIGURATION = 'configuration',
    CUSTOM = 'custom',
}

export enum ShardTypeStatus {
    ACTIVE = 'active',
    DEPRECATED = 'deprecated',
    DELETED = 'deleted',
}

/**
 * Enhanced ShardType Field Types
 */
export enum FieldType {
    STRING = 'STRING',
    NUMBER = 'NUMBER',
    BOOLEAN = 'BOOLEAN',
    DATE = 'DATE',
    DATETIME = 'DATETIME',
    OBJECT = 'OBJECT',
    ARRAY = 'ARRAY',
    EMAIL = 'EMAIL',
    PHONE = 'PHONE',
    URL = 'URL',
    CURRENCY = 'CURRENCY',
    PERCENTAGE = 'PERCENTAGE',
    REFERENCE = 'REFERENCE',
    REFERENCES = 'REFERENCES',
    USER = 'USER',
    ENUM = 'ENUM',
    PICKLIST = 'PICKLIST',
    ADDRESS = 'ADDRESS',
    RICH_TEXT = 'RICH_TEXT',
    FILE = 'FILE',
}

export enum AutoPopulateType {
    CURRENT_USER = 'currentUser',
    CURRENT_DATE = 'currentDate',
    SEQUENCE = 'sequence',
}

export enum RelationshipType {
    ONE_TO_ONE = 'ONE_TO_ONE',
    ONE_TO_MANY = 'ONE_TO_MANY',
    MANY_TO_MANY = 'MANY_TO_MANY',
}

export enum ValidationRuleType {
    REQUIRED_IF = 'REQUIRED_IF',
    CONDITIONAL = 'CONDITIONAL',
    UNIQUE = 'UNIQUE',
    CUSTOM = 'CUSTOM',
}

export enum EnrichmentType {
    EXTRACT = 'EXTRACT',
    CLASSIFY = 'CLASSIFY',
    SUMMARIZE = 'SUMMARIZE',
    TRANSLATE = 'TRANSLATE',
    SENTIMENT = 'SENTIMENT',
    SUGGEST = 'SUGGEST',
    VALIDATE = 'VALIDATE',
    EXPAND = 'EXPAND',
    NORMALIZE = 'NORMALIZE',
    LOOKUP = 'LOOKUP',
}

export enum EnrichmentFrequency {
    ON_CREATE = 'ON_CREATE',
    ON_UPDATE = 'ON_UPDATE',
    MANUAL = 'MANUAL',
    SCHEDULED = 'SCHEDULED',
    CONTINUOUS = 'CONTINUOUS',
}

export enum EnrichmentTriggerType {
    FIELD_CHANGE = 'FIELD_CHANGE',
    STATUS_CHANGE = 'STATUS_CHANGE',
    MANUAL = 'MANUAL',
    SCHEDULED = 'SCHEDULED',
}

export interface ShardType {
    id: string;
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    schema: JSONSchema;
    uiSchema?: Record<string, any>;
    isActive: boolean;
    isSystem: boolean;
    isGlobal: boolean;
    icon?: string;
    color?: string;
    tags: string[];
    category: string;
    status: string;
    parentShardTypeId?: string;
    isCustom: boolean;
    isBuiltIn: boolean;
    metadata: ShardMetadata;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

export interface ShardTypeListParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    isGlobal?: boolean;
    tags?: string[];
    parentShardTypeId?: string;
    includeDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateShardTypeInput {
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    category: string;
    schema: JSONSchema;
    uiSchema?: Record<string, any>;
    isGlobal?: boolean;
    parentShardTypeId?: string;
    icon?: string;
    color?: string;
    tags?: string[];
    createdBy?: string;
    isCustom?: boolean;
    isBuiltIn?: boolean;
}

export interface UpdateShardTypeInput {
    name?: string;
    displayName?: string;
    description?: string;
    category?: string;
    schema?: JSONSchema;
    uiSchema?: Record<string, any>;
    isActive?: boolean;
    isGlobal?: boolean;
    status?: string;
    icon?: string;
    color?: string;
    tags?: string[];
    parentShardTypeId?: string;
}
