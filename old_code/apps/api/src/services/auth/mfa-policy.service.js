/**
 * MFA Policy Service
 *
 * Handles tenant-level MFA policy enforcement including:
 * - Policy evaluation (off/optional/required)
 * - Grace period management
 * - Allowed method validation
 * - User compliance checking
 *
 * Phase 3: MFA Flow Consistency
 */
export class MFAPolicyService {
    tenantService;
    mfaController;
    constructor(tenantService, mfaController) {
        this.tenantService = tenantService;
        this.mfaController = mfaController;
    }
    /**
     * Evaluate MFA policy for a user attempting to login
     *
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Policy evaluation result with enforcement decision
     */
    async evaluatePolicyForUser(userId, tenantId) {
        // Get tenant MFA policy
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        // Default result if no policy configured
        if (!policy) {
            return {
                isRequired: false,
                isInGracePeriod: false,
                allowedMethods: ['totp', 'sms', 'email', 'backup_codes'],
                userHasMFA: false,
                userIsCompliant: true,
                shouldBlockLogin: false,
            };
        }
        // Check if user has any MFA methods configured
        let userHasMFA = false;
        if (this.mfaController) {
            userHasMFA = await this.mfaController.userHasActiveMFA(userId, tenantId);
        }
        // Evaluate based on enforcement level
        const enforcement = policy.enforcement || 'optional';
        switch (enforcement) {
            case 'off':
                return {
                    isRequired: false,
                    isInGracePeriod: false,
                    allowedMethods: policy.allowedMethods || [],
                    userHasMFA,
                    userIsCompliant: true,
                    shouldBlockLogin: false,
                };
            case 'optional':
                return {
                    isRequired: false,
                    isInGracePeriod: false,
                    allowedMethods: policy.allowedMethods || [],
                    userHasMFA,
                    userIsCompliant: true,
                    shouldBlockLogin: false,
                };
            case 'required':
                // Check grace period
                const gracePeriodResult = this.evaluateGracePeriod(policy);
                if (gracePeriodResult.isInGracePeriod) {
                    // In grace period: Allow login but show warning
                    return {
                        isRequired: true,
                        isInGracePeriod: true,
                        gracePeriodEndsAt: gracePeriodResult.endsAt,
                        daysRemainingInGracePeriod: gracePeriodResult.daysRemaining,
                        allowedMethods: policy.allowedMethods || [],
                        userHasMFA,
                        userIsCompliant: userHasMFA,
                        shouldBlockLogin: false,
                        warningMessage: `MFA will be required in ${gracePeriodResult.daysRemaining} days. Please set up MFA to avoid being locked out.`,
                    };
                }
                // Grace period ended: Enforce MFA
                return {
                    isRequired: true,
                    isInGracePeriod: false,
                    allowedMethods: policy.allowedMethods || [],
                    userHasMFA,
                    userIsCompliant: userHasMFA,
                    shouldBlockLogin: !userHasMFA, // Block if no MFA
                };
            default:
                // Unknown enforcement level, treat as optional
                return {
                    isRequired: false,
                    isInGracePeriod: false,
                    allowedMethods: policy.allowedMethods || [],
                    userHasMFA,
                    userIsCompliant: true,
                    shouldBlockLogin: false,
                };
        }
    }
    /**
     * Evaluate grace period status
     *
     * @param policy - MFA policy with grace period configuration
     * @returns Grace period evaluation result
     */
    evaluateGracePeriod(policy) {
        // No grace period configured
        if (!policy.gracePeriodDays && !policy.gracePeriodEndsAt) {
            return { isInGracePeriod: false };
        }
        // Calculate grace period end date
        let gracePeriodEndsAt;
        if (policy.gracePeriodEndsAt) {
            // Explicit end date provided
            gracePeriodEndsAt = new Date(policy.gracePeriodEndsAt);
        }
        else if (policy.gracePeriodDays && policy.enforcementStartedAt) {
            // Calculate from enforcement start + grace period days
            const startDate = new Date(policy.enforcementStartedAt);
            gracePeriodEndsAt = new Date(startDate);
            gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + policy.gracePeriodDays);
        }
        else {
            // No valid grace period configuration
            return { isInGracePeriod: false };
        }
        // Check if still in grace period
        const now = new Date();
        if (now > gracePeriodEndsAt) {
            return { isInGracePeriod: false };
        }
        // Calculate days remaining
        const msRemaining = gracePeriodEndsAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        return {
            isInGracePeriod: true,
            endsAt: gracePeriodEndsAt,
            daysRemaining,
        };
    }
    /**
     * Check if a specific MFA method is allowed by tenant policy
     *
     * @param tenantId - Tenant ID
     * @param method - MFA method to check
     * @returns True if method is allowed
     */
    async isMethodAllowed(tenantId, method) {
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        // If no policy, all methods allowed
        if (!policy || !policy.allowedMethods) {
            return true;
        }
        return policy.allowedMethods.includes(method);
    }
    /**
     * Get list of allowed MFA methods for a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Array of allowed method types
     */
    async getAllowedMethods(tenantId) {
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        // Default to all methods if no policy
        if (!policy || !policy.allowedMethods) {
            return ['totp', 'sms', 'email', 'backup_codes'];
        }
        return policy.allowedMethods;
    }
    /**
     * Check if tenant requires MFA (ignoring grace period)
     *
     * @param tenantId - Tenant ID
     * @returns True if MFA is required by tenant policy
     */
    async isMFARequired(tenantId) {
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        return policy?.enforcement === 'required';
    }
    /**
     * Get grace period information for a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Grace period details or null if not configured
     */
    async getGracePeriodInfo(tenantId) {
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        if (!policy || policy.enforcement !== 'required') {
            return null;
        }
        return this.evaluateGracePeriod(policy);
    }
    /**
     * Update tenant MFA policy
     *
     * @param tenantId - Tenant ID
     * @param updates - Policy updates to apply
     * @returns Updated policy
     */
    async updatePolicy(tenantId, updates) {
        const tenant = await this.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        // Get existing policy or create new
        const currentPolicy = tenant.settings?.mfaPolicy || {
            enforcement: 'optional',
            allowedMethods: ['totp', 'sms', 'email', 'backup_codes'],
        };
        // Merge updates
        const updatedPolicy = {
            ...currentPolicy,
            ...updates,
        };
        // If enforcement is changing to 'required', set enforcement start date
        if (updates.enforcement === 'required' &&
            currentPolicy.enforcement !== 'required') {
            updatedPolicy.enforcementStartedAt = new Date().toISOString();
            // Calculate grace period end date if grace period specified
            if (updates.gracePeriodDays) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + updates.gracePeriodDays);
                updatedPolicy.gracePeriodEndsAt = endDate.toISOString();
            }
        }
        // Update tenant settings
        await this.tenantService.updateTenant(tenantId, {
            settings: {
                ...tenant.settings,
                mfaPolicy: updatedPolicy,
            },
        });
        return updatedPolicy;
    }
    /**
     * Get compliance report for all users in a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Compliance statistics
     */
    async getTenantComplianceReport(tenantId) {
        const tenant = await this.tenantService.getTenant(tenantId);
        const policy = tenant?.settings?.mfaPolicy;
        // Get all users for tenant (simplified - would need user service)
        // For now, return structure without actual user count
        const gracePeriodResult = policy
            ? this.evaluateGracePeriod(policy)
            : { isInGracePeriod: false };
        return {
            totalUsers: 0, // Would query from user service
            usersWithMFA: 0,
            usersWithoutMFA: 0,
            compliancePercentage: 0,
            isEnforced: policy?.enforcement === 'required',
            isInGracePeriod: gracePeriodResult.isInGracePeriod,
            gracePeriodEndsAt: gracePeriodResult.endsAt,
        };
    }
}
/**
 * Usage Examples:
 *
 * 1. Evaluate policy during login:
 *
 *    const evaluation = await mfaPolicyService.evaluatePolicyForUser(userId, tenantId);
 *
 *    if (evaluation.shouldBlockLogin) {
 *      return reply.status(403).send({
 *        error: 'MFA Required',
 *        message: 'Please set up MFA to continue',
 *        requiresMFASetup: true
 *      });
 *    }
 *
 *    if (evaluation.isInGracePeriod && !evaluation.userHasMFA) {
 *      // Show warning but allow login
 *      return reply.send({
 *        ...loginResponse,
 *        mfaWarning: evaluation.warningMessage
 *      });
 *    }
 *
 * 2. Check if method is allowed:
 *
 *    const allowed = await mfaPolicyService.isMethodAllowed(tenantId, 'totp');
 *    if (!allowed) {
 *      return reply.status(400).send({ error: 'MFA method not allowed' });
 *    }
 *
 * 3. Update policy with grace period:
 *
 *    await mfaPolicyService.updatePolicy(tenantId, {
 *      enforcement: 'required',
 *      gracePeriodDays: 30,
 *      allowedMethods: ['totp', 'sms']
 *    });
 *
 * 4. Get compliance report:
 *
 *    const report = await mfaPolicyService.getTenantComplianceReport(tenantId);
 *    // report.compliancePercentage contains the percentage of users with MFA enabled
 */
//# sourceMappingURL=mfa-policy.service.js.map