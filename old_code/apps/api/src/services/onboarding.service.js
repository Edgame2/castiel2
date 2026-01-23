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
const ONBOARDING_CONTAINER = 'onboarding';
// Default onboarding checklist
const DEFAULT_CHECKLIST = [
    {
        id: 'verify-email',
        title: 'Verify your email address',
        description: 'Check your inbox and click the verification link',
        category: 'account',
        order: 1,
        required: true,
        icon: 'mail',
    },
    {
        id: 'complete-profile',
        title: 'Complete your profile',
        description: 'Add your name, photo, and other details',
        category: 'profile',
        order: 2,
        required: false,
        actionUrl: '/profile',
        icon: 'user',
    },
    {
        id: 'explore-dashboard',
        title: 'Explore the dashboard',
        description: 'Take a quick tour of the main features',
        category: 'tutorial',
        order: 3,
        required: false,
        actionUrl: '/dashboard',
        icon: 'dashboard',
    },
    {
        id: 'create-first-shard',
        title: 'Create your first shard',
        description: 'Create a document, note, or other content',
        category: 'feature',
        order: 4,
        required: false,
        actionUrl: '/shards/new',
        icon: 'plus',
    },
    {
        id: 'connect-integration',
        title: 'Connect an integration',
        description: 'Link your Google Workspace, Salesforce, or other tools',
        category: 'integration',
        order: 5,
        required: false,
        actionUrl: '/integrations',
        icon: 'link',
    },
    {
        id: 'try-ai-search',
        title: 'Try AI-powered search',
        description: 'Search your data using natural language',
        category: 'feature',
        order: 6,
        required: false,
        actionUrl: '/search',
        icon: 'search',
    },
];
export class OnboardingService {
    emailService;
    monitoring;
    container;
    defaultConfig;
    constructor(database, emailService, monitoring, customConfig) {
        this.emailService = emailService;
        this.monitoring = monitoring;
        this.container = database.container(ONBOARDING_CONTAINER);
        // Merge custom config with defaults
        this.defaultConfig = {
            checklistItems: customConfig?.checklistItems || DEFAULT_CHECKLIST,
            tourEnabled: customConfig?.tourEnabled ?? true,
            tourVersion: customConfig?.tourVersion || '1.0',
            featureDiscoveryEnabled: customConfig?.featureDiscoveryEnabled ?? true,
            featuresToDiscover: customConfig?.featuresToDiscover || [],
            requiredSteps: customConfig?.requiredSteps || ['verify-email'],
            completionThreshold: customConfig?.completionThreshold || 60, // 60% of steps
        };
    }
    /**
     * Initialize onboarding for a new user
     */
    async initializeOnboarding(userId, tenantId, user) {
        // Check if onboarding already exists
        const existing = await this.getOnboardingProgress(userId, tenantId);
        if (existing) {
            return existing;
        }
        // Create checklist from config
        const checklist = this.defaultConfig.checklistItems.map(item => ({
            ...item,
            completed: false,
            skipped: false,
        }));
        // Check if email is already verified
        if (user.emailVerified) {
            const verifyItem = checklist.find(item => item.id === 'verify-email');
            if (verifyItem) {
                verifyItem.completed = true;
                verifyItem.completedAt = new Date();
            }
        }
        const progress = {
            userId,
            tenantId,
            status: 'in_progress',
            startedAt: new Date(),
            checklist,
            tourState: {
                completedSteps: [],
                skipped: false,
                tourVersion: this.defaultConfig.tourVersion,
            },
            discoveredFeatures: [],
            progressPercentage: this.calculateProgress(checklist),
            completedSteps: checklist.filter(item => item.completed).length,
            totalSteps: checklist.length,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Store in Cosmos DB
        await this.saveOnboardingProgress(progress);
        // Send welcome email
        await this.sendWelcomeEmail(user);
        this.monitoring.trackEvent('onboarding.initialized', {
            userId,
            tenantId,
        });
        return progress;
    }
    /**
     * Get onboarding progress for a user
     */
    async getOnboardingProgress(userId, tenantId) {
        try {
            const { resource } = await this.container
                .item(userId, tenantId)
                .read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Update onboarding progress
     */
    async updateOnboardingProgress(userId, tenantId, update) {
        let progress = await this.getOnboardingProgress(userId, tenantId);
        if (!progress) {
            // Initialize if doesn't exist
            // Note: This requires user object, so we'll create minimal progress
            progress = {
                userId,
                tenantId,
                status: 'in_progress',
                startedAt: new Date(),
                checklist: this.defaultConfig.checklistItems.map(item => ({
                    ...item,
                    completed: false,
                    skipped: false,
                })),
                tourState: {
                    completedSteps: [],
                    skipped: false,
                    tourVersion: this.defaultConfig.tourVersion,
                },
                discoveredFeatures: [],
                progressPercentage: 0,
                completedSteps: 0,
                totalSteps: this.defaultConfig.checklistItems.length,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        // Update checklist item
        if (update.checklistItemId) {
            const item = progress.checklist.find(i => i.id === update.checklistItemId);
            if (item) {
                if (update.markCompleted) {
                    item.completed = true;
                    item.completedAt = new Date();
                    item.skipped = false;
                }
                else if (update.markSkipped) {
                    item.skipped = true;
                    item.skippedAt = new Date();
                }
            }
        }
        // Update tour state
        if (update.tourStep !== undefined) {
            if (!progress.tourState.completedSteps.includes(update.tourStep)) {
                progress.tourState.completedSteps.push(update.tourStep);
            }
            progress.tourState.currentStep = update.tourStep;
        }
        if (update.tourCompleted) {
            progress.tourState.completedAt = new Date();
        }
        if (update.tourSkipped) {
            progress.tourState.skipped = true;
            if (!progress.tourState.skippedAt) {
                progress.tourState.skippedAt = new Date();
            }
        }
        // Track feature discovery
        if (update.discoveredFeature) {
            if (!progress.discoveredFeatures.includes(update.discoveredFeature)) {
                progress.discoveredFeatures.push(update.discoveredFeature);
                progress.lastFeatureDiscovery = new Date();
            }
        }
        // Update metadata
        if (update.metadata) {
            progress.metadata = { ...progress.metadata, ...update.metadata };
        }
        // Recalculate progress
        progress.completedSteps = progress.checklist.filter(item => item.completed).length;
        progress.progressPercentage = this.calculateProgress(progress.checklist);
        // Check if onboarding is complete
        const requiredCompleted = progress.checklist
            .filter(item => item.required)
            .every(item => item.completed);
        const thresholdMet = progress.progressPercentage >= this.defaultConfig.completionThreshold;
        if (requiredCompleted && thresholdMet && progress.status === 'in_progress') {
            progress.status = 'completed';
            progress.completedAt = new Date();
            this.monitoring.trackEvent('onboarding.completed', {
                userId,
                tenantId,
                completionTime: progress.completedAt.getTime() - (progress.startedAt?.getTime() || 0),
            });
        }
        progress.updatedAt = new Date();
        // Save updated progress
        await this.saveOnboardingProgress(progress);
        return progress;
    }
    /**
     * Skip onboarding
     */
    async skipOnboarding(userId, tenantId) {
        const progress = await this.getOnboardingProgress(userId, tenantId);
        if (!progress) {
            throw new Error('Onboarding progress not found');
        }
        progress.status = 'skipped';
        progress.skippedAt = new Date();
        progress.tourState.skipped = true;
        progress.updatedAt = new Date();
        await this.saveOnboardingProgress(progress);
        this.monitoring.trackEvent('onboarding.skipped', {
            userId,
            tenantId,
        });
        return progress;
    }
    /**
     * Get onboarding statistics (admin)
     */
    async getOnboardingStats(tenantId) {
        const query = {
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
            parameters: [{ name: '@tenantId', value: tenantId }],
        };
        const { resources } = await this.container
            .items.query(query)
            .fetchAll();
        const totalUsers = resources.length;
        const completedUsers = resources.filter((r) => r.status === 'completed').length;
        const inProgressUsers = resources.filter((r) => r.status === 'in_progress').length;
        const skippedUsers = resources.filter((r) => r.status === 'skipped').length;
        // Calculate average completion time
        const completedProgresses = resources.filter((r) => r.status === 'completed' && r.startedAt && r.completedAt);
        const totalCompletionTime = completedProgresses.reduce((sum, p) => {
            if (p.startedAt && p.completedAt) {
                return sum + (p.completedAt.getTime() - p.startedAt.getTime());
            }
            return sum;
        }, 0);
        const averageCompletionTime = completedProgresses.length > 0
            ? totalCompletionTime / completedProgresses.length / (1000 * 60 * 60) // Convert to hours
            : 0;
        // Find most skipped steps
        const skippedSteps = new Map();
        resources.forEach((r) => {
            r.checklist.forEach(item => {
                if (item.skipped) {
                    const existing = skippedSteps.get(item.id) || { title: item.title, count: 0 };
                    existing.count++;
                    skippedSteps.set(item.id, existing);
                }
            });
        });
        const mostSkippedSteps = Array.from(skippedSteps.entries())
            .map(([stepId, data]) => ({ stepId, stepTitle: data.title, skipCount: data.count }))
            .sort((a, b) => b.skipCount - a.skipCount)
            .slice(0, 5);
        const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;
        return {
            totalUsers,
            completedUsers,
            inProgressUsers,
            skippedUsers,
            averageCompletionTime,
            mostSkippedSteps,
            completionRate,
        };
    }
    /**
     * Send enhanced welcome email
     */
    async sendWelcomeEmail(user) {
        const name = user.firstName || user.email.split('@')[0];
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Castiel</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Castiel, ${name}!</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're excited to have you on board! Castiel helps you organize, search, and understand your data with AI-powered insights.
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h2 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px;">Get Started</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom: 10px;">✓ Verify your email address</li>
                <li style="margin-bottom: 10px;">✓ Complete your profile</li>
                <li style="margin-bottom: 10px;">✓ Explore the dashboard</li>
                <li style="margin-bottom: 10px;">✓ Create your first shard</li>
                <li style="margin-bottom: 10px;">✓ Connect an integration</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://app.castiel.ai'}/dashboard" 
                 style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
              If you have any questions, our support team is here to help. Just reply to this email or visit our help center.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 12px; color: #95a5a6;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
        const text = `
Welcome to Castiel, ${name}!

We're excited to have you on board! Castiel helps you organize, search, and understand your data with AI-powered insights.

Get Started:
- Verify your email address
- Complete your profile
- Explore the dashboard
- Create your first shard
- Connect an integration

Visit your dashboard: ${process.env.APP_URL || 'https://app.castiel.ai'}/dashboard

If you have any questions, our support team is here to help.
    `;
        try {
            await this.emailService.send({
                to: user.email,
                subject: 'Welcome to Castiel! 🎉',
                html,
                text,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'onboarding.send-welcome-email',
                userId: user.id,
                tenantId: user.tenantId,
            });
            // Don't throw - welcome email is not critical
        }
    }
    /**
     * Calculate progress percentage
     */
    calculateProgress(checklist) {
        if (checklist.length === 0) {
            return 0;
        }
        const completed = checklist.filter(item => item.completed).length;
        return Math.round((completed / checklist.length) * 100);
    }
    /**
     * Save onboarding progress to Cosmos DB
     */
    async saveOnboardingProgress(progress) {
        await this.container.items.upsert(progress);
    }
}
//# sourceMappingURL=onboarding.service.js.map