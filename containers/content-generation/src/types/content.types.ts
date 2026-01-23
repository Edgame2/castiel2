/**
 * Content Generation types
 * Core data model for AI-powered content generation
 */

export enum GenerationJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum DocumentType {
  PRESENTATION = 'presentation',
  DOCUMENT = 'document',
  WEBPAGE = 'webpage',
}

export enum OutputFormat {
  HTML = 'html',
  PDF = 'pdf',
  DOCX = 'docx',
  PPTX = 'pptx',
  MARKDOWN = 'markdown',
}

export enum TemplateCategory {
  SALES = 'sales',
  REPORT = 'report',
  PROPOSAL = 'proposal',
  EXECUTIVE = 'executive',
  TECHNICAL = 'technical',
  TRAINING = 'training',
  MARKETING = 'marketing',
  GENERAL = 'general',
}

/**
 * Content Generation Job
 */
export interface ContentGenerationJob {
  id: string;
  tenantId: string; // Partition key
  userId: string;
  templateId?: string;
  templateName?: string;
  status: GenerationJobStatus;
  prompt: string;
  context?: {
    projectId?: string;
    shardId?: string;
    shardTypeId?: string;
    variables?: Record<string, string>;
  };
  options?: {
    temperature?: number; // 0-2
    format?: OutputFormat;
    connectionId?: string; // AI connection ID
    skipPlaceholders?: string[];
    notifyOnComplete?: boolean;
  };
  result?: {
    content: string;
    generatedDocumentId?: string;
    generatedDocumentUrl?: string;
    shardId?: string; // Created document shard ID
    placeholdersFilled?: number;
    metadata?: {
      model?: string;
      tokensUsed?: number;
      duration?: number; // ms
    };
  };
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  retryCount: number;
  maxRetries: number;
  requestId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create content generation job input
 */
export interface CreateContentJobInput {
  tenantId: string;
  userId: string;
  prompt: string;
  templateId?: string;
  context?: ContentGenerationJob['context'];
  options?: ContentGenerationJob['options'];
  requestId?: string;
}

/**
 * Content Template
 */
export interface ContentTemplate {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  category: TemplateCategory;
  documentType: DocumentType;
  tags?: string[];
  templateContent: string; // Template with placeholders
  defaultTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  requiredFields?: {
    name: string;
    type: string;
    description?: string;
    required: boolean;
  }[];
  aiConfig?: {
    defaultModel?: string;
    defaultAssistantId?: string;
    contextTemplateId?: string;
    generationPrompt?: string;
    temperature?: number;
  };
  isSystemTemplate: boolean;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create content template input
 */
export interface CreateContentTemplateInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  documentType: DocumentType;
  tags?: string[];
  templateContent: string;
  defaultTheme?: ContentTemplate['defaultTheme'];
  requiredFields?: ContentTemplate['requiredFields'];
  aiConfig?: ContentTemplate['aiConfig'];
  isSystemTemplate?: boolean;
}

/**
 * Update content template input
 */
export interface UpdateContentTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  documentType?: DocumentType;
  tags?: string[];
  templateContent?: string;
  defaultTheme?: ContentTemplate['defaultTheme'];
  requiredFields?: ContentTemplate['requiredFields'];
  aiConfig?: ContentTemplate['aiConfig'];
  isActive?: boolean;
  version?: string;
}

/**
 * Generate content request
 */
export interface GenerateContentRequest {
  tenantId: string;
  userId: string;
  prompt: string;
  templateId?: string;
  context?: ContentGenerationJob['context'];
  options?: {
    temperature?: number;
    format?: OutputFormat;
    connectionId?: string;
    variables?: Record<string, string>;
  };
}

