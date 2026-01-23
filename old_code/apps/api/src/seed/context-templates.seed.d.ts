/**
 * Context Template Seed Data
 *
 * Seeds the c_contextTemplate ShardType and initial AI context templates
 */
import type { ShardType } from '../types/shard-type.types.js';
/**
 * c_contextTemplate ShardType Definition
 *
 * Context templates define how AI assistants interact with shards
 */
export declare const CONTEXT_TEMPLATE_SHARD_TYPE: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * Default Context Templates
 */
export declare const DEFAULT_CONTEXT_TEMPLATES: ({
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: ({
        name: string;
        type: string;
        required: boolean;
        description: string;
        default?: undefined;
    } | {
        name: string;
        type: string;
        required: boolean;
        default: number;
        description: string;
    })[];
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    outputSchema?: undefined;
    targetShardTypes?: undefined;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: {
        name: string;
        type: string;
        required: boolean;
        description: string;
    }[];
    outputSchema: {
        type: string;
        additionalProperties: boolean;
        required?: undefined;
        properties?: undefined;
        items?: undefined;
    };
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    targetShardTypes?: undefined;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: {
        name: string;
        type: string;
        required: boolean;
        description: string;
    }[];
    outputSchema: {
        type: string;
        required: string[];
        properties: {
            category: {
                type: string;
            };
            confidence: {
                type: string;
                minimum: number;
                maximum: number;
            };
            reasoning: {
                type: string;
            };
        };
        additionalProperties?: undefined;
        items?: undefined;
    };
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    targetShardTypes?: undefined;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: ({
        name: string;
        type: string;
        required: boolean;
        description: string;
        default?: undefined;
    } | {
        name: string;
        type: string;
        required: boolean;
        default: string;
        description: string;
    })[];
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    outputSchema?: undefined;
    targetShardTypes?: undefined;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: {
        name: string;
        type: string;
        required: boolean;
        description: string;
    }[];
    targetShardTypes: string[];
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    outputSchema?: undefined;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: {
        name: string;
        type: string;
        required: boolean;
    }[];
    targetShardTypes: string[];
    outputSchema: {
        type: string;
        items: {
            type: string;
        };
        additionalProperties?: undefined;
        required?: undefined;
        properties?: undefined;
    };
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
} | {
    name: string;
    templateType: string;
    description: string;
    prompt: string;
    variables: {
        name: string;
        type: string;
        required: boolean;
    }[];
    modelConfig: {
        temperature: number;
        maxTokens: number;
    };
    isDefault: boolean;
    outputSchema?: undefined;
    targetShardTypes?: undefined;
})[];
/**
 * Get seeding function
 */
export declare function getContextTemplateSeedData(): {
    shardType: Omit<ShardType, "id" | "createdAt" | "updatedAt">;
    templates: ({
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: ({
            name: string;
            type: string;
            required: boolean;
            description: string;
            default?: undefined;
        } | {
            name: string;
            type: string;
            required: boolean;
            default: number;
            description: string;
        })[];
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        outputSchema?: undefined;
        targetShardTypes?: undefined;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: {
            name: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        outputSchema: {
            type: string;
            additionalProperties: boolean;
            required?: undefined;
            properties?: undefined;
            items?: undefined;
        };
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        targetShardTypes?: undefined;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: {
            name: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        outputSchema: {
            type: string;
            required: string[];
            properties: {
                category: {
                    type: string;
                };
                confidence: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                reasoning: {
                    type: string;
                };
            };
            additionalProperties?: undefined;
            items?: undefined;
        };
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        targetShardTypes?: undefined;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: ({
            name: string;
            type: string;
            required: boolean;
            description: string;
            default?: undefined;
        } | {
            name: string;
            type: string;
            required: boolean;
            default: string;
            description: string;
        })[];
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        outputSchema?: undefined;
        targetShardTypes?: undefined;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: {
            name: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        targetShardTypes: string[];
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        outputSchema?: undefined;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: {
            name: string;
            type: string;
            required: boolean;
        }[];
        targetShardTypes: string[];
        outputSchema: {
            type: string;
            items: {
                type: string;
            };
            additionalProperties?: undefined;
            required?: undefined;
            properties?: undefined;
        };
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
    } | {
        name: string;
        templateType: string;
        description: string;
        prompt: string;
        variables: {
            name: string;
            type: string;
            required: boolean;
        }[];
        modelConfig: {
            temperature: number;
            maxTokens: number;
        };
        isDefault: boolean;
        outputSchema?: undefined;
        targetShardTypes?: undefined;
    })[];
};
//# sourceMappingURL=context-templates.seed.d.ts.map