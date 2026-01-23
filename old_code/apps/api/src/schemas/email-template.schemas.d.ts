/**
 * Email Template Validation Schemas
 * Zod schemas for request/response validation
 */
import { z } from 'zod';
/**
 * Placeholder Definition Schema
 */
export declare const PlaceholderDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    example: z.ZodString;
    required: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    required: boolean;
    example: string;
}, {
    name: string;
    description: string;
    required: boolean;
    example: string;
}>;
/**
 * Create Template Schema
 */
export declare const CreateTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    language: z.ZodString;
    displayName: z.ZodString;
    category: z.ZodEnum<["notifications", "invitations", "alerts", "system"]>;
    description: z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    htmlBody: z.ZodString;
    textBody: z.ZodString;
    fromEmail: z.ZodOptional<z.ZodString>;
    fromName: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodString>;
    placeholders: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        example: z.ZodString;
        required: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }>, "many">;
    emailProviderId: z.ZodOptional<z.ZodString>;
    isBaseTemplate: z.ZodOptional<z.ZodBoolean>;
    tenantId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    category: "system" | "notifications" | "alerts" | "invitations";
    name: string;
    displayName: string;
    subject: string;
    language: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[];
    description?: string | undefined;
    tenantId?: string | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    replyTo?: string | undefined;
    emailProviderId?: string | undefined;
    isBaseTemplate?: boolean | undefined;
}, {
    category: "system" | "notifications" | "alerts" | "invitations";
    name: string;
    displayName: string;
    subject: string;
    language: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[];
    description?: string | undefined;
    tenantId?: string | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    replyTo?: string | undefined;
    emailProviderId?: string | undefined;
    isBaseTemplate?: boolean | undefined;
}>;
/**
 * Update Template Schema
 */
export declare const UpdateTemplateSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["notifications", "invitations", "alerts", "system"]>>;
    description: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    htmlBody: z.ZodOptional<z.ZodString>;
    textBody: z.ZodOptional<z.ZodString>;
    fromEmail: z.ZodOptional<z.ZodString>;
    fromName: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodString>;
    placeholders: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        example: z.ZodString;
        required: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }>, "many">>;
    emailProviderId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    category?: "system" | "notifications" | "alerts" | "invitations" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    subject?: string | undefined;
    isActive?: boolean | undefined;
    replyTo?: string | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    placeholders?: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[] | undefined;
    emailProviderId?: string | undefined;
}, {
    category?: "system" | "notifications" | "alerts" | "invitations" | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    subject?: string | undefined;
    isActive?: boolean | undefined;
    replyTo?: string | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    placeholders?: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[] | undefined;
    emailProviderId?: string | undefined;
}>;
/**
 * Test Template Schema
 */
export declare const TestTemplateSchema: z.ZodObject<{
    placeholders: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    placeholders: Record<string, any>;
}, {
    placeholders: Record<string, any>;
}>;
/**
 * Duplicate Template Schema
 */
export declare const DuplicateTemplateSchema: z.ZodObject<{
    language: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    translate: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    language: string;
    displayName?: string | undefined;
    translate?: boolean | undefined;
}, {
    language: string;
    displayName?: string | undefined;
    translate?: boolean | undefined;
}>;
/**
 * Template Status Schema
 */
export declare const TemplateStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
}, {
    isActive: boolean;
}>;
/**
 * Template Filters Schema
 */
export declare const TemplateFiltersSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["notifications", "invitations", "alerts", "system"]>>;
    language: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    category?: "system" | "notifications" | "alerts" | "invitations" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    tenantId?: string | undefined;
    isActive?: boolean | undefined;
    language?: string | undefined;
}, {
    search?: string | undefined;
    category?: "system" | "notifications" | "alerts" | "invitations" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    tenantId?: string | undefined;
    isActive?: boolean | undefined;
    language?: string | undefined;
}>;
/**
 * Template Response Schema
 */
export declare const EmailTemplateResponseSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    language: z.ZodString;
    displayName: z.ZodString;
    category: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    htmlBody: z.ZodString;
    textBody: z.ZodString;
    fromEmail: z.ZodOptional<z.ZodString>;
    fromName: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodString>;
    placeholders: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        example: z.ZodString;
        required: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }, {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }>, "many">;
    emailProviderId: z.ZodOptional<z.ZodString>;
    isBaseTemplate: z.ZodBoolean;
    fallbackLanguage: z.ZodString;
    createdBy: z.ZodObject<{
        type: z.ZodLiteral<"super_admin">;
        userId: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        userId: string;
        type: "super_admin";
    }, {
        name: string;
        userId: string;
        type: "super_admin";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    updatedBy: z.ZodOptional<z.ZodObject<{
        userId: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        userId: string;
    }, {
        name: string;
        userId: string;
    }>>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    category: string;
    name: string;
    displayName: string;
    createdBy: {
        name: string;
        userId: string;
        type: "super_admin";
    };
    tenantId: string;
    subject: string;
    isActive: boolean;
    language: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[];
    isBaseTemplate: boolean;
    fallbackLanguage: string;
    description?: string | undefined;
    updatedBy?: {
        name: string;
        userId: string;
    } | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    replyTo?: string | undefined;
    emailProviderId?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    category: string;
    name: string;
    displayName: string;
    createdBy: {
        name: string;
        userId: string;
        type: "super_admin";
    };
    tenantId: string;
    subject: string;
    isActive: boolean;
    language: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        name: string;
        description: string;
        required: boolean;
        example: string;
    }[];
    isBaseTemplate: boolean;
    fallbackLanguage: string;
    description?: string | undefined;
    updatedBy?: {
        name: string;
        userId: string;
    } | undefined;
    fromName?: string | undefined;
    fromEmail?: string | undefined;
    replyTo?: string | undefined;
    emailProviderId?: string | undefined;
}>;
/**
 * Template List Response Schema
 */
export declare const TemplateListResponseSchema: z.ZodObject<{
    templates: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        name: z.ZodString;
        language: z.ZodString;
        displayName: z.ZodString;
        category: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        subject: z.ZodString;
        htmlBody: z.ZodString;
        textBody: z.ZodString;
        fromEmail: z.ZodOptional<z.ZodString>;
        fromName: z.ZodOptional<z.ZodString>;
        replyTo: z.ZodOptional<z.ZodString>;
        placeholders: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            example: z.ZodString;
            required: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }, {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }>, "many">;
        emailProviderId: z.ZodOptional<z.ZodString>;
        isBaseTemplate: z.ZodBoolean;
        fallbackLanguage: z.ZodString;
        createdBy: z.ZodObject<{
            type: z.ZodLiteral<"super_admin">;
            userId: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            userId: string;
            type: "super_admin";
        }, {
            name: string;
            userId: string;
            type: "super_admin";
        }>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        updatedBy: z.ZodOptional<z.ZodObject<{
            userId: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            userId: string;
        }, {
            name: string;
            userId: string;
        }>>;
        isActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        category: string;
        name: string;
        displayName: string;
        createdBy: {
            name: string;
            userId: string;
            type: "super_admin";
        };
        tenantId: string;
        subject: string;
        isActive: boolean;
        language: string;
        htmlBody: string;
        textBody: string;
        placeholders: {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }[];
        isBaseTemplate: boolean;
        fallbackLanguage: string;
        description?: string | undefined;
        updatedBy?: {
            name: string;
            userId: string;
        } | undefined;
        fromName?: string | undefined;
        fromEmail?: string | undefined;
        replyTo?: string | undefined;
        emailProviderId?: string | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        category: string;
        name: string;
        displayName: string;
        createdBy: {
            name: string;
            userId: string;
            type: "super_admin";
        };
        tenantId: string;
        subject: string;
        isActive: boolean;
        language: string;
        htmlBody: string;
        textBody: string;
        placeholders: {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }[];
        isBaseTemplate: boolean;
        fallbackLanguage: string;
        description?: string | undefined;
        updatedBy?: {
            name: string;
            userId: string;
        } | undefined;
        fromName?: string | undefined;
        fromEmail?: string | undefined;
        replyTo?: string | undefined;
        emailProviderId?: string | undefined;
    }>, "many">;
    pagination: z.ZodObject<{
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        hasMore: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    templates: {
        id: string;
        createdAt: string;
        updatedAt: string;
        category: string;
        name: string;
        displayName: string;
        createdBy: {
            name: string;
            userId: string;
            type: "super_admin";
        };
        tenantId: string;
        subject: string;
        isActive: boolean;
        language: string;
        htmlBody: string;
        textBody: string;
        placeholders: {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }[];
        isBaseTemplate: boolean;
        fallbackLanguage: string;
        description?: string | undefined;
        updatedBy?: {
            name: string;
            userId: string;
        } | undefined;
        fromName?: string | undefined;
        fromEmail?: string | undefined;
        replyTo?: string | undefined;
        emailProviderId?: string | undefined;
    }[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}, {
    templates: {
        id: string;
        createdAt: string;
        updatedAt: string;
        category: string;
        name: string;
        displayName: string;
        createdBy: {
            name: string;
            userId: string;
            type: "super_admin";
        };
        tenantId: string;
        subject: string;
        isActive: boolean;
        language: string;
        htmlBody: string;
        textBody: string;
        placeholders: {
            name: string;
            description: string;
            required: boolean;
            example: string;
        }[];
        isBaseTemplate: boolean;
        fallbackLanguage: string;
        description?: string | undefined;
        updatedBy?: {
            name: string;
            userId: string;
        } | undefined;
        fromName?: string | undefined;
        fromEmail?: string | undefined;
        replyTo?: string | undefined;
        emailProviderId?: string | undefined;
    }[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}>;
/**
 * Template Test Response Schema
 */
export declare const TemplateTestResponseSchema: z.ZodObject<{
    subject: z.ZodString;
    htmlBody: z.ZodString;
    textBody: z.ZodString;
    placeholders: z.ZodObject<{
        provided: z.ZodArray<z.ZodString, "many">;
        missing: z.ZodArray<z.ZodString, "many">;
        unused: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        missing: string[];
        provided: string[];
        unused: string[];
    }, {
        missing: string[];
        provided: string[];
        unused: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    subject: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        missing: string[];
        provided: string[];
        unused: string[];
    };
}, {
    subject: string;
    htmlBody: string;
    textBody: string;
    placeholders: {
        missing: string[];
        provided: string[];
        unused: string[];
    };
}>;
/**
 * Language Variants Response Schema
 */
export declare const LanguageVariantsResponseSchema: z.ZodObject<{
    templateName: z.ZodString;
    languages: z.ZodArray<z.ZodObject<{
        language: z.ZodString;
        templateId: z.ZodString;
        displayName: z.ZodString;
        isActive: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        updatedAt: string;
        displayName: string;
        isActive: boolean;
        templateId: string;
        language: string;
    }, {
        createdAt: string;
        updatedAt: string;
        displayName: string;
        isActive: boolean;
        templateId: string;
        language: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    templateName: string;
    languages: {
        createdAt: string;
        updatedAt: string;
        displayName: string;
        isActive: boolean;
        templateId: string;
        language: string;
    }[];
}, {
    templateName: string;
    languages: {
        createdAt: string;
        updatedAt: string;
        displayName: string;
        isActive: boolean;
        templateId: string;
        language: string;
    }[];
}>;
//# sourceMappingURL=email-template.schemas.d.ts.map