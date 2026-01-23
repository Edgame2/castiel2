/**
 * Content Generation Configuration
 *
 * Centralized configuration for content generation system
 */
export interface ContentGenerationConfig {
    enabled: boolean;
    templateContainerName: string;
    templateMaxVersions: number;
    templateMaxColors: number;
    defaultModel: string;
    defaultTemperature: number;
    defaultMaxTokens?: number;
    serviceBusConnectionString?: string;
    serviceBusTopicName: string;
    serviceBusSubscriptionName: string;
    jobTimeoutMs: number;
    maxRetries: number;
    apiRequestTimeoutMs: number;
    defaultDailyLimit: number;
    defaultMonthlyLimit: number;
    maxPlaceholdersPerTemplate: number;
    maxSkipPlaceholders: number;
    maxVariableValueLength: number;
    maxContextVariables: number;
    maxTemplateNameLength: number;
    maxTemplateDescriptionLength: number;
    placeholderRegex: RegExp;
    extractionContextRadius: number;
    googleServiceAccountKey?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleRedirectUri?: string;
    googleDriveFolderId?: string;
    azureTenantId?: string;
    microsoftClientId?: string;
    microsoftClientSecret?: string;
    microsoftRedirectUri?: string;
    onedriveDefaultFolderId?: string;
}
/**
 * Get content generation configuration from environment
 */
export declare function getContentGenerationConfig(): ContentGenerationConfig;
/**
 * Validate configuration
 */
export declare function validateContentGenerationConfig(config: ContentGenerationConfig): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=content-generation.config.d.ts.map