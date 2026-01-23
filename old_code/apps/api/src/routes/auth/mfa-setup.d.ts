/**
 * MFA Setup Routes
 *
 * Allows users to set up MFA methods (TOTP, SMS, email) with:
 * - QR code generation for TOTP
 * - Phone number validation for SMS
 * - Email verification for email-based codes
 * - Backup code generation
 *
 * Phase 3: MFA Flow Consistency
 */
import type { FastifyInstance } from 'fastify';
import type { MFAController } from '../../controllers/mfa.controller.js';
import type { MFAPolicyService } from '../../services/auth/mfa-policy.service.js';
export declare function mfaSetupRoutes(server: FastifyInstance, mfaController: MFAController, mfaPolicyService?: MFAPolicyService): Promise<void>;
/**
 * Usage in main server file (index.ts):
 *
 * import { mfaSetupRoutes } from './routes/auth/mfa-setup.js';
 *
 * // After MFA controller is initialized
 * if (mfaController) {
 *   await mfaSetupRoutes(server, mfaController, mfaPolicyService);
 * }
 */
//# sourceMappingURL=mfa-setup.d.ts.map