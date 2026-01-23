/**
 * User Onboarding Types
 * 
 * Defines types for user onboarding flow including:
 * - Onboarding progress tracking
 * - Checklist items
 * - Guided tour state
 * - Feature discovery
 */

export interface OnboardingProgress {
  userId: string;
  tenantId: string;
  
  // Overall progress
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  
  // Checklist items
  checklist: OnboardingChecklistItem[];
  
  // Guided tour state
  tourState: TourState;
  
  // Feature discovery
  discoveredFeatures: string[];
  lastFeatureDiscovery?: Date;
  
  // Progress metrics
  progressPercentage: number;
  completedSteps: number;
  totalSteps: number;
  
  // Metadata
  metadata?: Record<string, any>;
  updatedAt: Date;
  createdAt: Date;
}

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description?: string;
  category: 'account' | 'profile' | 'integration' | 'feature' | 'tutorial';
  completed: boolean;
  completedAt?: Date;
  skipped: boolean;
  skippedAt?: Date;
  order: number;
  required: boolean; // If true, must be completed to finish onboarding
  actionUrl?: string; // URL to complete this step
  icon?: string;
}

export interface TourState {
  currentStep?: number;
  completedSteps: number[];
  skipped: boolean;
  skippedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  tourVersion: string; // Track tour version for updates
}

export interface FeatureDiscovery {
  featureId: string;
  featureName: string;
  category: string;
  discoveredAt: Date;
  interacted: boolean; // Whether user interacted with the feature
  interactedAt?: Date;
}

export interface OnboardingConfig {
  // Checklist configuration
  checklistItems: Omit<OnboardingChecklistItem, 'completed' | 'completedAt' | 'skipped' | 'skippedAt'>[];
  
  // Tour configuration
  tourEnabled: boolean;
  tourVersion: string;
  
  // Feature discovery
  featureDiscoveryEnabled: boolean;
  featuresToDiscover: Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
  }>;
  
  // Completion requirements
  requiredSteps: string[]; // IDs of required checklist items
  completionThreshold: number; // Percentage of steps needed (0-100)
}

export interface OnboardingUpdateRequest {
  checklistItemId?: string;
  markCompleted?: boolean;
  markSkipped?: boolean;
  tourStep?: number;
  tourCompleted?: boolean;
  tourSkipped?: boolean;
  discoveredFeature?: string;
  metadata?: Record<string, any>;
}

export interface OnboardingStats {
  totalUsers: number;
  completedUsers: number;
  inProgressUsers: number;
  skippedUsers: number;
  averageCompletionTime: number; // in hours
  mostSkippedSteps: Array<{
    stepId: string;
    stepTitle: string;
    skipCount: number;
  }>;
  completionRate: number; // percentage
}

