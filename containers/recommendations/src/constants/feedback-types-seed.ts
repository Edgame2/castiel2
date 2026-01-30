/**
 * Seed data for 25+ feedback types per RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS FR-1.2
 * Categories: action (7), relevance (6), quality (7), timing (5)
 */

import { FeedbackType } from '../types/feedback.types';

const GLOBAL_PK = 'global';
const SEED_USER = 'system';

function ft(
  name: string,
  displayName: string,
  category: FeedbackType['category'],
  sentiment: FeedbackType['sentiment'],
  order: number,
  sentimentScore: number
): Omit<FeedbackType, 'partitionKey' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    id: `feedback_type_${name}`,
    name,
    displayName,
    category,
    sentiment,
    sentimentScore,
    icon: sentiment === 'positive' ? '✓' : sentiment === 'negative' ? '✗' : '○',
    color: sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#6b7280',
    order,
    behavior: {
      createsTask: name === 'act_on_it',
      hidesRecommendation: ['ignore', 'irrelevant', 'not_actionable', 'not_applicable'].includes(name),
      suppressSimilar: false,
      requiresComment: false,
    },
    applicableToRecTypes: [],
    isActive: true,
    isDefault: true,
  };
}

export const FEEDBACK_TYPES_SEED: Omit<FeedbackType, 'partitionKey' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  // Action-based (7)
  ft('act_on_it', 'I will act on it', 'action', 'positive', 1, 0.8),
  ft('already_actioned', 'Already actioned', 'action', 'positive', 2, 0.7),
  ft('will_act_later', 'Will act later', 'action', 'neutral', 3, 0.2),
  ft('delegated', 'Delegated to someone else', 'action', 'neutral', 4, 0.1),
  ft('not_actionable', 'Not actionable', 'action', 'negative', 5, -0.6),
  ft('acting_on_alternative', 'Acting on alternative', 'action', 'neutral', 6, 0.1),
  ft('requires_approval', 'Requires manager approval', 'action', 'neutral', 7, 0),
  // Relevance-based (6)
  ft('ignore', 'Ignore', 'relevance', 'negative', 8, -0.5),
  ft('irrelevant', 'Irrelevant', 'relevance', 'negative', 9, -0.7),
  ft('not_applicable', 'Not applicable to this opportunity', 'relevance', 'negative', 10, -0.5),
  ft('wrong_context', 'Wrong context', 'relevance', 'negative', 11, -0.6),
  ft('duplicate', 'Duplicate recommendation', 'relevance', 'negative', 12, -0.5),
  ft('already_known', 'Already knew this', 'relevance', 'neutral', 13, -0.1),
  // Quality-based (7)
  ft('very_helpful', 'Very helpful', 'quality', 'positive', 14, 0.9),
  ft('somewhat_helpful', 'Somewhat helpful', 'quality', 'positive', 15, 0.5),
  ft('not_helpful', 'Not helpful', 'quality', 'negative', 16, -0.6),
  ft('too_generic', 'Too generic', 'quality', 'negative', 17, -0.4),
  ft('too_specific', 'Too specific', 'quality', 'negative', 18, -0.3),
  ft('missing_info', 'Missing critical information', 'quality', 'negative', 19, -0.5),
  ft('incorrect', 'Incorrect recommendation', 'quality', 'negative', 20, -0.8),
  // Timing-based (5)
  ft('too_early', 'Too early', 'timing', 'negative', 21, -0.4),
  ft('too_late', 'Too late', 'timing', 'negative', 22, -0.5),
  ft('perfect_timing', 'Perfect timing', 'timing', 'positive', 23, 0.7),
  ft('not_priority', 'Not a priority right now', 'timing', 'neutral', 24, -0.1),
  ft('seasonal', 'Wrong season/timing', 'timing', 'negative', 25, -0.4),
];

export function toFeedbackTypeDoc(
  seed: (typeof FEEDBACK_TYPES_SEED)[0],
  now: string
): FeedbackType & { partitionKey: string } {
  return {
    ...seed,
    partitionKey: GLOBAL_PK,
    createdAt: now,
    updatedAt: now,
    createdBy: SEED_USER,
  };
}

export const GLOBAL_FEEDBACK_CONFIG_SEED = {
  id: 'global_feedback_config',
  partitionKey: GLOBAL_PK,
  defaultLimit: 5,
  minLimit: 3,
  maxLimit: 10,
  availableTypes: FEEDBACK_TYPES_SEED.map((t) => t.id),
  defaultActiveTypes: [
    'feedback_type_act_on_it',
    'feedback_type_will_act_later',
    'feedback_type_not_applicable',
    'feedback_type_very_helpful',
    'feedback_type_ignore',
  ],
  patternDetection: {
    enabled: true,
    minSampleSize: 50,
    thresholds: { ignoreRate: 0.6, actionRate: 0.4, sentimentThreshold: 0.3 },
    autoSuppressEnabled: false,
    autoBoostEnabled: false,
    notifyOnPattern: false,
    patternReportFrequency: 'weekly' as const,
  },
  feedbackCollection: {
    requireFeedback: false,
    requireFeedbackAfterDays: 7,
    allowComments: true,
    maxCommentLength: 500,
    moderateComments: false,
    allowMultipleSelection: false,
    maxSelectionsPerFeedback: 1,
    allowFeedbackEdit: false,
    editWindowDays: 1,
    trackFeedbackHistory: false,
    allowAnonymousFeedback: false,
    anonymousForNegative: false,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: SEED_USER,
};
