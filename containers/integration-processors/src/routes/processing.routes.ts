/**
 * Data Processing Settings API routes
 * @module integration-processors/routes/processing
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, getContainer } from '@coder/shared';
import { log } from '../utils/logger';

/**
 * Document processing configuration
 */
interface DocumentProcessingConfig {
  enabled: boolean;
  textExtraction: boolean;
  ocrForImages: boolean;
  contentAnalysis: boolean; // LLM-based
  entityExtraction: boolean;
  maxDocumentSizeMB: number;
  supportedFileTypes: string[];
}

/**
 * Email processing configuration
 */
interface EmailProcessingConfig {
  enabled: boolean;
  sentimentAnalysis: boolean;
  actionItemExtraction: boolean;
  processAttachments: boolean;
  filterSpam: boolean;
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'matches';
    value: any;
  }>;
}

/**
 * Meeting processing configuration
 */
interface MeetingProcessingConfig {
  enabled: boolean;
  transcription: boolean;
  speakerDiarization: boolean;
  keyMomentDetection: boolean;
  actionItemExtraction: boolean;
  dealSignalDetection: boolean;
  transcriptionQuality: 'standard' | 'high';
  maxRecordingDurationMinutes: number;
}

/**
 * Processing priority
 */
interface ProcessingPriority {
  dataType: 'opportunities' | 'documents' | 'emails' | 'meetings' | 'messages';
  priority: number; // Lower number = higher priority
}

/**
 * Data processing settings
 */
interface DataProcessingSettings {
  id?: string; // Cosmos document id when loaded from DB
  tenantId: string;
  documentProcessing: DocumentProcessingConfig;
  emailProcessing: EmailProcessingConfig;
  meetingProcessing: MeetingProcessingConfig;
  priorities: ProcessingPriority[];
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_SETTINGS: Omit<DataProcessingSettings, 'tenantId' | 'createdAt' | 'updatedAt'> = {
  documentProcessing: {
    enabled: true,
    textExtraction: true,
    ocrForImages: true,
    contentAnalysis: true,
    entityExtraction: true,
    maxDocumentSizeMB: 50,
    supportedFileTypes: [
      'pdf',
      'doc',
      'docx',
      'txt',
      'rtf',
      'odt',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'tiff',
    ],
  },
  emailProcessing: {
    enabled: true,
    sentimentAnalysis: true,
    actionItemExtraction: true,
    processAttachments: true,
    filterSpam: true,
    filters: [],
  },
  meetingProcessing: {
    enabled: true,
    transcription: true,
    speakerDiarization: true,
    keyMomentDetection: true,
    actionItemExtraction: true,
    dealSignalDetection: true,
    transcriptionQuality: 'standard',
    maxRecordingDurationMinutes: 120,
  },
  priorities: [
    { dataType: 'opportunities', priority: 1 },
    { dataType: 'documents', priority: 2 },
    { dataType: 'emails', priority: 3 },
    { dataType: 'meetings', priority: 4 },
    { dataType: 'messages', priority: 5 },
  ],
};

export async function processingRoutes(app: FastifyInstance): Promise<void> {
  // Get processing settings
  app.get(
    '/processing/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get data processing settings',
        tags: ['Data Processing'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      try {
        const container = getContainer('integration_processing_settings');

        // Try to get existing settings
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        if (resources && resources.length > 0) {
          return reply.send({ settings: resources[0] });
        }

        // Return default settings if none exist
        const defaultSettings: DataProcessingSettings = {
          ...DEFAULT_SETTINGS,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return reply.send({ settings: defaultSettings });
      } catch (error: any) {
        log.error('Failed to get processing settings', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to get processing settings' });
      }
    }
  );

  // Update processing settings
  app.put<{
    Body: {
      documentProcessing?: Partial<DocumentProcessingConfig>;
      emailProcessing?: Partial<EmailProcessingConfig>;
      meetingProcessing?: Partial<MeetingProcessingConfig>;
      priorities?: ProcessingPriority[];
    };
  }>(
    '/processing/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update data processing settings',
        tags: ['Data Processing'],
        body: {
          type: 'object',
          properties: {
            documentProcessing: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                textExtraction: { type: 'boolean' },
                ocrForImages: { type: 'boolean' },
                contentAnalysis: { type: 'boolean' },
                entityExtraction: { type: 'boolean' },
                maxDocumentSizeMB: { type: 'number' },
                supportedFileTypes: { type: 'array', items: { type: 'string' } },
              },
            },
            emailProcessing: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                sentimentAnalysis: { type: 'boolean' },
                actionItemExtraction: { type: 'boolean' },
                processAttachments: { type: 'boolean' },
                filterSpam: { type: 'boolean' },
                filters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      operator: { type: 'string', enum: ['equals', 'contains', 'matches'] },
                      value: {},
                    },
                  },
                },
              },
            },
            meetingProcessing: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                transcription: { type: 'boolean' },
                speakerDiarization: { type: 'boolean' },
                keyMomentDetection: { type: 'boolean' },
                actionItemExtraction: { type: 'boolean' },
                dealSignalDetection: { type: 'boolean' },
                transcriptionQuality: { type: 'string', enum: ['standard', 'high'] },
                maxRecordingDurationMinutes: { type: 'number' },
              },
            },
            priorities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dataType: {
                    type: 'string',
                    enum: ['opportunities', 'documents', 'emails', 'meetings', 'messages'],
                  },
                  priority: { type: 'number' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = request.body;

      try {
        const container = getContainer('integration_processing_settings');

        // Get existing settings or create new
        const { resources } = await container.items
          .query({
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
          })
          .fetchNext();

        let settings: DataProcessingSettings;

        if (resources && resources.length > 0) {
          settings = resources[0] as DataProcessingSettings;
          // Update existing settings
          settings = {
            ...settings,
            documentProcessing: {
              ...settings.documentProcessing,
              ...body.documentProcessing,
            },
            emailProcessing: {
              ...settings.emailProcessing,
              ...body.emailProcessing,
            },
            meetingProcessing: {
              ...settings.meetingProcessing,
              ...body.meetingProcessing,
            },
            priorities: body.priorities ?? settings.priorities,
            updatedAt: new Date(),
          };

          await container.item(settings.id || tenantId, tenantId).replace(settings);
        } else {
          // Create new settings
          settings = {
            ...DEFAULT_SETTINGS,
            tenantId,
            documentProcessing: {
              ...DEFAULT_SETTINGS.documentProcessing,
              ...body.documentProcessing,
            },
            emailProcessing: {
              ...DEFAULT_SETTINGS.emailProcessing,
              ...body.emailProcessing,
            },
            meetingProcessing: {
              ...DEFAULT_SETTINGS.meetingProcessing,
              ...body.meetingProcessing,
            },
            priorities: body.priorities ?? DEFAULT_SETTINGS.priorities,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await container.items.create(settings, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
        }

        return reply.send({ settings });
      } catch (error: any) {
        log.error('Failed to update processing settings', error, { tenantId, service: 'integration-processors' });
        return reply.code(500).send({ error: 'Failed to update processing settings' });
      }
    }
  );
}
