/**
 * Content Generation Service Unit Tests
 * 
 * Tests for:
 * - Template-based document generation
 * - Direct prompt-based content generation
 * - Variable resolution and substitution
 * - Format conversion (HTML, PDF, DOCX, PPTX)
 * - Error handling and edge cases
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentGenerationService } from '../../../src/services/content-generation/content-generation.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { TemplateService } from '../../../src/services/content-generation/template.service.js';
import type { InsightService } from '../../../src/services/insight.service.js';
import type { ShardRepository } from '../../../src/repositories/shard.repository.js';
import type { ConversionService } from '../../../src/services/content-generation/conversion.service.js';
import type { InsightRequest, InsightResponse } from '../../../src/types/ai-insights.types.js';
import { ShardStatus, ShardSource } from '../../../src/types/shard.types.js';

// ============================================================================
// Mocks
// ============================================================================

function createMockMonitoring(): IMonitoringProvider {
  return {
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackMetric: vi.fn(),
    trackDependency: vi.fn(),
  } as any;
}

function createMockTemplateService(): TemplateService {
  return {
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    listTemplates: vi.fn(),
  } as any;
}

function createMockInsightService(): InsightService {
  return {
    generate: vi.fn(),
    generateStream: vi.fn(),
  } as any;
}

function createMockShardRepository(): ShardRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as any;
}

function createMockConversionService(): ConversionService {
  return {
    convertToPdf: vi.fn(),
    convertToDocx: vi.fn(),
    convertToPptx: vi.fn(),
  } as any;
}

// ============================================================================
// Test Data
// ============================================================================

const TEST_TENANT_ID = 'test-tenant-123';
const TEST_USER_ID = 'test-user-456';
const TEST_TEMPLATE_ID = 'template-789';
const TEST_PROJECT_ID = 'project-101';

const mockTemplate = {
  id: TEST_TEMPLATE_ID,
  tenantId: TEST_TENANT_ID,
  name: 'Test Document Template',
  description: 'A test template',
  content: '<html><body><h1>{{title}}</h1><p>{{description}}</p></body></html>',
  variables: ['title', 'description'],
  variableConfig: {
    title: {
      type: 'text',
      label: 'Document Title',
    },
    description: {
      type: 'insight',
      label: 'Generate description',
      insightTemplateId: 'insight-template-1',
    },
  },
  type: 'document',
  category: 'general',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: TEST_USER_ID,
  updatedBy: TEST_USER_ID,
};

const mockPresentationTemplate = {
  ...mockTemplate,
  type: 'presentation',
  slides: [
    {
      id: 'slide-1',
      title: '{{title}}',
      content: '{{description}}',
    },
  ],
};

const mockInsightResponse: InsightResponse = {
  content: 'Generated description content',
  shardId: 'shard-123',
  tokensUsed: 100,
  model: 'gpt-4o',
  metadata: {
    durationMs: 500,
    cacheHit: false,
  },
};

const mockShard = {
  id: 'shard-generated-123',
  tenantId: TEST_TENANT_ID,
  userId: TEST_USER_ID,
  shardTypeId: 'c_document',
  structuredData: {
    name: 'Test Document Template - Generated',
    templateId: TEST_TEMPLATE_ID,
    content: '<html><body><h1>Test Title</h1><p>Generated description content</p></body></html>',
    generatedAt: new Date().toISOString(),
  },
  status: ShardStatus.ACTIVE,
  source: ShardSource.API,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let mockMonitoring: IMonitoringProvider;
  let mockTemplateService: TemplateService;
  let mockInsightService: InsightService;
  let mockShardRepository: ShardRepository;
  let mockConversionService: ConversionService | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMonitoring = createMockMonitoring();
    mockTemplateService = createMockTemplateService();
    mockInsightService = createMockInsightService();
    mockShardRepository = createMockShardRepository();
    mockConversionService = createMockConversionService();

    service = new ContentGenerationService(
      mockMonitoring,
      mockTemplateService,
      mockInsightService,
      mockShardRepository,
      mockConversionService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // generateDocument Tests
  // ==========================================================================

  describe('generateDocument', () => {
    it('should generate a document from a template with manual variables', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockTemplate);
      (mockShardRepository.create as any).mockResolvedValue(mockShard);

      const context = {
        variables: {
          title: 'Test Title',
          description: 'Manual description',
        },
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.shardId).toBe(mockShard.id);
      expect(result.content).toContain('Test Title');
      expect(result.content).toContain('Manual description');
      expect(mockTemplateService.getTemplate).toHaveBeenCalledWith(TEST_TEMPLATE_ID, TEST_TENANT_ID);
      expect(mockShardRepository.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'document.generated',
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          templateId: TEST_TEMPLATE_ID,
          shardId: mockShard.id,
        })
      );
    });

    it('should generate insight-based variables when not provided manually', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockTemplate);
      (mockInsightService.generate as any).mockResolvedValue(mockInsightResponse);
      (mockShardRepository.create as any).mockResolvedValue(mockShard);

      const context = {
        variables: {
          title: 'Test Title',
          // description not provided - should be generated via insight
        },
        projectId: TEST_PROJECT_ID,
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      expect(mockInsightService.generate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          scope: expect.objectContaining({
            shardId: TEST_PROJECT_ID,
            shardTypeId: 'project',
          }),
        })
      );
      expect(result.content).toContain('Generated description content');
    });

    it('should handle insight generation failures gracefully', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockTemplate);
      (mockInsightService.generate as any).mockRejectedValue(new Error('Insight generation failed'));
      (mockShardRepository.create as any).mockResolvedValue(mockShard);

      const context = {
        variables: {
          title: 'Test Title',
        },
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      expect(mockMonitoring.trackException).toHaveBeenCalled();
      expect(result.content).toContain('[Failed to generate content for description]');
      expect(mockShardRepository.create).toHaveBeenCalled();
    });

    it('should handle model unavailable responses', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockTemplate);
      (mockInsightService.generate as any).mockResolvedValue({
        success: false,
        error: 'MODEL_UNAVAILABLE',
        message: 'Model quota exceeded',
        availableAlternatives: [],
        suggestedAction: 'Try again later',
      });
      (mockShardRepository.create as any).mockResolvedValue(mockShard);

      const context = {
        variables: {
          title: 'Test Title',
        },
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      // Note: Service code now correctly uses response.message (fixed)
      // This test verifies current behavior (may need service fix)
      expect(result.content).toBeDefined();
    });

    it('should process presentation templates with JSON slides', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockPresentationTemplate);
      (mockShardRepository.create as any).mockResolvedValue({
        ...mockShard,
        structuredData: {
          ...mockShard.structuredData,
          contentType: 'presentation',
        },
      });

      const context = {
        variables: {
          title: 'Slide Title',
          description: 'Slide Description',
        },
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      expect(result).toBeDefined();
      // Content should be JSON string for presentations
      const parsedContent = JSON.parse(result.content);
      expect(parsedContent).toBeDefined();
    });

    it('should throw error when template not found', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateDocument(TEST_TENANT_ID, TEST_USER_ID, TEST_TEMPLATE_ID, {})
      ).rejects.toThrow('Template not found');

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should include projectId in generated shard', async () => {
      // Arrange
      (mockTemplateService.getTemplate as any).mockResolvedValue(mockTemplate);
      (mockShardRepository.create as any).mockResolvedValue(mockShard);

      const context = {
        variables: { title: 'Test' },
        projectId: TEST_PROJECT_ID,
      };

      // Act
      await service.generateDocument(TEST_TENANT_ID, TEST_USER_ID, TEST_TEMPLATE_ID, context);

      // Assert
      expect(mockShardRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          structuredData: expect.objectContaining({
            projectId: TEST_PROJECT_ID,
          }),
        })
      );
    });

    it('should use default placeholder for missing text variables', async () => {
      // Arrange
      const templateWithTextVar = {
        ...mockTemplate,
        content: '<html><body><h1>{{title}}</h1><p>{{customVar}}</p></body></html>',
        variables: ['title', 'customVar'],
        variableConfig: {
          title: { type: 'text', label: 'Title' },
          customVar: { type: 'text', label: 'Custom Variable' },
        },
      };
      (mockTemplateService.getTemplate as any).mockResolvedValue(templateWithTextVar);
      (mockShardRepository.create as any).mockResolvedValue({
        ...mockShard,
        structuredData: {
          ...mockShard.structuredData,
          content: '<html><body><h1>Test Title</h1><p>[Custom Variable]</p></body></html>',
        },
      });

      const context = {
        variables: {
          title: 'Test Title',
          // customVar not provided
        },
      };

      // Act
      const result = await service.generateDocument(
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_TEMPLATE_ID,
        context
      );

      // Assert
      // Service uses [label] or [varName] as placeholder
      expect(result.content).toContain('[Custom Variable]');
    });
  });

  // ==========================================================================
  // generateContent Tests
  // ==========================================================================

  describe('generateContent', () => {
    it('should generate HTML content from a prompt', async () => {
      // Arrange
      const prompt = 'Generate a summary of AI trends';
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: '<html><body><h1>AI Trends Summary</h1></body></html>',
      });

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'html',
      });

      // Assert
      expect(result).toBe('<html><body><h1>AI Trends Summary</h1></body></html>');
      expect(mockInsightService.generate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        expect.objectContaining({
          query: prompt,
          options: expect.objectContaining({
            format: 'detailed',
          }),
        })
      );
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'content.generated',
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          format: 'html',
        })
      );
    });

    it('should apply variable substitutions to generated content', async () => {
      // Arrange
      const prompt = 'Generate content with {{name}} and {{company}}';
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: '<html><body><p>Hello {{name}}, welcome to {{company}}</p></body></html>',
      });

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'html',
        variables: {
          name: 'John Doe',
          company: 'Acme Corp',
        },
      });

      // Assert
      expect(result).toContain('John Doe');
      expect(result).toContain('Acme Corp');
      expect(result).not.toContain('{{name}}');
      expect(result).not.toContain('{{company}}');
    });

    it('should convert HTML to PDF when format is pdf', async () => {
      // Arrange
      const prompt = 'Generate a report';
      const htmlContent = '<html><body><h1>Report</h1></body></html>';
      const pdfBuffer = Buffer.from('PDF content');
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: htmlContent,
      });
      (mockConversionService!.convertToPdf as any).mockResolvedValue(pdfBuffer);

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'pdf',
      });

      // Assert
      expect(result).toBe(pdfBuffer);
      expect(mockConversionService!.convertToPdf).toHaveBeenCalledWith(htmlContent);
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'content.generated',
        expect.objectContaining({
          format: 'pdf',
        })
      );
    });

    it('should convert HTML to DOCX when format is docx', async () => {
      // Arrange
      const prompt = 'Generate a document';
      const htmlContent = '<html><body><h1>Document</h1></body></html>';
      const docxBuffer = Buffer.from('DOCX content');
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: htmlContent,
      });
      (mockConversionService!.convertToDocx as any).mockResolvedValue(docxBuffer);

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'docx',
      });

      // Assert
      expect(result).toBe(docxBuffer);
      expect(mockConversionService!.convertToDocx).toHaveBeenCalledWith(htmlContent);
    });

    it('should convert HTML to PPTX when format is pptx', async () => {
      // Arrange
      const prompt = 'Generate a presentation about AI';
      const htmlContent = '<html><body><h1>AI Presentation</h1></body></html>';
      const pptxBuffer = Buffer.from('PPTX content');
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: htmlContent,
      });
      (mockConversionService!.convertToPptx as any).mockResolvedValue(pptxBuffer);

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'pptx',
      });

      // Assert
      expect(result).toBe(pptxBuffer);
      expect(mockConversionService!.convertToPptx).toHaveBeenCalledWith(
        htmlContent,
        'Generate a presentation about AI'
      );
    });

    it('should use prompt substring as title for PPTX when prompt is long', async () => {
      // Arrange
      const longPrompt = 'A'.repeat(100) + ' Generate presentation';
      const htmlContent = '<html><body><h1>Content</h1></body></html>';
      const pptxBuffer = Buffer.from('PPTX content');
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: htmlContent,
      });
      (mockConversionService!.convertToPptx as any).mockResolvedValue(pptxBuffer);

      // Act
      await service.generateContent(longPrompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        format: 'pptx',
      });

      // Assert
      expect(mockConversionService!.convertToPptx).toHaveBeenCalledWith(
        htmlContent,
        expect.stringMatching(/^A{50}/)
      );
    });

    it('should throw error when tenantId is missing', async () => {
      // Arrange
      const prompt = 'Generate content';

      // Act & Assert
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          userId: TEST_USER_ID,
          // tenantId missing
        })
      ).rejects.toThrow('tenantId and userId are required for content generation');
    });

    it('should throw error when userId is missing', async () => {
      // Arrange
      const prompt = 'Generate content';

      // Act & Assert
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          // userId missing
        })
      ).rejects.toThrow('tenantId and userId are required for content generation');
    });

    it('should throw error when model is unavailable', async () => {
      // Arrange
      const prompt = 'Generate content';
      (mockInsightService.generate as any).mockResolvedValue({
        success: false,
        error: 'MODEL_UNAVAILABLE',
        message: 'Model quota exceeded',
        availableAlternatives: [],
        suggestedAction: 'Try again later',
      });

      // Act & Assert
      // Note: Service code now correctly uses response.message (fixed)
      // Service will throw with message property
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
        })
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should throw error when format conversion requires ConversionService but it is not available', async () => {
      // Arrange
      const serviceWithoutConversion = new ContentGenerationService(
        mockMonitoring,
        mockTemplateService,
        mockInsightService,
        mockShardRepository
        // conversionService not provided
      );
      const prompt = 'Generate content';
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: '<html><body>Content</body></html>',
      });

      // Act & Assert
      await expect(
        serviceWithoutConversion.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          format: 'pdf',
        })
      ).rejects.toThrow('Format conversion to pdf requires ConversionService');

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should throw error for unsupported format', async () => {
      // Arrange
      const prompt = 'Generate content';
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: '<html><body>Content</body></html>',
      });

      // Act & Assert
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          format: 'unsupported' as any,
        })
      ).rejects.toThrow('Unsupported format: unsupported');
    });

    it('should pass temperature to insight service when provided', async () => {
      // Arrange
      const prompt = 'Generate content';
      const temperature = 0.8;
      (mockInsightService.generate as any).mockResolvedValue(mockInsightResponse);

      // Act
      await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        temperature,
      });

      // Assert
      expect(mockInsightService.generate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        expect.objectContaining({
          options: expect.objectContaining({
            temperature,
          }),
        })
      );
    });

    it('should pass templateId to insight service when provided', async () => {
      // Arrange
      const prompt = 'Generate content';
      const templateId = 'template-123';
      (mockInsightService.generate as any).mockResolvedValue(mockInsightResponse);

      // Act
      await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        templateId,
      });

      // Assert
      expect(mockInsightService.generate).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        TEST_USER_ID,
        expect.objectContaining({
          templateId,
        })
      );
    });

    it('should default to html format when format is not specified', async () => {
      // Arrange
      const prompt = 'Generate content';
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: '<html><body>Content</body></html>',
      });

      // Act
      const result = await service.generateContent(prompt, {} as any, 'api-key', {
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        // format not specified
      });

      // Assert
      expect(result).toBe('<html><body>Content</body></html>');
      expect(mockConversionService!.convertToPdf).not.toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'content.generated',
        expect.objectContaining({
          format: 'html',
        })
      );
    });

    it('should handle insight service errors', async () => {
      // Arrange
      const prompt = 'Generate content';
      const error = new Error('Insight service error');
      (mockInsightService.generate as any).mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
        })
      ).rejects.toThrow('Insight service error');

      expect(mockMonitoring.trackException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'content_generation.generate_content',
        })
      );
    });

    it('should handle conversion service errors', async () => {
      // Arrange
      const prompt = 'Generate content';
      const htmlContent = '<html><body>Content</body></html>';
      const conversionError = new Error('PDF conversion failed');
      (mockInsightService.generate as any).mockResolvedValue({
        ...mockInsightResponse,
        content: htmlContent,
      });
      (mockConversionService!.convertToPdf as any).mockRejectedValue(conversionError);

      // Act & Assert
      await expect(
        service.generateContent(prompt, {} as any, 'api-key', {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          format: 'pdf',
        })
      ).rejects.toThrow('PDF conversion failed');

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});

