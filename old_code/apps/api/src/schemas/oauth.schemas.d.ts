/**
 * Schemas for social OAuth routes
 */
export declare const initiateGoogleOAuthSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            tenantId: {
                type: string;
                description: string;
            };
            redirectUrl: {
                type: string;
                format: string;
                description: string;
            };
        };
    };
    response: {
        302: {
            description: string;
            type: string;
        };
        503: {
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
export declare const googleCallbackSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            code: {
                type: string;
            };
            state: {
                type: string;
            };
            error: {
                type: string;
            };
            error_description: {
                type: string;
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
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        status: {
                            type: string;
                        };
                    };
                };
                isNewUser: {
                    type: string;
                };
            };
        };
        302: {
            description: string;
            type: string;
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
    };
};
export declare const initiateGithubOAuthSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            tenantId: {
                type: string;
                description: string;
            };
            redirectUrl: {
                type: string;
                format: string;
                description: string;
            };
        };
    };
    response: {
        302: {
            description: string;
            type: string;
        };
        503: {
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
export declare const githubCallbackSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            code: {
                type: string;
            };
            state: {
                type: string;
            };
            error: {
                type: string;
            };
            error_description: {
                type: string;
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
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        status: {
                            type: string;
                        };
                    };
                };
                isNewUser: {
                    type: string;
                };
            };
        };
        302: {
            description: string;
            type: string;
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
    };
};
export declare const initiateMicrosoftOAuthSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            tenantId: {
                type: string;
                description: string;
            };
            redirectUrl: {
                type: string;
                format: string;
                description: string;
            };
        };
    };
    response: {
        302: {
            description: string;
            type: string;
        };
        503: {
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
export declare const microsoftCallbackSchema: {
    description: string;
    tags: string[];
    querystring: {
        type: string;
        properties: {
            code: {
                type: string;
            };
            state: {
                type: string;
            };
            error: {
                type: string;
            };
            error_description: {
                type: string;
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
                    properties: {
                        id: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                        firstName: {
                            type: string;
                        };
                        lastName: {
                            type: string;
                        };
                        tenantId: {
                            type: string;
                        };
                        status: {
                            type: string;
                        };
                    };
                };
                isNewUser: {
                    type: string;
                };
            };
        };
        302: {
            description: string;
            type: string;
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
    };
};
//# sourceMappingURL=oauth.schemas.d.ts.map