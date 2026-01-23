export declare const createJoinRequestSchema: {
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
            message: {
                type: string;
                maxLength: number;
            };
        };
    };
};
export declare const listJoinRequestsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    querystring: {
        type: string;
        properties: {
            status: {
                type: string;
                enum: string[];
            };
        };
    };
};
export declare const updateJoinRequestSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            requestId: {
                type: string;
            };
        };
    };
};
export declare const createInvitationSchema: {
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
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
            };
            message: {
                type: string;
                maxLength: number;
            };
            expiresAt: {
                type: string;
                format: string;
            };
            rolesPreset: {
                type: string;
            };
            roles: {
                type: string;
                items: {
                    type: string;
                };
                minItems: number;
                maxItems: number;
                uniqueItems: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
export declare const respondInvitationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            token: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        properties: {
            userId: {
                type: string;
            };
            tenantSwitchTargetId: {
                type: string;
            };
            decisionMetadata: {
                type: string;
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
export declare const previewInvitationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            token: {
                type: string;
            };
        };
    };
};
export declare const membershipSummarySchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
};
export declare const listInvitationsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
        };
    };
    querystring: {
        type: string;
        properties: {
            status: {
                type: string;
                enum: string[];
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
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                invitations: {
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
                            email: {
                                type: string;
                            };
                            status: {
                                type: string;
                            };
                            inviterUserId: {
                                type: string;
                            };
                            issuerDisplayName: {
                                type: string;
                            };
                            message: {
                                type: string[];
                            };
                            roles: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            rolesPreset: {
                                type: string[];
                            };
                            expiresAt: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                            };
                            respondedAt: {
                                type: string[];
                            };
                            isExpired: {
                                type: string;
                            };
                        };
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
        };
    };
};
export declare const revokeInvitationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            invitationId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                invitation: {
                    type: string;
                };
            };
        };
    };
};
export declare const resendInvitationSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            invitationId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            properties: {
                message: {
                    type: string;
                };
                invitation: {
                    type: string;
                };
            };
        };
    };
};
//# sourceMappingURL=tenant-membership.schemas.d.ts.map