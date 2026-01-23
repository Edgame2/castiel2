export declare const listRolesSchema: {
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
        additionalProperties: boolean;
        properties: {
            includeSystem: {
                type: string;
            };
            search: {
                type: string;
            };
            page: {
                type: string;
                minimum: number;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                roles: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            id: {
                                type: string;
                            };
                            tenantId: {
                                type: string;
                            };
                            name: {
                                type: string;
                            };
                            displayName: {
                                type: string;
                            };
                            description: {
                                type: string;
                            };
                            permissions: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            isSystem: {
                                type: string;
                            };
                            memberCount: {
                                type: string;
                            };
                            createdAt: {
                                type: string;
                            };
                            updatedAt: {
                                type: string;
                            };
                            createdBy: {
                                type: string;
                            };
                            updatedBy: {
                                type: string;
                            };
                        };
                    };
                };
                total: {
                    type: string;
                };
                page: {
                    type: string;
                };
                limit: {
                    type: string;
                };
            };
        };
    };
};
export declare const createRoleSchema: {
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
        additionalProperties: boolean;
        properties: {
            name: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            displayName: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            description: {
                type: string;
                maxLength: number;
            };
            permissions: {
                type: string;
                minItems: number;
                items: {
                    type: string;
                };
            };
        };
    };
    response: {
        201: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                name: {
                    type: string;
                };
                displayName: {
                    type: string;
                };
                description: {
                    type: string;
                };
                permissions: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                isSystem: {
                    type: string;
                };
                memberCount: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                createdBy: {
                    type: string;
                };
                updatedBy: {
                    type: string;
                };
            };
        };
    };
};
export declare const getRoleSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
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
                id: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                name: {
                    type: string;
                };
                displayName: {
                    type: string;
                };
                description: {
                    type: string;
                };
                permissions: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                isSystem: {
                    type: string;
                };
                memberCount: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                createdBy: {
                    type: string;
                };
                updatedBy: {
                    type: string;
                };
            };
        };
    };
};
export declare const updateRoleSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        additionalProperties: boolean;
        properties: {
            displayName: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            description: {
                type: string;
                maxLength: number;
            };
            permissions: {
                type: string;
                minItems: number;
                items: {
                    type: string;
                };
            };
        };
    };
    response: {
        200: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                tenantId: {
                    type: string;
                };
                name: {
                    type: string;
                };
                displayName: {
                    type: string;
                };
                description: {
                    type: string;
                };
                permissions: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                isSystem: {
                    type: string;
                };
                memberCount: {
                    type: string;
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
                createdBy: {
                    type: string;
                };
                updatedBy: {
                    type: string;
                };
            };
        };
    };
};
export declare const deleteRoleSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
        };
    };
    response: {
        204: {
            type: string;
        };
    };
};
export declare const roleMembersSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
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
                members: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            userId: {
                                type: string;
                            };
                            userEmail: {
                                type: string;
                            };
                            userName: {
                                type: string;
                            };
                            assignedAt: {
                                type: string;
                            };
                            assignedBy: {
                                type: string;
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
export declare const addRoleMembersSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        required: string[];
        additionalProperties: boolean;
        properties: {
            userIds: {
                type: string;
                minItems: number;
                items: {
                    type: string;
                };
            };
        };
    };
    response: {
        204: {
            type: string;
        };
    };
};
export declare const removeRoleMemberSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
            userId: {
                type: string;
            };
        };
    };
    response: {
        204: {
            type: string;
        };
    };
};
export declare const createIdPMappingSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
        };
    };
    body: {
        type: string;
        required: string[];
        additionalProperties: boolean;
        properties: {
            idpId: {
                type: string;
            };
            groupAttribute: {
                type: string;
            };
            groupValues: {
                type: string;
                minItems: number;
                items: {
                    type: string;
                };
            };
        };
    };
    response: {
        201: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                };
                roleId: {
                    type: string;
                };
                idpId: {
                    type: string;
                };
                groupAttribute: {
                    type: string;
                };
                groupValues: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                createdAt: {
                    type: string;
                };
                updatedAt: {
                    type: string;
                };
            };
        };
    };
};
export declare const listIdPMappingsSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            tenantId: {
                type: string;
            };
            roleId: {
                type: string;
            };
        };
    };
    response: {
        200: {
            type: string;
            required: string[];
            properties: {
                mappings: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            id: {
                                type: string;
                            };
                            roleId: {
                                type: string;
                            };
                            idpId: {
                                type: string;
                            };
                            groupAttribute: {
                                type: string;
                            };
                            groupValues: {
                                type: string;
                                items: {
                                    type: string;
                                };
                            };
                            createdAt: {
                                type: string;
                            };
                            updatedAt: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const listPermissionsSchema: {
    response: {
        200: {
            type: string;
            required: string[];
            properties: {
                categories: {
                    type: string;
                    items: {
                        type: string;
                        required: string[];
                        properties: {
                            name: {
                                type: string;
                            };
                            description: {
                                type: string;
                            };
                            permissions: {
                                type: string;
                                items: {
                                    type: string;
                                    required: string[];
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        name: {
                                            type: string;
                                        };
                                        resource: {
                                            type: string;
                                        };
                                        action: {
                                            type: string;
                                        };
                                        scope: {
                                            type: string;
                                        };
                                        description: {
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
        };
    };
};
//# sourceMappingURL=role-management.schemas.d.ts.map