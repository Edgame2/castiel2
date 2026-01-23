/**
 * Code Generation Service
 * Handles code generation job execution
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { GenerationTemplateService } from './GenerationTemplateService';
import {
  CodeGenerationJob,
  CreateGenerationJobInput,
  UpdateGenerationJobInput,
  GenerationType,
  GenerationStatus,
} from '../types/generation.types';

export class CodeGenerationService {
  private containerName = 'codegen_jobs';
  private templateService: GenerationTemplateService;

  constructor(templateService: GenerationTemplateService) {
    this.templateService = templateService;
  }

  /**
   * Create generation job
   */
  async create(input: CreateGenerationJobInput): Promise<CodeGenerationJob> {
    if (!input.tenantId || !input.type || !input.input) {
      throw new BadRequestError('tenantId, type, and input are required');
    }

    // Verify template exists if provided
    if (input.templateId) {
      await this.templateService.getById(input.templateId, input.tenantId);
    }

    const job: CodeGenerationJob = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: GenerationStatus.PENDING,
      templateId: input.templateId,
      input: input.input,
      metadata: input.metadata,
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(job, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create code generation job');
      }

      // Start generation (async)
      this.executeGeneration(resource as CodeGenerationJob, input.tenantId).catch(
        (error) => {
          console.error('Code generation execution failed:', error);
        }
      );

      return resource as CodeGenerationJob;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Code generation job with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Execute generation (async)
   * Note: This is a placeholder - actual generation would call AI Service
   */
  private async executeGeneration(
    job: CodeGenerationJob,
    tenantId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to generating
      await this.updateStatus(job.id, tenantId, GenerationStatus.GENERATING, {
        startedAt: new Date(),
      });

      // Get template if provided
      let template = null;
      if (job.templateId) {
        template = await this.templateService.getById(job.templateId, tenantId);
      }

      // Placeholder: In a real implementation, this would:
      // 1. Load template or use default
      // 2. Assemble context from input.context
      // 3. Call AI Service with prompt
      // 4. Generate code based on type
      // 5. Validate generated code
      // 6. Save output

      // Simulate generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const output = this.generatePlaceholderOutput(job.type, job.input);

      const duration = Date.now() - startTime;

      // Update job with results
      await this.updateStatus(job.id, tenantId, GenerationStatus.COMPLETED, {
        output,
        validation: {
          passed: true,
          errors: [],
          warnings: [],
        },
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      await this.updateStatus(job.id, tenantId, GenerationStatus.FAILED, {
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Generate placeholder output
   */
  private generatePlaceholderOutput(
    type: GenerationType,
    input: CodeGenerationJob['input']
  ): CodeGenerationJob['output'] {
    switch (type) {
      case GenerationType.UI_COMPONENT:
        return {
          files: [
            {
              path: 'components/GeneratedComponent.tsx',
              content: '// Generated UI component\n' + (input.specification || ''),
              language: 'typescript',
              format: 'code' as any,
            },
          ],
        };
      case GenerationType.API_ENDPOINT:
        return {
          files: [
            {
              path: 'routes/api/generated.ts',
              content: '// Generated API endpoint\n' + (input.specification || ''),
              language: 'typescript',
              format: 'code' as any,
            },
          ],
        };
      case GenerationType.DATABASE_SCHEMA:
        return {
          files: [
            {
              path: 'schema/generated.prisma',
              content: '// Generated database schema\n' + (input.specification || ''),
              language: 'prisma',
              format: 'code' as any,
            },
          ],
        };
      case GenerationType.TEST_DATA:
        return {
          artifacts: [
            {
              type: 'test_data',
              name: 'generated_test_data.json',
              content: JSON.stringify({ data: 'generated' }, null, 2),
              format: 'json' as any,
            },
          ],
        };
      case GenerationType.CONFIGURATION:
        return {
          files: [
            {
              path: 'config/generated.yaml',
              content: '# Generated configuration\n' + (input.specification || ''),
              language: 'yaml',
              format: 'yaml' as any,
            },
          ],
        };
      default:
        return {
          files: [
            {
              path: 'generated.txt',
              content: '// Generated code\n' + (input.specification || ''),
              format: 'code' as any,
            },
          ],
        };
    }
  }

  /**
   * Update job status
   */
  async updateStatus(
    jobId: string,
    tenantId: string,
    status: GenerationStatus,
    updates?: {
      output?: CodeGenerationJob['output'];
      validation?: CodeGenerationJob['validation'];
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }
  ): Promise<CodeGenerationJob> {
    const existing = await this.getById(jobId, tenantId);

    const updated: CodeGenerationJob = {
      ...existing,
      status,
      ...updates,
      output: updates?.output || existing.output,
      validation: updates?.validation || existing.validation,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(jobId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update code generation job');
      }

      return resource as CodeGenerationJob;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Code generation job ${jobId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getById(jobId: string, tenantId: string): Promise<CodeGenerationJob> {
    if (!jobId || !tenantId) {
      throw new BadRequestError('jobId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(jobId, tenantId).read<CodeGenerationJob>();

      if (!resource) {
        throw new NotFoundError(`Code generation job ${jobId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Code generation job ${jobId} not found`);
      }
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancel(jobId: string, tenantId: string): Promise<CodeGenerationJob> {
    return this.updateStatus(jobId, tenantId, GenerationStatus.CANCELLED);
  }

  /**
   * List jobs
   */
  async list(
    tenantId: string,
    filters?: {
      type?: GenerationType;
      status?: GenerationStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: CodeGenerationJob[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<CodeGenerationJob>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list code generation jobs: ${error.message}`);
    }
  }
}

