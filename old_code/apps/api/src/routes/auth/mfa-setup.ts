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

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { MFAController } from '../../controllers/mfa.controller.js';
import type { MFAPolicyService } from '../../services/auth/mfa-policy.service.js';
import { getUser } from '../../middleware/authenticate.js';
import QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

export async function mfaSetupRoutes(
  server: FastifyInstance,
  mfaController: MFAController,
  mfaPolicyService?: MFAPolicyService
) {
  /**
   * GET /api/v1/auth/mfa/setup/totp
   * 
   * Generate TOTP secret and QR code for authenticator app setup
   * Note: Uses existing authentication middleware from server
   */
  server.get(
    '/api/v1/auth/mfa/setup/totp',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Check if TOTP is allowed by tenant policy
        if (mfaPolicyService) {
          const allowed = await mfaPolicyService.isMethodAllowed(
            user.tenantId,
            'totp'
          );

          if (!allowed) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'TOTP authentication is not allowed by your organization',
            });
          }
        }

        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
          name: `Castiel (${user.email})`,
          issuer: 'Castiel',
          length: 32,
        });

        // Generate QR code data URL
        const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url || '');

        // Store secret temporarily (will be confirmed after verification)
        await mfaController.initiateTOTPSetup(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'TOTP setup initiated'
        );

        return reply.send({
          secret: secret.base32,
          qrCode: qrCodeDataURL,
          manualEntryKey: secret.base32,
          message: 'Scan the QR code with your authenticator app, then verify with a code',
        });
      } catch (error: any) {
        server.log.error({ error }, 'TOTP setup failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate TOTP setup',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/setup/totp/verify
   * 
   * Verify TOTP code and enable TOTP for user
   */
  server.post(
    '/api/v1/auth/mfa/setup/totp/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        const { code } = request.body as { code: string };

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        if (!code || code.length !== 6) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Valid 6-digit code required',
          });
        }

        // Verify TOTP code and enable method
        const result = await mfaController.completeTOTPSetup(
          user.id,
          user.tenantId,
          code
        );

        if (!result.success) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid verification code',
          });
        }

        // Generate backup codes
        const backupCodes = await mfaController.generateBackupCodes(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'TOTP setup completed successfully'
        );

        return reply.send({
          success: true,
          message: 'TOTP authentication enabled successfully',
          backupCodes,
          backupCodesMessage:
            'Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app.',
        });
      } catch (error: any) {
        server.log.error({ error }, 'TOTP verification failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to verify TOTP code',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/setup/sms
   * 
   * Setup SMS-based MFA with phone number
   */
  server.post(
    '/api/v1/auth/mfa/setup/sms',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        const { phoneNumber } = request.body as { phoneNumber: string };

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        if (!phoneNumber || !phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Valid phone number in E.164 format required (e.g., +12025551234)',
          });
        }

        // Check if SMS is allowed by tenant policy
        if (mfaPolicyService) {
          const allowed = await mfaPolicyService.isMethodAllowed(
            user.tenantId,
            'sms'
          );

          if (!allowed) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'SMS authentication is not allowed by your organization',
            });
          }
        }

        // Initiate SMS verification
        await mfaController.initiateSMSSetup(
          user.id,
          user.tenantId,
          phoneNumber
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId, phoneNumber: phoneNumber.substring(0, 5) + '***' },
          'SMS setup initiated'
        );

        return reply.send({
          success: true,
          message: 'Verification code sent to your phone number',
          expiresIn: 300, // 5 minutes
        });
      } catch (error: any) {
        server.log.error({ error }, 'SMS setup failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to setup SMS authentication',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/setup/sms/verify
   * 
   * Verify SMS code and enable SMS-based MFA
   */
  server.post(
    '/api/v1/auth/mfa/setup/sms/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        const { code } = request.body as { code: string };

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        if (!code || code.length !== 6) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Valid 6-digit code required',
          });
        }

        // Verify SMS code
        const result = await mfaController.completeSMSSetup(
          user.id,
          user.tenantId,
          code
        );

        if (!result.success) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid or expired verification code',
          });
        }

        // Generate backup codes
        const backupCodes = await mfaController.generateBackupCodes(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'SMS MFA setup completed successfully'
        );

        return reply.send({
          success: true,
          message: 'SMS authentication enabled successfully',
          backupCodes,
        });
      } catch (error: any) {
        server.log.error({ error }, 'SMS verification failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to verify SMS code',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/setup/email
   * 
   * Setup email-based MFA
   */
  server.post(
    '/api/v1/auth/mfa/setup/email',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Check if email is allowed by tenant policy
        if (mfaPolicyService) {
          const allowed = await mfaPolicyService.isMethodAllowed(
            user.tenantId,
            'email'
          );

          if (!allowed) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Email authentication is not allowed by your organization',
            });
          }
        }

        // Initiate email verification
        await mfaController.initiateEmailSetup(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'Email MFA setup initiated'
        );

        return reply.send({
          success: true,
          message: 'Verification code sent to your email address',
          expiresIn: 300, // 5 minutes
        });
      } catch (error: any) {
        server.log.error({ error }, 'Email setup failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to setup email authentication',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/setup/email/verify
   * 
   * Verify email code and enable email-based MFA
   */
  server.post(
    '/api/v1/auth/mfa/setup/email/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        const { code } = request.body as { code: string };

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        if (!code || code.length !== 6) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Valid 6-digit code required',
          });
        }

        // Verify email code
        const result = await mfaController.completeEmailSetup(
          user.id,
          user.tenantId,
          code
        );

        if (!result.success) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid or expired verification code',
          });
        }

        // Generate backup codes
        const backupCodes = await mfaController.generateBackupCodes(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'Email MFA setup completed successfully'
        );

        return reply.send({
          success: true,
          message: 'Email authentication enabled successfully',
          backupCodes,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Email verification failed');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to verify email code',
        });
      }
    }
  );

  /**
   * GET /api/v1/auth/mfa/methods
   * 
   * Get user's active MFA methods
   */
  server.get(
    '/api/v1/auth/mfa/methods',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        const methods = await mfaController.getUserMFAMethods(
          user.id,
          user.tenantId
        );

        return reply.send({
          methods,
          hasAnyMethod: methods.length > 0,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get MFA methods');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve MFA methods',
        });
      }
    }
  );

  /**
   * DELETE /api/v1/auth/mfa/methods/:methodId
   * 
   * Remove an MFA method
   */
  server.delete(
    '/api/v1/auth/mfa/methods/:methodId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        const { methodId } = request.params as { methodId: string };

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Check if removal would leave user without MFA when required
        if (mfaPolicyService) {
          const policyEval = await mfaPolicyService.evaluatePolicyForUser(
            user.id,
            user.tenantId
          );

          const methods = await mfaController.getUserMFAMethods(
            user.id,
            user.tenantId
          );

          if (
            policyEval.isRequired &&
            !policyEval.isInGracePeriod &&
            methods.length <= 1
          ) {
            return reply.status(403).send({
              error: 'Forbidden',
              message:
                'Cannot remove last MFA method when MFA is required by your organization',
            });
          }
        }

        // Remove method
        const result = await mfaController.removeMFAMethod(
          user.id,
          user.tenantId,
          methodId
        );

        if (!result.success) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'MFA method not found',
          });
        }

        server.log.info(
          { userId: user.id, tenantId: user.tenantId, methodId },
          'MFA method removed'
        );

        return reply.send({
          success: true,
          message: 'MFA method removed successfully',
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to remove MFA method');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to remove MFA method',
        });
      }
    }
  );

  /**
   * POST /api/v1/auth/mfa/backup-codes/regenerate
   * 
   * Regenerate backup codes
   */
  server.post(
    '/api/v1/auth/mfa/backup-codes/regenerate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);

        if (!user || !user.id) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Generate new backup codes (invalidates old ones)
        const backupCodes = await mfaController.regenerateBackupCodes(
          user.id,
          user.tenantId
        );

        server.log.info(
          { userId: user.id, tenantId: user.tenantId },
          'Backup codes regenerated'
        );

        return reply.send({
          success: true,
          backupCodes,
          message:
            'New backup codes generated. Save these in a safe place - your old codes are no longer valid.',
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to regenerate backup codes');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to regenerate backup codes',
        });
      }
    }
  );
}

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
