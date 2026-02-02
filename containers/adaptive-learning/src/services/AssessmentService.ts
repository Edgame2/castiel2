/**
 * Assessment Service
 * Handles assessment management and results
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Assessment,
  AssessmentResult,
  AssessmentQuestion,
} from '../types/learning.types';

export class AssessmentService {
  private assessmentContainerName = 'adaptive_assessments';
  private resultContainerName = 'adaptive_assessment_results';

  /**
   * Create assessment
   */
  async create(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      skillId?: string;
      learningPathId?: string;
      questions: Array<Omit<AssessmentQuestion, 'id'> & { id?: string }>;
      passingScore: number;
      timeLimit?: number;
      attemptsAllowed?: number;
    }
  ): Promise<Assessment> {
    if (!tenantId || !input.name || !input.questions || input.questions.length === 0) {
      throw new BadRequestError('tenantId, name, and questions are required');
    }

    if (input.passingScore < 0 || input.passingScore > 100) {
      throw new BadRequestError('passingScore must be between 0 and 100');
    }

    const assessment: Assessment = {
      id: uuidv4(),
      tenantId,
      name: input.name,
      description: input.description,
      skillId: input.skillId,
      learningPathId: input.learningPathId,
      questions: input.questions.map((q) => ({ ...q, id: uuidv4() } as AssessmentQuestion)),
      passingScore: input.passingScore,
      timeLimit: input.timeLimit,
      attemptsAllowed: input.attemptsAllowed,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    try {
      const container = getContainer(this.assessmentContainerName);
      const { resource } = await container.items.create(assessment, {
        partitionKey: tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create assessment');
      }

      return resource as Assessment;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Assessment with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get assessment by ID
   */
  async getById(assessmentId: string, tenantId: string): Promise<Assessment> {
    if (!assessmentId || !tenantId) {
      throw new BadRequestError('assessmentId and tenantId are required');
    }

    try {
      const container = getContainer(this.assessmentContainerName);
      const item = (container as { item: (id: string, pk: string) => { read: () => Promise<{ resource: Assessment | undefined }> } }).item(assessmentId, tenantId);
      const { resource } = await item.read();

      if (!resource) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Assessment', assessmentId);
      }
      throw error;
    }
  }

  /**
   * Submit assessment result
   */
  async submitResult(
    tenantId: string,
    userId: string,
    assessmentId: string,
    input: {
      answers: Record<string, any>;
      startedAt: Date;
      completedAt: Date;
      timeSpent?: number;
    }
  ): Promise<AssessmentResult> {
    const assessment = await this.getById(assessmentId, tenantId);

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of assessment.questions) {
      totalPoints += question.points;
      const userAnswer = input.answers[question.id];
      const correctAnswer = question.correctAnswer;

      // Simple scoring logic (can be enhanced)
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      } else if (question.type === 'short_answer') {
        // For short answers, exact match (can be enhanced with fuzzy matching)
        if (String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()) {
          earnedPoints += question.points;
        }
      } else {
        // For code/essay, assume partial credit (would need manual grading)
        earnedPoints += question.points * 0.5; // Placeholder
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= assessment.passingScore;

    const result: AssessmentResult = {
      id: uuidv4(),
      tenantId,
      userId,
      assessmentId,
      score,
      passed,
      answers: input.answers,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      timeSpent: input.timeSpent,
    };

    try {
      const container = getContainer(this.resultContainerName);
      const { resource } = await container.items.create(result, {
        partitionKey: tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create assessment result');
      }

      return resource as AssessmentResult;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get assessment results for user
   */
  async getResults(
    tenantId: string,
    userId: string,
    assessmentId?: string
  ): Promise<AssessmentResult[]> {
    const container = getContainer(this.resultContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
    ];

    if (assessmentId) {
      query += ' AND c.assessmentId = @assessmentId';
      parameters.push({ name: '@assessmentId', value: assessmentId });
    }

    query += ' ORDER BY c.completedAt DESC';

    try {
      const { resources } = await container.items
        .query<AssessmentResult>({ query, parameters }, { partitionKey: tenantId } as Record<string, unknown>)
        .fetchNext();

      return resources;
    } catch (error: any) {
      throw new Error(`Failed to get assessment results: ${error.message}`);
    }
  }

  /**
   * List assessments
   */
  async list(
    tenantId: string,
    filters?: {
      skillId?: string;
      learningPathId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Assessment[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.assessmentContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.skillId) {
      query += ' AND c.skillId = @skillId';
      parameters.push({ name: '@skillId', value: filters.skillId });
    }

    if (filters?.learningPathId) {
      query += ' AND c.learningPathId = @learningPathId';
      parameters.push({ name: '@learningPathId', value: filters.learningPathId });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Assessment>({ query, parameters }, { partitionKey: tenantId } as Record<string, unknown>)
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list assessments: ${error.message}`);
    }
  }
}

