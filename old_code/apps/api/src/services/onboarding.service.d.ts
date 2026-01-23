/**
 * User Onboarding Service
 *
 * Manages user onboarding flow including:
 * - Progress tracking
 * - Checklist management
 * - Guided tour state
 * - Feature discovery
 * - Welcome emails
 */
import { Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { OnboardingProgress, OnboardingConfig, OnboardingUpdateRequest, OnboardingStats } from '../types/onboarding.types.js';
import { UnifiedEmailService } from './email/index.js';
import type { User } from '../types/user.types.js';
export declare class OnboardingService {
    private readonly emailService;
    private readonly monitoring;
    private container;
    private defaultConfig;
    constructor(database: Database, emailService: UnifiedEmailService, monitoring: IMonitoringProvider, customConfig?: Partial<OnboardingConfig>);
    /**
     * Initialize onboarding for a new user
     */
    initializeOnboarding(userId: string, tenantId: string, user: User): Promise<OnboardingProgress>;
    /**
     * Get onboarding progress for a user
     */
    getOnboardingProgress(userId: string, tenantId: string): Promise<OnboardingProgress | null>;
    /**
     * Update onboarding progress
     */
    updateOnboardingProgress(userId: string, tenantId: string, update: OnboardingUpdateRequest): Promise<OnboardingProgress>;
    /**
     * Skip onboarding
     */
    skipOnboarding(userId: string, tenantId: string): Promise<OnboardingProgress>;
    /**
     * Get onboarding statistics (admin)
     */
    getOnboardingStats(tenantId: string): Promise<OnboardingStats>;
    /**
     * Send enhanced welcome email
     */
    private sendWelcomeEmail;
    /**
     * Calculate progress percentage
     */
    private calculateProgress;
    /**
     * Save onboarding progress to Cosmos DB
     */
    private saveOnboardingProgress;
}
//# sourceMappingURL=onboarding.service.d.ts.map