/**
 * Content Generation Configuration
 * 
 * Centralized configuration for content generation system
 */

export interface ContentGenerationConfig {
  // Feature toggle
  enabled: boolean;
  
  // Template container
  templateContainerName: string;
  templateMaxVersions: number;
  templateMaxColors: number;
  
  // Generation settings
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens?: number;
  
  // Async processing
  serviceBusConnectionString?: string;
  serviceBusTopicName: string;
  serviceBusSubscriptionName: string;
  jobTimeoutMs: number;
  maxRetries: number;
  
  // API request timeouts
  apiRequestTimeoutMs: number; // Timeout for external API calls (Google Drive, Microsoft Graph, etc.)
  
  // Quota settings
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  
  // Placeholder limits
  maxPlaceholdersPerTemplate: number;
  maxSkipPlaceholders: number;
  maxVariableValueLength: number; // Maximum length for context variable values
  maxContextVariables: number; // Maximum number of context variables allowed
  
  // Template metadata limits
  maxTemplateNameLength: number; // Maximum length for template name
  maxTemplateDescriptionLength: number; // Maximum length for template description
  
  // Placeholder extraction
  placeholderRegex: RegExp;
  extractionContextRadius: number;
  
  // Google Integration
  googleServiceAccountKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  googleDriveFolderId?: string;
  
  // Microsoft Integration
  azureTenantId?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftRedirectUri?: string;
  onedriveDefaultFolderId?: string;
}

/**
 * Get content generation configuration from environment
 */
export function getContentGenerationConfig(): ContentGenerationConfig {
  const enabled = process.env.CONTENT_GEN_ENABLED === 'true';
  
  return {
    enabled,
    templateContainerName: process.env.TEMPLATE_CONTAINER_NAME || 'document-templates',
    templateMaxVersions: parseInt(process.env.TEMPLATE_MAX_VERSIONS || '5', 10),
    templateMaxColors: parseInt(process.env.TEMPLATE_MAX_COLORS || '6', 10),
    defaultModel: process.env.CONTENT_GEN_DEFAULT_MODEL || 'gpt-4',
    defaultTemperature: parseFloat(process.env.CONTENT_GEN_DEFAULT_TEMPERATURE || '0.7'),
    defaultMaxTokens: process.env.CONTENT_GEN_DEFAULT_MAX_TOKENS 
      ? parseInt(process.env.CONTENT_GEN_DEFAULT_MAX_TOKENS, 10)
      : undefined,
    serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING,
    serviceBusTopicName: process.env.CONTENT_GEN_TOPIC_NAME || 'content-generation',
    serviceBusSubscriptionName: process.env.CONTENT_GEN_SUBSCRIPTION_NAME || 'content-generation-workers',
    jobTimeoutMs: parseInt(process.env.CONTENT_GEN_JOB_TIMEOUT_MS || '300000', 10), // 5 minutes
    maxRetries: parseInt(process.env.CONTENT_GEN_JOB_RETRIES || '3', 10),
    apiRequestTimeoutMs: parseInt(process.env.CONTENT_GEN_API_TIMEOUT_MS || '30000', 10), // 30 seconds default
    defaultDailyLimit: parseInt(process.env.CONTENT_GEN_DAILY_LIMIT || '100', 10),
    defaultMonthlyLimit: parseInt(process.env.CONTENT_GEN_MONTHLY_LIMIT || '2000', 10),
    maxPlaceholdersPerTemplate: parseInt(process.env.CONTENT_GEN_MAX_PLACEHOLDERS || '100', 10),
    maxSkipPlaceholders: parseInt(process.env.CONTENT_GEN_MAX_SKIP_PLACEHOLDERS || '50', 10),
    maxVariableValueLength: parseInt(process.env.CONTENT_GEN_MAX_VARIABLE_VALUE_LENGTH || '10000', 10), // 10KB default
    maxContextVariables: parseInt(process.env.CONTENT_GEN_MAX_CONTEXT_VARIABLES || '50', 10), // Maximum 50 variables
    maxTemplateNameLength: parseInt(process.env.CONTENT_GEN_MAX_TEMPLATE_NAME_LENGTH || '200', 10), // 200 characters default
    maxTemplateDescriptionLength: parseInt(process.env.CONTENT_GEN_MAX_TEMPLATE_DESCRIPTION_LENGTH || '2000', 10), // 2000 characters default
    placeholderRegex: /\{\{([^}]+)\}\}/g, // MANDATORY: Must use this regex pattern
    extractionContextRadius: parseInt(process.env.EXTRACTION_CONTEXT_RADIUS || '50', 10),
    googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    azureTenantId: process.env.AZURE_TENANT_ID,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI,
    onedriveDefaultFolderId: process.env.ONEDRIVE_DEFAULT_FOLDER_ID,
  };
}

/**
 * Validate configuration
 */
export function validateContentGenerationConfig(config: ContentGenerationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.templateMaxVersions < 1 || config.templateMaxVersions > 10) {
    errors.push('templateMaxVersions must be between 1 and 10');
  }
  
  if (config.templateMaxColors < 1 || config.templateMaxColors > 10) {
    errors.push('templateMaxColors must be between 1 and 10');
  }
  
  if (config.defaultTemperature < 0 || config.defaultTemperature > 2) {
    errors.push('defaultTemperature must be between 0 and 2');
  }
  
  if (config.jobTimeoutMs < 60000) {
    errors.push('jobTimeoutMs must be at least 60000ms (1 minute)');
  }
  
  if (config.maxRetries < 0 || config.maxRetries > 10) {
    errors.push('maxRetries must be between 0 and 10');
  }
  
  if (config.defaultDailyLimit < 0) {
    errors.push('defaultDailyLimit must be non-negative');
  }
  
  if (config.defaultMonthlyLimit < 0) {
    errors.push('defaultMonthlyLimit must be non-negative');
  }
  
  if (config.maxPlaceholdersPerTemplate < 1 || config.maxPlaceholdersPerTemplate > 500) {
    errors.push('maxPlaceholdersPerTemplate must be between 1 and 500');
  }
  
  if (config.maxSkipPlaceholders < 1 || config.maxSkipPlaceholders > 100) {
    errors.push('maxSkipPlaceholders must be between 1 and 100');
  }
  
  if (config.maxVariableValueLength < 1 || config.maxVariableValueLength > 100000) {
    errors.push('maxVariableValueLength must be between 1 and 100000 (100KB)');
  }
  
  if (config.maxContextVariables < 1 || config.maxContextVariables > 200) {
    errors.push('maxContextVariables must be between 1 and 200');
  }
  
  if (config.maxTemplateNameLength < 1 || config.maxTemplateNameLength > 500) {
    errors.push('maxTemplateNameLength must be between 1 and 500');
  }
  
  if (config.maxTemplateDescriptionLength < 1 || config.maxTemplateDescriptionLength > 10000) {
    errors.push('maxTemplateDescriptionLength must be between 1 and 10000');
  }
  
  if (config.apiRequestTimeoutMs < 1000 || config.apiRequestTimeoutMs > 300000) {
    errors.push('apiRequestTimeoutMs must be between 1000ms (1 second) and 300000ms (5 minutes)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

