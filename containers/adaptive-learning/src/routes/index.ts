/**
 * Route Registration
 * Adaptive Learning Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { LearningPathService } from '../services/LearningPathService';
import { SkillService } from '../services/SkillService';
import { ProgressService } from '../services/ProgressService';
import { AssessmentService } from '../services/AssessmentService';
import {
  CreateLearningPathInput,
  UpdateLearningPathInput,
  CreateSkillInput,
  UpdateProgressInput,
  LearningPathStatus,
  SkillLevel,
  ProgressStatus,
} from '../types/learning.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const learningPathService = new LearningPathService();
  const skillService = new SkillService();
  const progressService = new ProgressService();
  const assessmentService = new AssessmentService();

  // ===== LEARNING PATH ROUTES =====

  /**
   * Create learning path
   * POST /api/v1/adaptive-learning/paths
   */
  app.post<{ Body: Omit<CreateLearningPathInput, 'tenantId' | 'userId'> }>(
    '/api/v1/adaptive-learning/paths',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new learning path',
        tags: ['Learning Paths'],
        body: {
          type: 'object',
          required: ['name', 'difficulty'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            category: { type: 'string' },
            skills: { type: 'array', items: { type: 'string', format: 'uuid' } },
            modules: { type: 'array', items: { type: 'object' } },
            estimatedDuration: { type: 'number' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            prerequisites: { type: 'array', items: { type: 'string', format: 'uuid' } },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Learning path created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateLearningPathInput = {
        ...request.body,
        tenantId,
        userId,
        difficulty: request.body.difficulty as any,
      };

      const path = await learningPathService.create(input);
      reply.code(201).send(path);
    }
  );

  /**
   * Get learning path by ID
   * GET /api/v1/adaptive-learning/paths/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/adaptive-learning/paths/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get learning path by ID',
        tags: ['Learning Paths'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Learning path details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const path = await learningPathService.getById(request.params.id, tenantId);
      reply.send(path);
    }
  );

  /**
   * Update learning path
   * PUT /api/v1/adaptive-learning/paths/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateLearningPathInput }>(
    '/api/v1/adaptive-learning/paths/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update learning path',
        tags: ['Learning Paths'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'completed'] },
            skills: { type: 'array', items: { type: 'string' } },
            modules: { type: 'array' },
            estimatedDuration: { type: 'number' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            prerequisites: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Learning path updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const path = await learningPathService.update(request.params.id, tenantId, request.body);
      reply.send(path);
    }
  );

  /**
   * Delete learning path
   * DELETE /api/v1/adaptive-learning/paths/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/adaptive-learning/paths/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete learning path',
        tags: ['Learning Paths'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Learning path deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await learningPathService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List learning paths
   * GET /api/v1/adaptive-learning/paths
   */
  app.get<{
    Querystring: {
      status?: string;
      category?: string;
      difficulty?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/adaptive-learning/paths',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List learning paths',
        tags: ['Learning Paths'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'completed'] },
            category: { type: 'string' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of learning paths',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await learningPathService.list(tenantId, {
        status: request.query.status as any,
        category: request.query.category,
        difficulty: request.query.difficulty,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== SKILL ROUTES =====

  /**
   * Create skill
   * POST /api/v1/adaptive-learning/skills
   */
  app.post<{ Body: Omit<CreateSkillInput, 'tenantId' | 'userId'> }>(
    '/api/v1/adaptive-learning/skills',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new skill',
        tags: ['Skills'],
        body: {
          type: 'object',
          required: ['name', 'level'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            category: { type: 'string' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            parentSkillId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Skill created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateSkillInput = {
        ...request.body,
        tenantId,
        userId,
        level: request.body.level as any,
      };

      const skill = await skillService.create(input);
      reply.code(201).send(skill);
    }
  );

  /**
   * Get skill by ID
   * GET /api/v1/adaptive-learning/skills/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/adaptive-learning/skills/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get skill by ID',
        tags: ['Skills'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Skill details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const skill = await skillService.getById(request.params.id, tenantId);
      reply.send(skill);
    }
  );

  /**
   * Update skill
   * PUT /api/v1/adaptive-learning/skills/:id
   */
  app.put<{ Params: { id: string }; Body: Partial<CreateSkillInput> }>(
    '/api/v1/adaptive-learning/skills/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update skill',
        tags: ['Skills'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            parentSkillId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Skill updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const skill = await skillService.update(request.params.id, tenantId, request.body);
      reply.send(skill);
    }
  );

  /**
   * Delete skill
   * DELETE /api/v1/adaptive-learning/skills/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/adaptive-learning/skills/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete skill',
        tags: ['Skills'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Skill deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await skillService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List skills
   * GET /api/v1/adaptive-learning/skills
   */
  app.get<{
    Querystring: {
      category?: string;
      level?: string;
      parentSkillId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/adaptive-learning/skills',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List skills',
        tags: ['Skills'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
            parentSkillId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of skills',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await skillService.list(tenantId, {
        category: request.query.category,
        level: request.query.level as any,
        parentSkillId: request.query.parentSkillId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== PROGRESS ROUTES =====

  /**
   * Get or create progress
   * POST /api/v1/adaptive-learning/progress
   */
  app.post<{
    Body: {
      learningPathId?: string;
      moduleId?: string;
      skillId?: string;
    };
  }>(
    '/api/v1/adaptive-learning/progress',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get or create user progress',
        tags: ['Progress'],
        body: {
          type: 'object',
          properties: {
            learningPathId: { type: 'string', format: 'uuid' },
            moduleId: { type: 'string', format: 'uuid' },
            skillId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'User progress',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const progress = await progressService.getOrCreate(tenantId, userId, request.body);
      reply.send(progress);
    }
  );

  /**
   * Update progress
   * PUT /api/v1/adaptive-learning/progress/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateProgressInput }>(
    '/api/v1/adaptive-learning/progress/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update user progress',
        tags: ['Progress'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'skipped'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            notes: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Progress updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const progress = await progressService.update(request.params.id, tenantId, request.body);
      reply.send(progress);
    }
  );

  /**
   * List user progress
   * GET /api/v1/adaptive-learning/progress
   */
  app.get<{
    Querystring: {
      learningPathId?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/adaptive-learning/progress',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List user progress',
        tags: ['Progress'],
        querystring: {
          type: 'object',
          properties: {
            learningPathId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'skipped'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of user progress',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const result = await progressService.list(tenantId, userId, {
        learningPathId: request.query.learningPathId,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== ASSESSMENT ROUTES =====

  /**
   * Create assessment
   * POST /api/v1/adaptive-learning/assessments
   */
  app.post<{
    Body: {
      name: string;
      description?: string;
      skillId?: string;
      learningPathId?: string;
      questions: Array<{
        type: string;
        question: string;
        options?: string[];
        correctAnswer?: any;
        points: number;
        explanation?: string;
      }>;
      passingScore: number;
      timeLimit?: number;
      attemptsAllowed?: number;
    };
  }>(
    '/api/v1/adaptive-learning/assessments',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new assessment',
        tags: ['Assessments'],
        body: {
          type: 'object',
          required: ['name', 'questions', 'passingScore'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            skillId: { type: 'string', format: 'uuid' },
            learningPathId: { type: 'string', format: 'uuid' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'question', 'points'],
                properties: {
                  type: { type: 'string', enum: ['multiple_choice', 'true_false', 'short_answer', 'code', 'essay'] },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: ['string', 'number', 'boolean'] },
                  points: { type: 'number', minimum: 1 },
                  explanation: { type: 'string' },
                },
              },
            },
            passingScore: { type: 'number', minimum: 0, maximum: 100 },
            timeLimit: { type: 'number', minimum: 1 },
            attemptsAllowed: { type: 'number', minimum: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Assessment created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const assessment = await assessmentService.create(tenantId, userId, request.body);
      reply.code(201).send(assessment);
    }
  );

  /**
   * Get assessment by ID
   * GET /api/v1/adaptive-learning/assessments/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/adaptive-learning/assessments/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get assessment by ID',
        tags: ['Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Assessment details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const assessment = await assessmentService.getById(request.params.id, tenantId);
      reply.send(assessment);
    }
  );

  /**
   * Submit assessment result
   * POST /api/v1/adaptive-learning/assessments/:id/submit
   */
  app.post<{
    Params: { id: string };
    Body: {
      answers: Record<string, any>;
      startedAt: string;
      completedAt: string;
      timeSpent?: number;
    };
  }>(
    '/api/v1/adaptive-learning/assessments/:id/submit',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Submit assessment result',
        tags: ['Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['answers', 'startedAt', 'completedAt'],
          properties: {
            answers: { type: 'object', additionalProperties: true },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            timeSpent: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Assessment result submitted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const result = await assessmentService.submitResult(tenantId, userId, request.params.id, {
        answers: request.body.answers,
        startedAt: new Date(request.body.startedAt),
        completedAt: new Date(request.body.completedAt),
        timeSpent: request.body.timeSpent,
      });
      reply.code(201).send(result);
    }
  );

  /**
   * Get assessment results
   * GET /api/v1/adaptive-learning/assessments/:id/results
   */
  app.get<{ Params: { id?: string } }>(
    '/api/v1/adaptive-learning/assessments/:id/results',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get assessment results for user',
        tags: ['Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of assessment results',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const results = await assessmentService.getResults(tenantId, userId, request.params.id);
      reply.send(results);
    }
  );

  /**
   * List assessments
   * GET /api/v1/adaptive-learning/assessments
   */
  app.get<{
    Querystring: {
      skillId?: string;
      learningPathId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/adaptive-learning/assessments',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List assessments',
        tags: ['Assessments'],
        querystring: {
          type: 'object',
          properties: {
            skillId: { type: 'string', format: 'uuid' },
            learningPathId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of assessments',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await assessmentService.list(tenantId, {
        skillId: request.query.skillId,
        learningPathId: request.query.learningPathId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}
