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
import type { TenantService } from './tenant.service.js';
import type { MFAController } from '../../controllers/mfa.controller.js';
export type MFAEnforcementLevel = 'off' | 'optional' | 'required';
export type MFAMethodType = 'totp' | 'sms' | 'email' | 'backup_codes';
export interface MFAPolicy {
    enforcement: MFAEnforcementLevel;
    gracePeriodDays?: number;
    gracePeriodEndsAt?: string;
    allowedMethods: MFAMethodType[];
    enforcementStartedAt?: string;
}
export interface MFAPolicyEvaluation {
    isRequired: boolean;
    isInGracePeriod: boolean;
    gracePeriodEndsAt?: Date;
    daysRemainingInGracePeriod?: number;
    allowedMethods: MFAMethodType[];
    userHasMFA: boolean;
    userIsCompliant: boolean;
    shouldBlockLogin: boolean;
    warningMessage?: string;
}
export declare class MFAPolicyService {
    private tenantService;
    private mfaController?;
    constructor(tenantService: TenantService, mfaController?: MFAController);
    /**
     * Evaluate MFA policy for a user attempting to login
     *
     * @param userId - User ID
     * @param tenantId - Tenant ID
     * @returns Policy evaluation result with enforcement decision
     */
    evaluatePolicyForUser(userId: string, tenantId: string): Promise<MFAPolicyEvaluation>;
    /**
     * Evaluate grace period status
     *
     * @param policy - MFA policy with grace period configuration
     * @returns Grace period evaluation result
     */
    private evaluateGracePeriod;
    /**
     * Check if a specific MFA method is allowed by tenant policy
     *
     * @param tenantId - Tenant ID
     * @param method - MFA method to check
     * @returns True if method is allowed
     */
    isMethodAllowed(tenantId: string, method: MFAMethodType): Promise<boolean>;
    /**
     * Get list of allowed MFA methods for a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Array of allowed method types
     */
    getAllowedMethods(tenantId: string): Promise<MFAMethodType[]>;
    /**
     * Check if tenant requires MFA (ignoring grace period)
     *
     * @param tenantId - Tenant ID
     * @returns True if MFA is required by tenant policy
     */
    isMFARequired(tenantId: string): Promise<boolean>;
    /**
     * Get grace period information for a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Grace period details or null if not configured
     */
    getGracePeriodInfo(tenantId: string): Promise<{
        isActive: boolean;
        endsAt?: Date;
        daysRemaining?: number;
    } | null>;
    /**
     * Update tenant MFA policy
     *
     * @param tenantId - Tenant ID
     * @param updates - Policy updates to apply
     * @returns Updated policy
     */
    updatePolicy(tenantId: string, updates: Partial<MFAPolicy>): Promise<MFAPolicy>;
    /**
     * Get compliance report for all users in a tenant
     *
     * @param tenantId - Tenant ID
     * @returns Compliance statistics
     */
    getTenantComplianceReport(tenantId: string): Promise<{
        totalUsers: number;
        usersWithMFA: number;
        usersWithoutMFA: number;
        compliancePercentage: number;
        isEnforced: boolean;
        isInGracePeriod: boolean;
        gracePeriodEndsAt?: Date;
    }>;
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
//# sourceMappingURL=mfa-policy.service.d.ts.map