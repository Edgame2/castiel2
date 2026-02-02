/**
 * Meeting Analysis Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingAnalysisService } from '../../../src/services/MeetingAnalysisService';
import type { ServiceClient } from '@coder/shared';

describe('MeetingAnalysisService', () => {
  let serviceWithAi: MeetingAnalysisService;
  let serviceWithoutAi: MeetingAnalysisService;
  let mockAiService: ServiceClient;

  beforeEach(() => {
    mockAiService = {
      post: vi.fn(),
      get: vi.fn(),
    } as unknown as ServiceClient;
    serviceWithAi = new MeetingAnalysisService(mockAiService);
    serviceWithoutAi = new MeetingAnalysisService(null);
  });

  describe('constructor', () => {
    it('should accept aiService or null', () => {
      expect(new MeetingAnalysisService(null)).toBeInstanceOf(MeetingAnalysisService);
      expect(new MeetingAnalysisService(mockAiService)).toBeInstanceOf(MeetingAnalysisService);
    });
  });

  describe('analyzeMeeting', () => {
    const tenantId = 'tenant-1';
    const transcript = 'Hello, we discussed pricing and timeline. Any questions?';
    const segments = [
      { speaker: 'Alice', startTime: 0, endTime: 5, text: 'Hello' },
      { speaker: 'Bob', startTime: 5, endTime: 15, text: 'We discussed pricing and timeline. Any questions?' },
    ];
    const participants = [{ name: 'Alice', email: 'alice@test.com' }, { name: 'Bob' }];

    it('should return basic analysis when aiService is null', async () => {
      const result = await serviceWithoutAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(result.meetingType).toBe('internal');
      expect(result.engagementMetrics).toBeDefined();
      expect(result.engagementMetrics?.questionCount).toBe(1);
      expect(result.topics).toContain('pricing');
      expect(result.topics).toContain('timeline');
    });

    it('should return basic analysis when aiService throws', async () => {
      vi.mocked(mockAiService.post).mockRejectedValue(new Error('AI unavailable'));
      const result = await serviceWithAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(result.meetingType).toBe('internal');
      expect(result.engagementMetrics).toBeDefined();
    });

    it('should return validated result when AI returns valid JSON', async () => {
      const aiResult = {
        meetingType: 'demo',
        topics: ['product'],
        keyMoments: [],
        actionItems: [],
        objections: [],
        commitments: [],
        engagementMetrics: { score: 80 },
      };
      vi.mocked(mockAiService.post).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(aiResult) } }],
      } as any);
      const result = await serviceWithAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(result.meetingType).toBe('demo');
      expect(result.topics).toEqual(['product']);
      expect(result.engagementMetrics?.score).toBe(80);
    });

    it('should fall back to basic analysis when AI response is invalid JSON', async () => {
      vi.mocked(mockAiService.post).mockResolvedValue({
        choices: [{ message: { content: 'not valid json' } }],
      } as any);
      const result = await serviceWithAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(result.meetingType).toBe('internal');
      expect(result.engagementMetrics).toBeDefined();
    });

    it('should fall back to basic analysis when AI returns empty content', async () => {
      vi.mocked(mockAiService.post).mockResolvedValue({
        choices: [{ message: { content: '' } }],
      } as any);
      const result = await serviceWithAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(result.meetingType).toBe('internal');
    });

    it('should call AI with tenant header', async () => {
      vi.mocked(mockAiService.post).mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      } as any);
      await serviceWithAi.analyzeMeeting(tenantId, transcript, segments, participants);
      expect(mockAiService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ headers: { 'X-Tenant-ID': tenantId } })
      );
    });
  });
});
