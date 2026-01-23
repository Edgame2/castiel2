/**
 * Field-Level Security Types
 * Per-field access control, encryption, and masking
 */
/**
 * PII (Personally Identifiable Information) categories
 */
export var PIICategory;
(function (PIICategory) {
    PIICategory["EMAIL"] = "email";
    PIICategory["PHONE"] = "phone";
    PIICategory["ADDRESS"] = "address";
    PIICategory["SSN"] = "ssn";
    PIICategory["FINANCIAL"] = "financial";
    PIICategory["HEALTH"] = "health";
    PIICategory["BIOMETRIC"] = "biometric";
    PIICategory["GOVERNMENT_ID"] = "government_id";
    PIICategory["DATE_OF_BIRTH"] = "date_of_birth";
    PIICategory["CUSTOM"] = "custom";
})(PIICategory || (PIICategory = {}));
/**
 * Security classification levels
 */
export var SecurityLevel;
(function (SecurityLevel) {
    /** Visible to all authenticated users */
    SecurityLevel["PUBLIC"] = "public";
    /** Visible to tenant members */
    SecurityLevel["INTERNAL"] = "internal";
    /** Restricted to specific roles */
    SecurityLevel["CONFIDENTIAL"] = "confidential";
    /** Highly restricted, requires explicit access */
    SecurityLevel["RESTRICTED"] = "restricted";
})(SecurityLevel || (SecurityLevel = {}));
/**
 * Built-in mask patterns for common field types
 */
export const MASK_PATTERNS = {
    /** Email: john@example.com → j***@e***.com */
    EMAIL: (value) => {
        if (!value || !value.includes('@')) {
            return '***@***.***';
        }
        const [local, domain] = value.split('@');
        const [domainName, ext] = domain.split('.');
        return `${local[0]}***@${domainName[0]}***.${ext}`;
    },
    /** Phone: 555-123-4567 → ***-***-4567 */
    PHONE: (value) => {
        if (!value) {
            return '***-***-****';
        }
        const digits = value.replace(/\D/g, '');
        return `***-***-${digits.slice(-4)}`;
    },
    /** SSN: 123-45-6789 → ***-**-6789 */
    SSN: (value) => {
        if (!value) {
            return '***-**-****';
        }
        const digits = value.replace(/\D/g, '');
        return `***-**-${digits.slice(-4)}`;
    },
    /** Credit Card: 4111111111111111 → ****-****-****-1111 */
    CREDIT_CARD: (value) => {
        if (!value) {
            return '****-****-****-****';
        }
        const digits = value.replace(/\D/g, '');
        return `****-****-****-${digits.slice(-4)}`;
    },
    /** Full mask: Any value → ******** */
    FULL: (_value) => '********',
    /** Partial mask: Hello World → Hel***** */
    PARTIAL: (value) => {
        if (!value || value.length < 3) {
            return '***';
        }
        return `${value.slice(0, 3)}${'*'.repeat(Math.min(value.length - 3, 8))}`;
    },
    /** Address: 123 Main St → *** Main St */
    ADDRESS: (value) => {
        if (!value) {
            return '*** *** **';
        }
        const parts = value.split(' ');
        if (parts.length > 1) {
            return `*** ${parts.slice(1).join(' ')}`;
        }
        return '***';
    },
};
/**
 * Common field security presets
 */
export const FIELD_SECURITY_PRESETS = {
    /** Email address - moderate security */
    email: {
        readRoles: ['user', 'admin'],
        writeRoles: ['user', 'admin'],
        encrypted: false,
        piiCategory: PIICategory.EMAIL,
        securityLevel: SecurityLevel.INTERNAL,
        maskInLogs: true,
        maskInExport: false,
        maskInAI: false,
        maskPattern: 'EMAIL',
    },
    /** Phone number - moderate security */
    phone: {
        readRoles: ['user', 'admin'],
        writeRoles: ['user', 'admin'],
        encrypted: false,
        piiCategory: PIICategory.PHONE,
        securityLevel: SecurityLevel.INTERNAL,
        maskInLogs: true,
        maskInExport: false,
        maskInAI: false,
        maskPattern: 'PHONE',
    },
    /** Social Security Number - high security */
    ssn: {
        readRoles: ['hr', 'admin'],
        writeRoles: ['hr', 'admin'],
        encrypted: true,
        piiCategory: PIICategory.SSN,
        securityLevel: SecurityLevel.RESTRICTED,
        maskInLogs: true,
        maskInExport: true,
        maskInAI: true,
        maskPattern: 'SSN',
        retentionDays: 365 * 7, // 7 years for compliance
    },
    /** Financial data - high security */
    financial: {
        readRoles: ['finance', 'admin'],
        writeRoles: ['finance', 'admin'],
        encrypted: true,
        piiCategory: PIICategory.FINANCIAL,
        securityLevel: SecurityLevel.RESTRICTED,
        maskInLogs: true,
        maskInExport: true,
        maskInAI: true,
        maskPattern: 'FULL',
    },
    /** Credit card - high security */
    creditCard: {
        readRoles: ['finance', 'admin'],
        writeRoles: ['finance', 'admin'],
        encrypted: true,
        piiCategory: PIICategory.FINANCIAL,
        securityLevel: SecurityLevel.RESTRICTED,
        maskInLogs: true,
        maskInExport: true,
        maskInAI: true,
        maskPattern: 'CREDIT_CARD',
        retentionDays: 90, // PCI compliance
    },
    /** Address - moderate security */
    address: {
        readRoles: ['user', 'admin'],
        writeRoles: ['user', 'admin'],
        encrypted: false,
        piiCategory: PIICategory.ADDRESS,
        securityLevel: SecurityLevel.INTERNAL,
        maskInLogs: true,
        maskInExport: false,
        maskInAI: false,
        maskPattern: 'ADDRESS',
    },
    /** Health information - very high security */
    health: {
        readRoles: ['medical', 'admin'],
        writeRoles: ['medical', 'admin'],
        encrypted: true,
        piiCategory: PIICategory.HEALTH,
        securityLevel: SecurityLevel.RESTRICTED,
        maskInLogs: true,
        maskInExport: true,
        maskInAI: true,
        maskPattern: 'FULL',
        retentionDays: 365 * 7, // HIPAA compliance
    },
    /** Date of birth - moderate security */
    dateOfBirth: {
        readRoles: ['user', 'admin'],
        writeRoles: ['user', 'admin'],
        encrypted: false,
        piiCategory: PIICategory.DATE_OF_BIRTH,
        securityLevel: SecurityLevel.CONFIDENTIAL,
        maskInLogs: true,
        maskInExport: false,
        maskInAI: true,
        maskPattern: 'FULL',
    },
    /** Salary - confidential */
    salary: {
        readRoles: ['hr', 'finance', 'admin'],
        writeRoles: ['hr', 'admin'],
        encrypted: true,
        piiCategory: PIICategory.FINANCIAL,
        securityLevel: SecurityLevel.CONFIDENTIAL,
        maskInLogs: true,
        maskInExport: true,
        maskInAI: true,
        maskPattern: 'FULL',
    },
};
/**
 * Apply a preset to create a full field security config
 */
export function applySecurityPreset(field, presetName, overrides) {
    const preset = FIELD_SECURITY_PRESETS[presetName];
    return {
        field,
        readRoles: preset.readRoles || ['user', 'admin'],
        writeRoles: preset.writeRoles || ['user', 'admin'],
        encrypted: preset.encrypted || false,
        encryptionKeyId: preset.encryptionKeyId,
        piiCategory: preset.piiCategory,
        securityLevel: preset.securityLevel || SecurityLevel.INTERNAL,
        maskInLogs: preset.maskInLogs || false,
        maskInExport: preset.maskInExport || false,
        maskInAI: preset.maskInAI || false,
        maskPattern: preset.maskPattern,
        retentionDays: preset.retentionDays,
        ...overrides,
    };
}
//# sourceMappingURL=field-security.types.js.map