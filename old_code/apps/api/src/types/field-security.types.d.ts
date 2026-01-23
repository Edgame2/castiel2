/**
 * Field-Level Security Types
 * Per-field access control, encryption, and masking
 */
/**
 * PII (Personally Identifiable Information) categories
 */
export declare enum PIICategory {
    EMAIL = "email",
    PHONE = "phone",
    ADDRESS = "address",
    SSN = "ssn",
    FINANCIAL = "financial",
    HEALTH = "health",
    BIOMETRIC = "biometric",
    GOVERNMENT_ID = "government_id",
    DATE_OF_BIRTH = "date_of_birth",
    CUSTOM = "custom"
}
/**
 * Security classification levels
 */
export declare enum SecurityLevel {
    /** Visible to all authenticated users */
    PUBLIC = "public",
    /** Visible to tenant members */
    INTERNAL = "internal",
    /** Restricted to specific roles */
    CONFIDENTIAL = "confidential",
    /** Highly restricted, requires explicit access */
    RESTRICTED = "restricted"
}
/**
 * Built-in mask patterns for common field types
 */
export declare const MASK_PATTERNS: {
    /** Email: john@example.com → j***@e***.com */
    EMAIL: (value: string) => string;
    /** Phone: 555-123-4567 → ***-***-4567 */
    PHONE: (value: string) => string;
    /** SSN: 123-45-6789 → ***-**-6789 */
    SSN: (value: string) => string;
    /** Credit Card: 4111111111111111 → ****-****-****-1111 */
    CREDIT_CARD: (value: string) => string;
    /** Full mask: Any value → ******** */
    FULL: (_value: string) => string;
    /** Partial mask: Hello World → Hel***** */
    PARTIAL: (value: string) => string;
    /** Address: 123 Main St → *** Main St */
    ADDRESS: (value: string) => string;
};
/**
 * Field security configuration
 */
export interface FieldSecurityConfig {
    /** Field path (e.g., "email", "address.street") */
    field: string;
    /** Roles that can read this field */
    readRoles: string[];
    /** Roles that can write this field */
    writeRoles: string[];
    /** Encrypt field at rest */
    encrypted: boolean;
    /** Specific encryption key ID to use */
    encryptionKeyId?: string;
    /** PII category for compliance */
    piiCategory?: PIICategory;
    /** Security classification level */
    securityLevel: SecurityLevel;
    /** Mask in audit logs */
    maskInLogs: boolean;
    /** Mask in data exports */
    maskInExport: boolean;
    /** Exclude from AI context */
    maskInAI: boolean;
    /** Mask pattern name or custom pattern */
    maskPattern?: keyof typeof MASK_PATTERNS | string;
    /** Auto-delete after N days (for compliance) */
    retentionDays?: number;
    /** Additional validation rules for this field */
    validationRules?: FieldValidationRule[];
}
/**
 * Field validation rule for secure fields
 */
export interface FieldValidationRule {
    type: 'regex' | 'format' | 'custom';
    pattern?: string;
    format?: 'email' | 'phone' | 'ssn' | 'credit_card' | 'date';
    message: string;
}
/**
 * Security context for field operations
 */
export interface FieldSecurityContext {
    /** User ID performing the operation */
    userId: string;
    /** User's roles */
    userRoles: string[];
    /** Tenant ID */
    tenantId: string;
    /** Operation type */
    operation: 'read' | 'write' | 'export' | 'ai' | 'log';
    /** Whether to apply masking */
    applyMasking: boolean;
    /** Whether to decrypt encrypted fields */
    decryptFields: boolean;
}
/**
 * Result of field security check
 */
export interface FieldSecurityCheckResult {
    /** Whether access is allowed */
    allowed: boolean;
    /** If not allowed, reason */
    reason?: string;
    /** If allowed but masked, the masked value */
    maskedValue?: any;
    /** Whether the value was masked */
    wasMasked: boolean;
    /** Security level of the field */
    securityLevel: SecurityLevel;
}
/**
 * Field security audit entry
 */
export interface FieldSecurityAuditEntry {
    timestamp: Date;
    userId: string;
    tenantId: string;
    shardId: string;
    field: string;
    operation: 'read' | 'write' | 'export' | 'ai';
    allowed: boolean;
    reason?: string;
    piiCategory?: PIICategory;
    securityLevel: SecurityLevel;
    ipAddress?: string;
    userAgent?: string;
}
/**
 * ShardType security configuration
 */
export interface ShardTypeSecurityConfig {
    /** Default security level for fields without explicit config */
    defaultSecurityLevel: SecurityLevel;
    /** Field-level security configurations */
    fieldSecurity: FieldSecurityConfig[];
    /** Whether to audit all field access */
    auditAllAccess: boolean;
    /** Whether to encrypt all PII fields by default */
    encryptPIIByDefault: boolean;
}
/**
 * Secure shard data result
 */
export interface SecuredShardData {
    /** Secured structured data */
    structuredData: Record<string, any>;
    /** Fields that were masked */
    maskedFields: string[];
    /** Fields that were removed (no access) */
    removedFields: string[];
    /** Fields that were decrypted */
    decryptedFields: string[];
    /** Security audit entries generated */
    auditEntries: FieldSecurityAuditEntry[];
}
/**
 * Security policy for data export
 */
export interface ExportSecurityPolicy {
    /** Include PII fields (subject to masking) */
    includePII: boolean;
    /** Mask all PII regardless of roles */
    maskAllPII: boolean;
    /** Exclude fields with these security levels */
    excludeSecurityLevels: SecurityLevel[];
    /** Custom field exclusions */
    excludeFields: string[];
    /** Include audit trail in export */
    includeAuditTrail: boolean;
}
/**
 * Common field security presets
 */
export declare const FIELD_SECURITY_PRESETS: Record<string, Partial<FieldSecurityConfig>>;
/**
 * Apply a preset to create a full field security config
 */
export declare function applySecurityPreset(field: string, presetName: keyof typeof FIELD_SECURITY_PRESETS, overrides?: Partial<FieldSecurityConfig>): FieldSecurityConfig;
//# sourceMappingURL=field-security.types.d.ts.map