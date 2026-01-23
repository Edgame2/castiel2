/**
 * JSON Schemas for MFA Request Validation
 *
 * Used by Fastify for automatic request validation
 */
export declare const enrollTOTPSchema: {
    description: string;
    tags: string[];
    response: {
        200: {
            type: string;
            properties: {
                secret: {
                    type: string;
                };
                qrCodeDataUrl: {
                    type: string;
                };
                manualEntryCode: {
                    type: string;
                };
                otpauthUrl: {
                    type: string;
                };
                enrollmentToken: {
                    type: string;
                };
            };
        };
    };
};
export declare const verifyTOTPSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            enrollmentToken: {
                type: string;
                minLength: number;
            };
            code: {
                type: string;
                pattern: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                method: {
                    type: string;
                };
                recoveryCodes: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const enrollSMSSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            phoneNumber: {
                type: string;
                pattern: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                maskedPhoneNumber: {
                    type: string;
                };
                enrollmentToken: {
                    type: string;
                };
                expiresInSeconds: {
                    type: string;
                };
            };
        };
    };
};
export declare const verifySMSSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            enrollmentToken: {
                type: string;
                minLength: number;
            };
            code: {
                type: string;
                pattern: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                method: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const enrollEmailSchema: {
    description: string;
    tags: string[];
    response: {
        200: {
            type: string;
            properties: {
                maskedEmail: {
                    type: string;
                };
                enrollmentToken: {
                    type: string;
                };
                expiresInSeconds: {
                    type: string;
                };
            };
        };
    };
};
export declare const verifyEmailSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            enrollmentToken: {
                type: string;
                minLength: number;
            };
            code: {
                type: string;
                pattern: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                method: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const mfaChallengeSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            challengeToken: {
                type: string;
                minLength: number;
            };
            method: {
                type: string;
                enum: string[];
            };
            code: {
                type: string;
                minLength: number;
                maxLength: number;
                description: string;
            };
            trustDevice: {
                type: string;
                description: string;
            };
            deviceFingerprint: {
                type: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                accessToken: {
                    type: string;
                };
                refreshToken: {
                    type: string;
                };
                expiresIn: {
                    type: string;
                };
                user: {
                    type: string;
                };
            };
        };
    };
};
export declare const sendMFACodeSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        required: string[];
        properties: {
            challengeToken: {
                type: string;
                minLength: number;
            };
            method: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                method: {
                    type: string;
                };
                message: {
                    type: string;
                };
                expiresInSeconds: {
                    type: string;
                };
            };
        };
        400: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
        401: {
            type: string;
            properties: {
                error: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const disableMFAMethodSchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            method: {
                type: string;
                enum: string[];
            };
        };
    };
    body: {
        type: string;
        properties: {
            password: {
                type: string;
                description: string;
            };
            mfaCode: {
                type: string;
                pattern: string;
                description: string;
            };
        };
        anyOf: {
            required: string[];
        }[];
    };
    response: {
        200: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const listMFAMethodsSchema: {
    description: string;
    tags: string[];
    response: {
        200: {
            type: string;
            properties: {
                methods: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            type: {
                                type: string;
                            };
                            status: {
                                type: string;
                            };
                            enrolledAt: {
                                type: string;
                            };
                            lastUsedAt: {
                                type: string;
                            };
                            maskedInfo: {
                                type: string;
                            };
                        };
                    };
                };
                hasActiveMFA: {
                    type: string;
                };
                recoveryCodesRemaining: {
                    type: string;
                };
            };
        };
    };
};
export declare const generateRecoveryCodesSchema: {
    description: string;
    tags: string[];
    body: {
        type: string;
        properties: {
            password: {
                type: string;
            };
            mfaCode: {
                type: string;
                pattern: string;
            };
        };
        anyOf: {
            required: string[];
        }[];
    };
    response: {
        200: {
            type: string;
            properties: {
                recoveryCodes: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                generatedAt: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const getMFAPolicySchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                policy: {
                    type: string;
                };
            };
        };
    };
};
export declare const updateMFAPolicySchema: {
    description: string;
    tags: string[];
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        properties: {
            enforcement: {
                type: string;
                enum: string[];
            };
            gracePeriodDays: {
                type: string;
                minimum: number;
                maximum: number;
            };
            allowedMethods: {
                type: string;
                items: {
                    type: string;
                    enum: string[];
                };
                minItems: number;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                policy: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=mfa.schemas.d.ts.map