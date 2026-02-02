/**
 * AssessmentService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentService } from '../../../src/services/AssessmentService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

describe('AssessmentService', () => {
  let service: AssessmentService;
  let mockAssessmentCreate: ReturnType<typeof vi.fn>;
  let mockAssessmentItemRead: ReturnType<typeof vi.fn>;
  let mockAssessmentQueryFetchNext: ReturnType<typeof vi.fn>;
  let mockResultCreate: ReturnType<typeof vi.fn>;
  let mockResultQueryFetchNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssessmentCreate = vi.fn().mockResolvedValue({ resource: { id: 'a1', tenantId: 't1', name: 'Test', questions: [] } });
    mockAssessmentItemRead = vi.fn().mockResolvedValue({ resource: null });
    mockAssessmentQueryFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    mockResultCreate = vi.fn().mockResolvedValue({ resource: { id: 'r1', tenantId: 't1', userId: 'u1', assessmentId: 'a1', score: 80, passed: true } });
    mockResultQueryFetchNext = vi.fn().mockResolvedValue({ resources: [] });

    (getContainer as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
      if (name === 'adaptive_assessments') {
        return {
          items: {
            create: mockAssessmentCreate,
            query: vi.fn(() => ({ fetchNext: () => mockAssessmentQueryFetchNext() })),
          },
          item: () => ({ read: mockAssessmentItemRead }),
        };
      }
      return {
        items: {
          create: mockResultCreate,
          query: vi.fn(() => ({ fetchNext: () => mockResultQueryFetchNext() })),
        },
      };
    });
    service = new AssessmentService();
  });

  describe('create', () => {
    it('throws BadRequestError when tenantId, name or questions missing', async () => {
      await expect(service.create('', 'u1', { name: 'A', questions: [{ id: 'q1', type: 'multiple_choice', question: 'Q', points: 1 }], passingScore: 70 }))
        .rejects.toThrow(BadRequestError);
      await expect(service.create('t1', 'u1', { name: '', questions: [{ id: 'q1', type: 'multiple_choice', question: 'Q', points: 1 }], passingScore: 70 }))
        .rejects.toThrow(BadRequestError);
      await expect(service.create('t1', 'u1', { name: 'A', questions: [], passingScore: 70 }))
        .rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when passingScore out of range', async () => {
      await expect(service.create('t1', 'u1', { name: 'A', questions: [{ id: 'q1', type: 'multiple_choice', question: 'Q', points: 1 }], passingScore: -1 }))
        .rejects.toThrow(BadRequestError);
      await expect(service.create('t1', 'u1', { name: 'A', questions: [{ id: 'q1', type: 'multiple_choice', question: 'Q', points: 1 }], passingScore: 101 }))
        .rejects.toThrow(BadRequestError);
    });

    it('creates assessment and returns resource', async () => {
      const input = {
        name: 'Quiz',
        questions: [{ id: 'q1', type: 'multiple_choice' as const, question: 'Q', points: 10, correctAnswer: 'A' }],
        passingScore: 70,
      };
      const created = { id: 'a1', tenantId: 't1', name: 'Quiz', questions: [], passingScore: 70 };
      mockAssessmentCreate.mockResolvedValue({ resource: created });
      const result = await service.create('t1', 'u1', input);
      expect(result).toEqual(created);
      expect(mockAssessmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', name: 'Quiz', passingScore: 70 }),
        expect.any(Object)
      );
    });
  });

  describe('getById', () => {
    it('throws BadRequestError when assessmentId or tenantId missing', async () => {
      await expect(service.getById('', 't1')).rejects.toThrow(BadRequestError);
      await expect(service.getById('a1', '')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when resource is null', async () => {
      mockAssessmentItemRead.mockResolvedValue({ resource: null });
      await expect(service.getById('a1', 't1')).rejects.toThrow(NotFoundError);
    });

    it('returns assessment when found', async () => {
      const doc = { id: 'a1', tenantId: 't1', name: 'A', questions: [] };
      mockAssessmentItemRead.mockResolvedValue({ resource: doc });
      const result = await service.getById('a1', 't1');
      expect(result).toEqual(doc);
    });
  });

  describe('submitResult', () => {
    it('creates result and returns resource', async () => {
      const assessment = {
        id: 'a1', tenantId: 't1', name: 'A', passingScore: 70,
        questions: [
          { id: 'q1', type: 'multiple_choice' as const, question: 'Q', points: 10, correctAnswer: 'A' },
        ],
      };
      mockAssessmentItemRead.mockResolvedValue({ resource: assessment });
      const resultDoc = { id: 'r1', tenantId: 't1', userId: 'u1', assessmentId: 'a1', score: 100, passed: true };
      mockResultCreate.mockResolvedValue({ resource: resultDoc });
      const result = await service.submitResult('t1', 'u1', 'a1', {
        answers: { q1: 'A' },
        startedAt: new Date(),
        completedAt: new Date(),
      });
      expect(result).toEqual(resultDoc);
      expect(mockResultCreate).toHaveBeenCalled();
    });
  });

  describe('getResults', () => {
    it('returns resources from query', async () => {
      const resources = [{ id: 'r1', tenantId: 't1', userId: 'u1', assessmentId: 'a1', score: 80, passed: true }];
      mockResultQueryFetchNext.mockResolvedValue({ resources });
      const result = await service.getResults('t1', 'u1');
      expect(result).toEqual(resources);
    });
  });

  describe('list', () => {
    it('throws BadRequestError when tenantId missing', async () => {
      await expect(service.list('')).rejects.toThrow(BadRequestError);
    });

    it('returns items and continuationToken', async () => {
      const items = [{ id: 'a1', tenantId: 't1', name: 'A', questions: [] }];
      mockAssessmentQueryFetchNext.mockResolvedValue({ resources: items, continuationToken: 'token' });
      const result = await service.list('t1');
      expect(result.items).toEqual(items);
      expect(result.continuationToken).toBe('token');
    });
  });
});
