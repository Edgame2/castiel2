/**
 * Meeting Analysis Service
 * Performs content analysis on meeting transcripts using AI service
 * @module integration-processors/services
 */

import { ServiceClient } from '@coder/shared';

export interface MeetingAnalysisResult {
  meetingType?: 'discovery' | 'demo' | 'negotiation' | 'follow_up' | 'closing' | 'internal';
  topics?: string[];
  keyMoments?: Array<{
    timestamp: number;
    type: 'action_item' | 'objection' | 'commitment' | 'question' | 'pricing_discussion';
    text: string;
    speaker: string;
    importance: 'low' | 'medium' | 'high';
  }>;
  actionItems?: Array<{
    text: string;
    assignee?: string;
    assigneeEmail?: string;
    assigneeContactId?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    source: 'transcript' | 'notes' | 'manual';
  }>;
  objections?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    type?: 'price' | 'timing' | 'features' | 'competition' | 'other';
    resolved?: boolean;
  }>;
  commitments?: Array<{
    text: string;
    speaker: string;
    timestamp: number;
    confidence?: number;
  }>;
  engagementMetrics?: {
    score?: number; // 0-100
    talkTimeRatio?: number;
    questionCount?: number;
    monologueCount?: number;
    interruptionCount?: number;
    silenceDuration?: number; // seconds
  };
}

/**
 * Meeting Analysis Service
 * Analyzes meeting transcripts using AI service
 */
export class MeetingAnalysisService {
  constructor(private aiService: ServiceClient | null) {}

  /**
   * Analyze meeting transcript
   */
  async analyzeMeeting(
    tenantId: string,
    transcript: string,
    segments: Array<{ speaker: string; startTime: number; endTime: number; text: string }>,
    participants: Array<{ name: string; email?: string }>
  ): Promise<MeetingAnalysisResult> {
    if (!this.aiService) {
      // Return basic analysis without AI
      return this.basicAnalysis(transcript, segments, participants);
    }

    try {
      // Prepare prompt for AI analysis
      const prompt = this.buildAnalysisPrompt(transcript, segments, participants);

      // Call AI service for completion
      const response = await this.aiService.post<{ choices: Array<{ message: { content: string } }> }>(
        '/api/v1/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert sales meeting analyst. Analyze meeting transcripts and extract key insights, action items, objections, commitments, and engagement metrics. Return structured JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          maxTokens: 2000,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Parse AI response
      const content = response.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return this.validateAnalysisResult(parsed);
        } catch (parseError) {
          // If JSON parsing fails, fall back to basic analysis
          return this.basicAnalysis(transcript, segments, participants);
        }
      }

      return this.basicAnalysis(transcript, segments, participants);
    } catch (error: any) {
      // If AI service fails, fall back to basic analysis
      return this.basicAnalysis(transcript, segments, participants);
    }
  }

  /**
   * Build analysis prompt for AI service
   */
  private buildAnalysisPrompt(
    transcript: string,
    segments: Array<{ speaker: string; startTime: number; endTime: number; text: string }>,
    participants: Array<{ name: string; email?: string }>
  ): string {
    const participantsList = participants.map((p) => p.name).join(', ');

    return `Analyze the following meeting transcript and provide structured JSON output:

Participants: ${participantsList}

Transcript:
${transcript}

Please provide JSON with the following structure:
{
  "meetingType": "discovery" | "demo" | "negotiation" | "follow_up" | "closing" | "internal",
  "topics": ["topic1", "topic2"],
  "keyMoments": [
    {
      "timestamp": 120,
      "type": "action_item" | "objection" | "commitment" | "question" | "pricing_discussion",
      "text": "extracted text",
      "speaker": "speaker name",
      "importance": "low" | "medium" | "high"
    }
  ],
  "actionItems": [
    {
      "text": "action item text",
      "assignee": "name",
      "priority": "low" | "medium" | "high",
      "completed": false
    }
  ],
  "objections": [
    {
      "text": "objection text",
      "speaker": "speaker name",
      "timestamp": 120,
      "type": "price" | "timing" | "features" | "competition" | "other",
      "resolved": false
    }
  ],
  "commitments": [
    {
      "text": "commitment text",
      "speaker": "speaker name",
      "timestamp": 120,
      "confidence": 0.8
    }
  ],
  "engagementMetrics": {
    "score": 75,
    "talkTimeRatio": 0.6,
    "questionCount": 5,
    "monologueCount": 2,
    "interruptionCount": 1,
    "silenceDuration": 30
  }
}`;
  }

  /**
   * Basic analysis without AI (fallback)
   */
  private basicAnalysis(
    transcript: string,
    segments: Array<{ speaker: string; startTime: number; endTime: number; text: string }>,
    participants: Array<{ name: string; email?: string }>
  ): MeetingAnalysisResult {
    // Calculate basic engagement metrics
    const totalDuration = segments.length > 0 ? Math.max(...segments.map((s) => s.endTime)) : 0;
    const questionCount = (transcript.match(/\?/g) || []).length;
    const talkTimeBySpeaker: Record<string, number> = {};

    segments.forEach((seg) => {
      const duration = seg.endTime - seg.startTime;
      talkTimeBySpeaker[seg.speaker] = (talkTimeBySpeaker[seg.speaker] || 0) + duration;
    });

    const totalTalkTime = Object.values(talkTimeBySpeaker).reduce((sum, time) => sum + time, 0);
    const maxTalkTime = Math.max(...Object.values(talkTimeBySpeaker), 0);
    const talkTimeRatio = totalTalkTime > 0 ? maxTalkTime / totalTalkTime : 0;

    // Extract basic topics (simple keyword matching)
    const topicKeywords = ['pricing', 'features', 'timeline', 'budget', 'decision', 'demo', 'trial', 'contract'];
    const topics = topicKeywords.filter((keyword) => transcript.toLowerCase().includes(keyword));

    return {
      meetingType: 'internal', // Default
      topics: topics.length > 0 ? topics : undefined,
      engagementMetrics: {
        score: Math.round((questionCount * 10 + talkTimeRatio * 50) / 2), // Simple scoring
        talkTimeRatio,
        questionCount,
        monologueCount: 0,
        interruptionCount: 0,
        silenceDuration: Math.max(0, totalDuration - totalTalkTime),
      },
    };
  }

  /**
   * Validate and sanitize analysis result
   */
  private validateAnalysisResult(result: any): MeetingAnalysisResult {
    return {
      meetingType: result.meetingType,
      topics: Array.isArray(result.topics) ? result.topics : undefined,
      keyMoments: Array.isArray(result.keyMoments) ? result.keyMoments : undefined,
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : undefined,
      objections: Array.isArray(result.objections) ? result.objections : undefined,
      commitments: Array.isArray(result.commitments) ? result.commitments : undefined,
      engagementMetrics: result.engagementMetrics || undefined,
    };
  }
}
