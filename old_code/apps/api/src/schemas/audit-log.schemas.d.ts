/**
 * Audit Log API Schemas
 * JSON Schema definitions for audit log routes
 */
export declare const listAuditLogsSchema: {
    querystring: {
        type: string;
        properties: {
            category: {
                type: string;
                enum: string[];
            };
            eventType: {
                type: string;
            };
            severity: {
                type: string;
                enum: string[];
            };
            outcome: {
                type: string;
                enum: string[];
            };
            actorId: {
                type: string;
            };
            actorEmail: {
                type: string;
            };
            targetId: {
                type: string;
            };
            targetType: {
                type: string;
            };
            startDate: {
                type: string;
            };
            endDate: {
                type: string;
            };
            search: {
                type: string;
                maxLength: number;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
            offset: {
                type: string;
                minimum: number;
                default: number;
            };
            sortBy: {
                type: string;
                enum: string[];
                default: string;
            };
            sortOrder: {
                type: string;
                enum: string[];
                default: string;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                logs: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            tenantId: {
                                type: string;
                            };
                            category: {
                                type: string;
                            };
                            eventType: {
                                type: string;
                            };
                            severity: {
                                type: string;
                                enum: string[];
                            };
                            outcome: {
                                type: string;
                                enum: string[];
                            };
                            timestamp: {
                                type: string;
                            };
                            actorId: {
                                type: string[];
                            };
                            actorEmail: {
                                type: string[];
                            };
                            actorType: {
                                type: string;
                                enum: string[];
                            };
                            targetId: {
                                type: string[];
                            };
                            targetType: {
                                type: string[];
                            };
                            targetName: {
                                type: string[];
                            };
                            ipAddress: {
                                type: string[];
                            };
                            userAgent: {
                                type: string[];
                            };
                            requestId: {
                                type: string[];
                            };
                            sessionId: {
                                type: string[];
                            };
                            message: {
                                type: string;
                            };
                            details: {
                                type: string[];
                            };
                            errorCode: {
                                type: string[];
                            };
                            errorMessage: {
                                type: string[];
                            };
                            metadata: {
                                type: string[];
                                properties: {
                                    source: {
                                        type: string;
                                    };
                                    version: {
                                        type: string;
                                    };
                                    environment: {
                                        type: string;
                                    };
                                    correlationId: {
                                        type: string;
                                    };
                                };
                            };
                        };
                        required: string[];
                    };
                };
                total: {
                    type: string;
                };
                limit: {
                    type: string;
                };
                offset: {
                    type: string;
                };
            };
            required: string[];
        };
    };
};
export declare const getAuditLogSchema: {
    params: {
        type: string;
        properties: {
            id: {
                type: string;
            };
        };
        required: string[];
    };
    response: {
        200: {
            type: string;
            properties: {
                id: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                category: {
                    type: string;
                };
                eventType: {
                    type: string;
                };
                severity: {
                    type: string;
                    enum: string[];
                };
                outcome: {
                    type: string;
                    enum: string[];
                };
                timestamp: {
                    type: string;
                };
                actorId: {
                    type: string[];
                };
                actorEmail: {
                    type: string[];
                };
                actorType: {
                    type: string;
                    enum: string[];
                };
                targetId: {
                    type: string[];
                };
                targetType: {
                    type: string[];
                };
                targetName: {
                    type: string[];
                };
                ipAddress: {
                    type: string[];
                };
                userAgent: {
                    type: string[];
                };
                requestId: {
                    type: string[];
                };
                sessionId: {
                    type: string[];
                };
                message: {
                    type: string;
                };
                details: {
                    type: string[];
                };
                errorCode: {
                    type: string[];
                };
                errorMessage: {
                    type: string[];
                };
                metadata: {
                    type: string[];
                    properties: {
                        source: {
                            type: string;
                        };
                        version: {
                            type: string;
                        };
                        environment: {
                            type: string;
                        };
                        correlationId: {
                            type: string;
                        };
                    };
                };
            };
            required: string[];
        };
        404: {
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
export declare const getAuditStatsSchema: {
    querystring: {
        type: string;
        properties: {
            days: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
        };
        additionalProperties: boolean;
    };
    response: {
        200: {
            type: string;
            properties: {
                totalEvents: {
                    type: string;
                };
                eventsByCategory: {
                    type: string;
                    additionalProperties: {
                        type: string;
                    };
                };
                eventsBySeverity: {
                    type: string;
                    additionalProperties: {
                        type: string;
                    };
                };
                eventsByOutcome: {
                    type: string;
                    additionalProperties: {
                        type: string;
                    };
                };
                topEventTypes: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            type: {
                                type: string;
                            };
                            count: {
                                type: string;
                            };
                        };
                    };
                };
                recentActivity: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            date: {
                                type: string;
                            };
                            count: {
                                type: string;
                            };
                        };
                    };
                };
            };
            required: string[];
        };
    };
};
export declare const exportAuditLogsSchema: {
    querystring: {
        type: string;
        properties: {
            format: {
                type: string;
                enum: string[];
                default: string;
            };
            category: {
                type: string;
            };
            eventType: {
                type: string;
            };
            severity: {
                type: string;
                enum: string[];
            };
            outcome: {
                type: string;
                enum: string[];
            };
            actorId: {
                type: string;
            };
            actorEmail: {
                type: string;
            };
            targetId: {
                type: string;
            };
            targetType: {
                type: string;
            };
            startDate: {
                type: string;
            };
            endDate: {
                type: string;
            };
            search: {
                type: string;
                maxLength: number;
            };
        };
        additionalProperties: boolean;
    };
};
export declare const getFilterOptionsSchema: {
    response: {
        200: {
            type: string;
            properties: {
                categories: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            value: {
                                type: string;
                            };
                            label: {
                                type: string;
                            };
                        };
                    };
                };
                severities: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            value: {
                                type: string;
                            };
                            label: {
                                type: string;
                            };
                        };
                    };
                };
                outcomes: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            value: {
                                type: string;
                            };
                            label: {
                                type: string;
                            };
                        };
                    };
                };
                eventTypes: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            value: {
                                type: string;
                            };
                            label: {
                                type: string;
                            };
                            category: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=audit-log.schemas.d.ts.map