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
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    skippedAt?: Date;
    checklist: OnboardingChecklistItem[];
    tourState: TourState;
    discoveredFeatures: string[];
    lastFeatureDiscovery?: Date;
    progressPercentage: number;
    completedSteps: number;
    totalSteps: number;
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
    required: boolean;
    actionUrl?: string;
    icon?: string;
}
export interface TourState {
    currentStep?: number;
    completedSteps: number[];
    skipped: boolean;
    skippedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    tourVersion: string;
}
export interface FeatureDiscovery {
    featureId: string;
    featureName: string;
    category: string;
    discoveredAt: Date;
    interacted: boolean;
    interactedAt?: Date;
}
export interface OnboardingConfig {
    checklistItems: Omit<OnboardingChecklistItem, 'completed' | 'completedAt' | 'skipped' | 'skippedAt'>[];
    tourEnabled: boolean;
    tourVersion: string;
    featureDiscoveryEnabled: boolean;
    featuresToDiscover: Array<{
        id: string;
        name: string;
        category: string;
        description?: string;
    }>;
    requiredSteps: string[];
    completionThreshold: number;
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
    averageCompletionTime: number;
    mostSkippedSteps: Array<{
        stepId: string;
        stepTitle: string;
        skipCount: number;
    }>;
    completionRate: number;
}
//# sourceMappingURL=onboarding.types.d.ts.map