/**
 * MFA Routes
 */
import { MFAPolicyService } from '../services/auth/mfa-policy.service.js';
import { enrollTOTPSchema, verifyTOTPSchema, enrollSMSSchema, verifySMSSchema, enrollEmailSchema, verifyEmailSchema, mfaChallengeSchema, sendMFACodeSchema, disableMFAMethodSchema, listMFAMethodsSchema, generateRecoveryCodesSchema, getMFAPolicySchema, updateMFAPolicySchema, } from '../schemas/mfa.schemas.js';
import { mfaSetupRoutes } from './auth/mfa-setup.js';
export async function registerMFARoutes(server) {
    const mfaController = server
        .mfaController;
    if (!mfaController) {
        throw new Error('MFAController not found on server instance');
    }
    server.post('/auth/mfa/enroll/totp', { schema: enrollTOTPSchema }, (request, reply) => mfaController.enrollTOTP(request, reply));
    server.post('/auth/mfa/verify/totp', { schema: verifyTOTPSchema }, (request, reply) => mfaController.verifyTOTP(request, reply));
    server.post('/auth/mfa/enroll/sms', { schema: enrollSMSSchema }, (request, reply) => mfaController.enrollSMS(request, reply));
    server.post('/auth/mfa/verify/sms', { schema: verifySMSSchema }, (request, reply) => mfaController.verifySMS(request, reply));
    server.post('/auth/mfa/enroll/email', { schema: enrollEmailSchema }, (request, reply) => mfaController.enrollEmail(request, reply));
    server.post('/auth/mfa/verify/email', { schema: verifyEmailSchema }, (request, reply) => mfaController.verifyEmail(request, reply));
    server.post('/auth/mfa/challenge', { schema: mfaChallengeSchema }, (request, reply) => mfaController.mfaChallenge(request, reply));
    // Send OTP code for SMS or Email during MFA challenge (no auth required - uses challenge token)
    server.post('/auth/mfa/send-code', { schema: sendMFACodeSchema }, (request, reply) => mfaController.sendMFACode(request, reply));
    server.get('/auth/mfa/methods', { schema: listMFAMethodsSchema }, (request, reply) => mfaController.listMFAMethods(request, reply));
    server.post('/auth/mfa/disable/:method', { schema: disableMFAMethodSchema }, (request, reply) => mfaController.disableMFAMethod(request, reply));
    server.post('/auth/mfa/recovery-codes/generate', { schema: generateRecoveryCodesSchema }, (request, reply) => mfaController.generateRecoveryCodes(request, reply));
    server.get('/tenants/:tenantId/mfa/policy', { schema: getMFAPolicySchema }, (request, reply) => mfaController.getMFAPolicy(request, reply));
    server.post('/tenants/:tenantId/mfa/policy', { schema: updateMFAPolicySchema }, (request, reply) => mfaController.updateMFAPolicy(request, reply));
    // Register Phase 3 MFA setup routes
    const tenantService = server.tenantService;
    const mfaPolicyService = tenantService ? new MFAPolicyService(tenantService, mfaController) : undefined;
    await mfaSetupRoutes(server, mfaController, mfaPolicyService);
    server.log.info('MFA routes registered');
}
//# sourceMappingURL=mfa.routes.js.map