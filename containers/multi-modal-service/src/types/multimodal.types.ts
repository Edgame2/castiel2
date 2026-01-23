/**
 * Multi-Modal Service types
 * Core data model for multi-modal input processing
 */

export enum ModalType {
  IMAGE = 'image',
  DIAGRAM = 'diagram',
  AUDIO = 'audio',
  VIDEO = 'video',
  WHITEBOARD = 'whiteboard',
  CUSTOM = 'custom',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ImageType {
  DESIGN = 'design',
  SCREENSHOT = 'screenshot',
  DIAGRAM = 'diagram',
  WIREFRAME = 'wireframe',
  MOCKUP = 'mockup',
  CUSTOM = 'custom',
}

export enum DiagramType {
  ARCHITECTURE = 'architecture',
  FLOWCHART = 'flowchart',
  UML = 'uml',
  ER_DIAGRAM = 'er_diagram',
  SEQUENCE = 'sequence',
  CLASS_DIAGRAM = 'class_diagram',
  CUSTOM = 'custom',
}

export enum AudioType {
  VOICE_COMMAND = 'voice_command',
  MEETING = 'meeting',
  TUTORIAL = 'tutorial',
  CUSTOM = 'custom',
}

export enum VideoType {
  TUTORIAL = 'tutorial',
  DEMO = 'demo',
  SCREEN_RECORDING = 'screen_recording',
  CUSTOM = 'custom',
}

/**
 * Multi-Modal Processing Job
 */
export interface MultiModalJob {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  type: ModalType;
  status: ProcessingStatus;
  input: {
    url?: string; // URL to the media file
    data?: string; // Base64 encoded data
    mimeType?: string;
    metadata?: {
      imageType?: ImageType;
      diagramType?: DiagramType;
      audioType?: AudioType;
      videoType?: VideoType;
      duration?: number; // for audio/video in seconds
      dimensions?: {
        width?: number;
        height?: number;
      };
    };
  };
  output?: {
    transcription?: string; // For audio/video
    extractedText?: string; // OCR or text extraction
    description?: string; // AI-generated description
    code?: string; // Generated code
    structuredData?: Record<string, any>; // Parsed structured data
    annotations?: Array<{
      type: string;
      coordinates?: { x: number; y: number; width: number; height: number };
      content: string;
    }>;
  };
  analysis?: {
    detectedElements?: string[]; // UI elements, components, etc.
    detectedPatterns?: string[]; // Design patterns, architecture patterns
    suggestions?: string[];
    confidence?: number; // 0-1
  };
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create multi-modal job input
 */
export interface CreateMultiModalJobInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  type: ModalType;
  input: {
    url?: string;
    data?: string;
    mimeType?: string;
    metadata?: {
      imageType?: ImageType;
      diagramType?: DiagramType;
      audioType?: AudioType;
      videoType?: VideoType;
      duration?: number;
      dimensions?: {
        width?: number;
        height?: number;
      };
    };
  };
  options?: {
    generateCode?: boolean;
    extractText?: boolean;
    transcribe?: boolean;
    analyze?: boolean;
  };
}

/**
 * Update multi-modal job input
 */
export interface UpdateMultiModalJobInput {
  name?: string;
  description?: string;
  status?: ProcessingStatus;
  output?: MultiModalJob['output'];
  analysis?: MultiModalJob['analysis'];
  error?: string;
}

