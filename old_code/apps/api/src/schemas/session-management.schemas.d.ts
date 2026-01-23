export declare const listOwnSessionsSchema: {
    response: {
        200: {
            type: string;
            required: string[];
            additionalProperties: boolean;
            properties: {
                sessions: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            sessionId: {
                                type: string;
                            };
                            userId: {
                                type: string;
                            };
                            tenantId: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                            };
                            lastActivityAt: {
                                type: string;
                            };
                            expiresAt: {
                                type: string;
                            };
                            isCurrent: {
                                type: string;
                            };
                            deviceInfo: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    userAgent: {
                                        type: string;
                                    };
                                    browser: {
                                        type: string;
                                    };
                                    browserVersion: {
                                        type: string;
                                    };
                                    os: {
                                        type: string;
                                    };
                                    osVersion: {
                                        type: string;
                                    };
                                    device: {
                                        type: string;
                                    };
                                    isMobile: {
                                        type: string;
                                    };
                                };
                            };
                            locationInfo: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    ip: {
                                        type: string;
                                    };
                                    country: {
                                        type: string;
                                    };
                                    region: {
                                        type: string;
                                    };
                                    city: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                total: {
                    type: string;
                };
            };
        };
    };
};
export declare const sessionDetailsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            sessionId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                email: {
                    type: string;
                };
                name: {
                    type: string;
                };
                provider: {
                    type: string;
                };
                metadata: {
                    type: string;
                };
                sessionId: {
                    type: string;
                };
                userId: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                lastActivityAt: {
                    type: string;
                };
                expiresAt: {
                    type: string;
                };
                isCurrent: {
                    type: string;
                };
                deviceInfo: {
                    type: string;
                    additionalProperties: boolean;
                    properties: {
                        userAgent: {
                            type: string;
                        };
                        browser: {
                            type: string;
                        };
                        browserVersion: {
                            type: string;
                        };
                        os: {
                            type: string;
                        };
                        osVersion: {
                            type: string;
                        };
                        device: {
                            type: string;
                        };
                        isMobile: {
                            type: string;
                        };
                    };
                };
                locationInfo: {
                    type: string;
                    additionalProperties: boolean;
                    properties: {
                        ip: {
                            type: string;
                        };
                        country: {
                            type: string;
                        };
                        region: {
                            type: string;
                        };
                        city: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const terminateSessionSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            sessionId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
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
export declare const terminateAllSessionsSchema: {
    body: {
        type: string;
        additionalProperties: boolean;
        properties: {
            excludeCurrentSessionId: {
                type: string;
                description: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
            properties: {
                success: {
                    type: string;
                };
                revokedCount: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
export declare const adminListUserSessionsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            userId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
            additionalProperties: boolean;
            properties: {
                sessions: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            sessionId: {
                                type: string;
                            };
                            userId: {
                                type: string;
                            };
                            tenantId: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                            };
                            lastActivityAt: {
                                type: string;
                            };
                            expiresAt: {
                                type: string;
                            };
                            isCurrent: {
                                type: string;
                            };
                            deviceInfo: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    userAgent: {
                                        type: string;
                                    };
                                    browser: {
                                        type: string;
                                    };
                                    browserVersion: {
                                        type: string;
                                    };
                                    os: {
                                        type: string;
                                    };
                                    osVersion: {
                                        type: string;
                                    };
                                    device: {
                                        type: string;
                                    };
                                    isMobile: {
                                        type: string;
                                    };
                                };
                            };
                            locationInfo: {
                                type: string;
                                additionalProperties: boolean;
                                properties: {
                                    ip: {
                                        type: string;
                                    };
                                    country: {
                                        type: string;
                                    };
                                    region: {
                                        type: string;
                                    };
                                    city: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                total: {
                    type: string;
                };
            };
        };
    };
};
export declare const adminTerminateSessionSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            userId: {
                type: string;
            };
            sessionId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
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
export declare const adminTerminateAllSessionsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            userId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
            properties: {
                success: {
                    type: string;
                };
                revokedCount: {
                    type: string;
                };
                message: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=session-management.schemas.d.ts.map