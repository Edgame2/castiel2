import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserService, TenantService } from '@castiel/api-core';
import type { EmailService } from '../services/auth/email.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { UserRegistrationData } from '../types/user.types.js';
import type { TenantJoinRequestService } from '../services/auth/tenant-join-request.service.js';
import { TenantStatus } from '../types/tenant.types.js';
import { UserStatus } from '../types/user.types.js';
import { SessionManagementService } from '../services/auth/session-management.service.js';
import type { MFAController } from './mfa.controller.js';
import type { MFAMethodType } from '../types/mfa.types.js';
import { validatePasswordStrength } from '../utils/password-validator.js';
import crypto from 'crypto';
import type { AuditLogService } from '@castiel/api-core';
import { AuditEventType, AuditOutcome, AuditCategory } from '../types/audit.types.js';
import type { DeviceSecurityService } from '../services/security/device-security.service.js';
import { UserRole, RolePermissions } from '@castiel/shared-types';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
import { MFAPolicyService } from '../services/auth/mfa-policy.service.js';
import { config } from '../config/env.js';

/**
 * Default tenant ID for non-multi-tenant setup (can be overridden)
 */
const DEFAULT_TENANT_ID = 'default';

/**
 * Authentication controller
 */
export class AuthController {
  private userService: UserService;
  private emailService: EmailService;
  private cacheManager: CacheManager;
  private publicApiUrl: string;
  private accessTokenExpiry: string;
  private mfaController?: MFAController;
  private tenantService: TenantService;
  private tenantJoinRequestService: TenantJoinRequestService;
  private auditLogService?: AuditLogService;
  private deviceSecurityService?: DeviceSecurityService;
  private roleManagementService?: RoleManagementService;
  private mfaPolicyService?: MFAPolicyService;

  constructor(
    userService: UserService,
    emailService: EmailService,
    cacheManager: CacheManager,
    publicApiUrl: string,
    accessTokenExpiry: string = '15m',
    tenantService: TenantService,
    tenantJoinRequestService: TenantJoinRequestService,
    mfaController?: MFAController,
    auditLogService?: AuditLogService,
    deviceSecurityService?: DeviceSecurityService,
    roleManagementService?: RoleManagementService
  ) {
    this.userService = userService;
    this.emailService = emailService;
    this.cacheManager = cacheManager;
    this.publicApiUrl = publicApiUrl;
    this.accessTokenExpiry = accessTokenExpiry;
    this.tenantService = tenantService;
    this.tenantJoinRequestService = tenantJoinRequestService;
    this.mfaController = mfaController;
    this.auditLogService = auditLogService;
    this.deviceSecurityService = deviceSecurityService;
    this.roleManagementService = roleManagementService;
    
    // Initialize MFA policy service
    if (mfaController) {
      this.mfaPolicyService = new MFAPolicyService(tenantService, mfaController);
    }
  }

  /**
   * Log authentication event
   */
  private async logAuthEvent(
    eventType: AuditEventType,
    outcome: AuditOutcome,
    tenantId: string,
    options: {
      actorId?: string;
      actorEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      message?: string;
      details?: Record<string, any>;
      errorMessage?: string;
    }
  ): Promise<void> {
    if (!this.auditLogService) {return;}

    try {
      await this.auditLogService.log({
        tenantId,
        category: AuditCategory.AUTHENTICATION,
        eventType,
        outcome,
        actorId: options.actorId,
        actorEmail: options.actorEmail,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        message: options.message || `${eventType} ${outcome}`,
        details: options.details,
        errorMessage: options.errorMessage,
      });
    } catch (error) {
      // Never let audit logging break the auth flow
      // Error is silently ignored to prevent breaking authentication
    }
  }

  private async getUserPermissions(user: any): Promise<string[]> {
    try {
      const permissions = new Set<string>();
      const userRoles = user.roles || [];

      for (const roleName of userRoles) {
        // Static
        const staticPerms = RolePermissions[roleName as UserRole];
        if (staticPerms) {
          staticPerms.forEach(p => permissions.add(p));
        }

        // Dynamic
        if (this.roleManagementService) {
          try {
            const roleDef = await this.roleManagementService.getRoleByName(user.tenantId, roleName);
            if (roleDef && roleDef.permissions) {
              roleDef.permissions.forEach((p: string) => permissions.add(p));
            }
          } catch (e) {
            // Ignore if role not found in DB
          }
        }
      }

      return Array.from(permissions);
    } catch (error) {
      // Fallback to empty permissions on error
      return [];
    }
  }

  /**
   * Register a new user
   * POST /auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { email, password, firstName, lastName, tenantName, tenantDomain } = request.body as any;

    try {
      if (!tenantName || !tenantDomain) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'tenantName and tenantDomain are required',
        });
      }

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors,
        });
      }

      const emailDomain = this.extractDomainFromEmail(email);
      let targetTenant = emailDomain ? await this.tenantService.getTenantByDomain(emailDomain) : null;

      let tenantId: string;
      let tenantCreated = false;

      if (!targetTenant) {
        const normalizedDomain = this.normalizeDomain(tenantDomain);
        if (!normalizedDomain) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Invalid tenant domain provided',
          });
        }

        targetTenant = await this.tenantService.createTenant({
          name: tenantName,
          domain: normalizedDomain,
          adminContactEmail: email,
          adminUserIds: [],
        });
        tenantId = targetTenant.id;
        tenantCreated = true;
        await this.tenantService.activateTenant(targetTenant.id);
      } else {
        tenantId = targetTenant.id;
        if (targetTenant.status === TenantStatus.SUSPENDED) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Tenant is suspended. Contact administrator.',
          });
        }
      }

      const existingUser = await this.userService.findByEmail(email, tenantId);
      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists for this tenant',
        });
      }

      const userData: UserRegistrationData = {
        email,
        password,
        firstName,
        lastName,
        tenantId,
        roles: tenantCreated ? ['owner', 'admin', 'user'] : ['user'],
      };

      if (!tenantCreated) {
        userData.status = UserStatus.PENDING_APPROVAL;
        userData.pendingTenantId = tenantId;
      }

      const user = await this.userService.createUser(userData);

      if (tenantCreated) {
        await this.tenantService.appendAdminUser(tenantId, user.id);
      } else {
        const joinRequest = await this.tenantJoinRequestService.createRequest({
          tenantId,
          requesterUserId: user.id,
          requesterEmail: user.email,
        });

        await this.notifyTenantAdmins(tenantId, user.email);

        request.log.info({ userId: user.id, email: user.email }, 'User registered pending tenant approval');

        return reply.status(201).send({
          message: 'Registration received. Tenant admins have been notified.',
          userId: user.id,
          email: user.email,
          pendingApproval: true,
          joinRequestId: joinRequest.id,
        });
      }

      if (!this.emailService.isReady()) {
        await this.userService.verifyEmail(user.verificationToken!, user.tenantId);
        request.log.info({ userId: user.id }, 'User auto-verified (email service disabled)');
      }

      if (user.verificationToken && this.emailService.isReady()) {
        try {
          await this.emailService.sendVerificationEmail(
            user.email,
            user.verificationToken,
            this.publicApiUrl
          );
          request.log.info({ userId: user.id }, 'Verification email sent');
        } catch (emailError) {
          request.log.warn({ error: emailError, userId: user.id }, 'Failed to send verification email');
        }
      } else if (!this.emailService.isReady()) {
        request.log.info({ userId: user.id }, 'Skipping verification email (email service not configured)');
      }

      request.log.info({ userId: user.id, email: user.email }, 'User registered with new tenant');

      reply.status(201).send({
        message: this.emailService.isReady()
          ? 'Tenant created and registration successful. Please verify your email.'
          : 'Tenant created and registration successful. You can now login.',
        userId: user.id,
        email: user.email,
        tenantId,
        autoVerified: !this.emailService.isReady(),
      });
    } catch (error: any) {
      request.log.error({ error, email }, 'Registration failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Registration failed. Please try again later.',
      });
    }
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { email, password, tenantId, deviceFingerprint, rememberDevice } = request.body as any;

    try {
      // Rate limiting: Check login attempts by email + IP combination
      // This prevents account enumeration and brute force attacks
      const rateLimiter = (request.server as any).rateLimiter;
      const loginRateLimitEnabled = config.security.loginRateLimitEnabled !== false;
      if (rateLimiter && loginRateLimitEnabled) {
        const rateLimitKey = `${email}:${request.ip}`; // Combine email and IP
        const rateLimitResult = await rateLimiter.checkAndRecord('login', rateLimitKey);

        if (!rateLimitResult.allowed) {
          request.log.warn(
            { email, ip: request.ip, blockedUntil: rateLimitResult.resetAt },
            'Login attempt rate limited'
          );

          // Log rate limit event
          await this.logAuthEvent(
            AuditEventType.LOGIN_FAILURE,
            AuditOutcome.FAILURE,
            tenantId || 'unknown',
            {
              actorEmail: email,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              message: `Login rate limited for ${email}`,
              errorMessage: 'Too many login attempts. Please try again later.',
            }
          );

          return reply.status(429).send({
            error: 'Too Many Requests',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          });
        }
      }

      const trimmedTenantId = typeof tenantId === 'string' ? tenantId.trim() : undefined;
      let resolvedTenantId = trimmedTenantId && trimmedTenantId !== DEFAULT_TENANT_ID ? trimmedTenantId : undefined;

      if (!resolvedTenantId) {
        const defaultMembership = await this.userService.findDefaultUserByEmail(email);
        if (!defaultMembership) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }
        resolvedTenantId = defaultMembership.tenantId;
      }

      // Authenticate user
      const user = await this.userService.authenticateUser(email, password, resolvedTenantId);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Skip email verification check if email service is not configured (development mode)
      if (!user.emailVerified && this.emailService.isReady()) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Please verify your email before logging in',
        });
      }

      // Evaluate tenant-level MFA policy using MFA policy service
      let mfaWarning: string | undefined;
      if (this.mfaPolicyService) {
        const policyEval = await this.mfaPolicyService.evaluatePolicyForUser(
          user.id,
          resolvedTenantId
        );

        // Block login if policy requires MFA but user hasn't set it up
        if (policyEval.shouldBlockLogin) {
          request.log.warn(
            { userId: user.id, tenantId: resolvedTenantId, gracePeriod: policyEval.isInGracePeriod },
            'Login blocked: Tenant MFA required but user has no MFA methods'
          );

          return reply.status(403).send({
            error: 'Forbidden',
            message: policyEval.isInGracePeriod
              ? `MFA is required by your organization. Grace period ends in ${policyEval.daysRemainingInGracePeriod} days. Please set up MFA.`
              : 'MFA is required by your organization. Please set up MFA to continue.',
            requiresMFASetup: true,
            allowedMethods: policyEval.allowedMethods,
            gracePeriod: policyEval.isInGracePeriod
              ? {
                  endsAt: policyEval.gracePeriodEndsAt,
                  daysRemaining: policyEval.daysRemainingInGracePeriod,
                }
              : undefined,
          });
        }

        // Set warning message if in grace period without MFA
        if (policyEval.isInGracePeriod && !policyEval.userIsCompliant) {
          mfaWarning = policyEval.warningMessage;
        }

        // Log policy evaluation
        request.log.info(
          {
            userId: user.id,
            tenantId: resolvedTenantId,
            isRequired: policyEval.isRequired,
            isInGracePeriod: policyEval.isInGracePeriod,
            userIsCompliant: policyEval.userIsCompliant,
          },
          'MFA policy evaluated'
        );
      }

      // Check if user has MFA enabled OR tenant policy requires it
      if (this.mfaController) {
        const hasMFA = await this.mfaController.userHasActiveMFA(user.id, user.tenantId);
        const tenantRequiresMFA = this.mfaPolicyService
          ? await this.mfaPolicyService.isMFARequired(resolvedTenantId)
          : false;

        if (hasMFA || tenantRequiresMFA) {
          // Check if device is trusted (skip MFA for trusted devices)
          const fingerprint = deviceFingerprint || this.generateDeviceFingerprint(request);
          const isTrusted = !tenantRequiresMFA && await this.mfaController.checkTrustedDevice(user.id, user.tenantId, fingerprint);

          if (!isTrusted) {
            // Get available MFA methods (filtered by tenant policy)
            let methods = await this.mfaController.getMFAMethodsForChallenge(user.id, user.tenantId);
            
            // Filter methods by tenant policy allowed methods
            if (this.mfaPolicyService) {
              const allowedMethods = await this.mfaPolicyService.getAllowedMethods(resolvedTenantId);
              methods = methods.filter(method => allowedMethods.includes(method as any));
            }

            if (tenantRequiresMFA && (!methods || methods.length === 0)) {
              // This case should be caught above by policy evaluation
              // But keep as fallback
              request.log.warn(
                { userId: user.id, tenantId: resolvedTenantId },
                'Tenant MFA required but user has no MFA methods'
              );

              return reply.status(403).send({
                error: 'Forbidden',
                message: 'MFA is required by your organization. Please set up MFA first.',
                requiresMFASetup: true,
              });
            }

            // Issue partial auth token for MFA challenge
            const challengeToken = (request.server as any).jwt.sign(
              {
                sub: user.id,
                email: user.email,
                tenantId: user.tenantId,
                type: 'mfa_challenge',
                availableMethods: methods,
                deviceFingerprint: fingerprint,
                rememberDevice: rememberDevice || false,
              },
              {
                expiresIn: '5m', // Short expiry for challenge token
              }
            );

            request.log.info({ userId: user.id, email: user.email }, 'MFA challenge required');

            return reply.status(200).send({
              requiresMFA: true,
              challengeToken,
              availableMethods: methods,
              message: 'MFA verification required',
            });
          }
        }
      }

      // Generate tokens
      const accessToken = (request.server as any).jwt.sign(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          isDefaultTenant: user.isDefaultTenant ?? false,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roles?.[0] || 'user',
          roles: user.roles || [],
          organizationId: user.organizationId,
          status: user.status,
          type: 'access',
        },
        {
          expiresIn: this.accessTokenExpiry,
        }
      );

      // Create refresh token and store in Redis
      const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(
        user.id,
        user.tenantId
      );

      // Extract device and location metadata from request
      const metadata = SessionManagementService.extractSessionMetadata(request);

      // Create session with device tracking
      await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        provider: 'email',
        deviceInfo: metadata.deviceInfo,
        locationInfo: metadata.locationInfo,
      });

      // Check for new device and send notification if needed
      if (this.deviceSecurityService) {
        await this.deviceSecurityService.checkAndNotifyNewDevice(
          user.id,
          user.email,
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          user.tenantId,
          request,
          deviceFingerprint
        );
      }

      request.log.info({ userId: user.id, email: user.email }, 'User logged in successfully');

      // Log successful login
      await this.logAuthEvent(
        AuditEventType.LOGIN_SUCCESS,
        AuditOutcome.SUCCESS,
        user.tenantId,
        {
          actorId: user.id,
          actorEmail: user.email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          message: `User ${user.email} logged in successfully`,
          details: {
            deviceFingerprint: deviceFingerprint?.substring(0, 8),
            rememberDevice
          },
        }
      );

      const loginResponse: any = {
        accessToken,
        refreshToken: refreshTokenResult.token,
        expiresIn: this.accessTokenExpiry,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          isDefaultTenant: user.isDefaultTenant ?? false,
          permissions: await this.getUserPermissions(user),
        },
      };

      // Add MFA warning if user is in grace period without MFA
      if (mfaWarning) {
        loginResponse.mfaWarning = mfaWarning;
        loginResponse.requiresMFASetup = true;
      }

      reply.send(loginResponse);
    } catch (error: any) {
      // Log failed login attempt
      await this.logAuthEvent(
        AuditEventType.LOGIN_FAILURE,
        AuditOutcome.FAILURE,
        'default',
        {
          actorEmail: email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          message: `Login failed for ${email}`,
          errorMessage: error.message,
        }
      );

      if (error.message === 'User account pending approval') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Your tenant admin must approve your access request before you can log in.',
        });
      }

      if (error.message === 'User account is not active') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Please verify your email before logging in',
        });
      }

      request.log.error({ error, email, stack: error.stack, message: error.message }, 'Login failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed. Please try again later.',
      });
    }
  }

  /**
   * Verify email address
   * GET /auth/verify-email/:token
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { token } = request.params as any;
    const { tenantId = DEFAULT_TENANT_ID } = request.query as any;

    try {
      const user = await this.userService.verifyEmail(token, tenantId);

      if (!user) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid or expired verification token',
        });
      }

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.firstName || user.email
      );

      request.log.info({ userId: user.id, email: user.email }, 'Email verified successfully');

      reply.send({
        message: 'Email verified successfully. You can now log in.',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: true,
          permissions: await this.getUserPermissions(user),
        },
      });
    } catch (error: any) {
      request.log.error({ error, token }, 'Email verification failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Email verification failed. Please try again later.',
      });
    }
  }

  /**
   * Resend verification email
   * POST /auth/resend-verification
   */
  async resendVerificationEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { email } = request.body as { email: string };

    try {
      // Find user by email across all tenants
      const user = await this.userService.findByEmailGlobally(email);

      if (!user) {
        // Return success even if user not found to prevent email enumeration
        return reply.status(200).send({
          message: 'If your email is registered and unverified, you will receive a verification email shortly.',
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return reply.status(200).send({
          message: 'If your email is registered and unverified, you will receive a verification email shortly.',
        });
      }

      // Generate new verification token
      const verificationToken = await this.userService.createVerificationToken(user.id, user.tenantId);

      if (verificationToken) {
        // Send verification email
        await this.emailService.sendVerificationEmail(
          email,
          verificationToken,
          this.publicApiUrl
        );
      }

      return reply.status(200).send({
        message: 'If your email is registered and unverified, you will receive a verification email shortly.',
      });
    } catch (error: any) {
      request.log.error({ error, email }, 'Failed to resend verification email');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to resend verification email. Please try again later.',
      });
    }
  }

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { email, tenantId = DEFAULT_TENANT_ID } = request.body as any;

    try {
      // Create reset token
      const resetToken = await this.userService.createPasswordResetToken(email, tenantId);

      if (resetToken) {
        // Send reset email
        await this.emailService.sendPasswordResetEmail(
          email,
          resetToken,
          this.publicApiUrl
        );
      }

      // Always return success to prevent email enumeration
      request.log.info({ email }, 'Password reset requested');

      reply.send({
        message: 'If an account exists with this email, you will receive password reset instructions.',
      });
    } catch (error: any) {
      request.log.error({ error, email }, 'Password reset request failed');

      // Still return success to prevent information leakage
      reply.send({
        message: 'If an account exists with this email, you will receive password reset instructions.',
      });
    }
  }

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { token, password, tenantId = DEFAULT_TENANT_ID } = request.body as any;

    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors,
        });
      }

      const result = await this.userService.resetPassword(token, password, tenantId);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error || 'Invalid or expired reset token',
        });
      }

      request.log.info({ token }, 'Password reset successfully');

      reply.send({
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (error: any) {
      request.log.error({ error, token }, 'Password reset failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Password reset failed. Please try again later.',
      });
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { refreshToken } = request.body as any;

    try {
      // Validate and rotate refresh token
      const refreshResult = await this.cacheManager.tokens.rotateRefreshToken(refreshToken);

      if (!refreshResult) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }

      // Enforce tenant isolation on refresh if caller supplies tenant context
      const headerTenant = (request.headers['x-tenant-id'] || request.headers['tenant-id']) as string | undefined;
      const paramTenant = (request.params as any)?.tenantId as string | undefined;
      const requestedTenant = headerTenant || paramTenant;

      if (requestedTenant && requestedTenant !== refreshResult.tokenData.tenantId) {
        // Revoke the newly issued token to avoid leaks and treat as unauthorized
        await this.cacheManager.tokens.revokeToken(refreshResult.tokenData.tokenId);
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token tenant does not match requested tenant',
        });
      }

      const user = await this.userService.findById(
        refreshResult.tokenData.userId,
        refreshResult.tokenData.tenantId
      );

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Generate new access token
      const accessToken = (request.server as any).jwt.sign(
        {
          sub: refreshResult.tokenData.userId,
          email: user.email,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roles?.[0] || 'user',
          roles: user.roles || [],
          organizationId: user.organizationId,
          type: 'access',
        },
        {
          expiresIn: this.accessTokenExpiry,
        }
      );

      request.log.info({ userId: refreshResult.tokenData.userId }, 'Token refreshed successfully');

      reply.send({
        accessToken,
        refreshToken: refreshResult.token,
        expiresIn: this.accessTokenExpiry,
      });
    } catch (error: any) {
      if (error.message && error.message.includes('reuse detected')) {
        request.log.warn({ refreshToken }, 'Refresh token reuse detected');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token reuse detected. Please log in again.',
        });
      }

      request.log.error({ error }, 'Token refresh failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Token refresh failed. Please try again later.',
      });
    }
  }

  /**
   * Logout
   * POST /auth/logout
   */
  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get user from JWT
      const user = (request.server as any).jwt.verify(
        request.headers.authorization?.replace('Bearer ', '')
      );

      // Blacklist access token (hash-based) with correct TTL
      if (request.headers.authorization) {
        const token = request.headers.authorization.replace('Bearer ', '');
        const expSeconds = user.exp || Math.floor(Date.now() / 1000) + 900; // Default 15 min fallback
        await this.cacheManager.blacklist.blacklistTokenString(token, expSeconds * 1000);
      }

      // Revoke ALL user sessions (comprehensive logout)
      await this.cacheManager.sessions.deleteAllUserSessions(user.tenantId, user.sub);

      // Revoke ALL user refresh tokens (prevent token reuse)
      await this.cacheManager.tokens.revokeAllUserTokens(user.tenantId, user.sub);

      // Delete all user sessions (for backward compatibility)
      await this.cacheManager.logoutUser(user.tenantId, user.sub);

      request.log.info({ userId: user.sub }, 'User logged out successfully - all sessions revoked');

      // Log logout event with detailed information
      await this.logAuthEvent(
        AuditEventType.LOGOUT,
        AuditOutcome.SUCCESS,
        user.tenantId || 'default',
        {
          actorId: user.sub,
          actorEmail: user.email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          message: `User ${user.email} logged out - all sessions and tokens revoked`,
          details: {
            allSessionsRevoked: true,
            allTokensRevoked: true,
          },
        }
      );

      reply.send({
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      request.log.error({ error }, 'Logout failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout failed. Please try again later.',
      });
    }
  }

  /**
   * Revoke refresh token
   * POST /auth/revoke
   */
  async revokeToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { token, token_type_hint } = request.body as {
        token: string;
        token_type_hint?: 'refresh_token' | 'access_token';
      };

      if (!token) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token is required',
        });
      }

      // Get user from JWT (authenticated request)
      let user;
      try {
        user = (request.server as any).jwt.verify(
          request.headers.authorization?.replace('Bearer ', '')
        );
      } catch {
        // If no valid access token, that's OK for revocation
        // Token revocation should succeed even if the user is not authenticated
        // (per OAuth2 spec RFC 7009)
      }

      // Revoke based on token_type_hint or try both
      if (token_type_hint === 'refresh_token' || !token_type_hint) {
        // Revoke refresh token by hashing it first
        try {
          const crypto = await import('crypto');
          const tokenId = crypto.createHash('sha256').update(token).digest('hex');
          await this.cacheManager.tokens.revokeToken(tokenId);
          request.log.info({ userId: user?.sub }, 'Refresh token revoked successfully');
          return reply.send({
            message: 'Token revoked successfully',
          });
        } catch {
          // Token not found, continue to try access token
        }
      }

      if (token_type_hint === 'access_token' || !token_type_hint) {
        // Blacklist access token
        // Extract expiration from token if possible
        try {
          const decoded = (request.server as any).jwt.decode(token);
          if (decoded && decoded.exp) {
            await this.cacheManager.blacklist.blacklistTokenString(
              token,
              decoded.exp * 1000
            );
            request.log.info({ userId: decoded.sub }, 'Access token revoked successfully');
            return reply.send({
              message: 'Token revoked successfully',
            });
          }
        } catch {
          // Token decode failed, but that's OK - we still succeed per OAuth2 spec
        }
      }

      // Per OAuth2 RFC 7009: revocation endpoint should return 200 even if token doesn't exist
      reply.send({
        message: 'Token revoked successfully',
      });
    } catch (error: any) {
      request.log.error({ error }, 'Token revocation failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Token revocation failed. Please try again later.',
      });
    }
  }

  /**
   * Token introspection (for resource servers)
   * POST /auth/introspect
   */
  async introspectToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { token, token_type_hint } = request.body as {
        token: string;
        token_type_hint?: 'access_token' | 'refresh_token';
      };

      if (!token) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token is required',
        });
      }

      // Default response for inactive token
      const inactiveResponse = {
        active: false,
      };

      // Check token type
      if (token_type_hint === 'refresh_token' || !token_type_hint) {
        // Check if refresh token exists and is valid
        const tokenData = await this.cacheManager.tokens.getTokenData(token);
        if (tokenData && tokenData.expiresAt > Date.now()) {
          return reply.send({
            active: true,
            scope: 'refresh_token',
            client_id: 'main-api',
            username: tokenData.userId,
            token_type: 'refresh_token',
            exp: Math.floor(tokenData.expiresAt / 1000),
            iat: Math.floor(tokenData.createdAt / 1000),
            sub: tokenData.userId,
            aud: 'main-api',
            iss: this.publicApiUrl,
          });
        }
      }

      if (token_type_hint === 'access_token' || !token_type_hint) {
        // Check if access token is blacklisted
        const isBlacklisted = await this.cacheManager.blacklist.isTokenBlacklisted(token);
        if (isBlacklisted) {
          return reply.send(inactiveResponse);
        }

        // Validate JWT access token
        try {
          const decoded = (request.server as any).jwt.verify(token);

          // Token is valid
          return reply.send({
            active: true,
            scope: decoded.scope || 'openid profile email',
            client_id: decoded.aud || 'main-api',
            username: decoded.email || decoded.sub,
            token_type: 'Bearer',
            exp: decoded.exp,
            iat: decoded.iat,
            nbf: decoded.nbf,
            sub: decoded.sub,
            aud: decoded.aud,
            iss: decoded.iss,
            jti: decoded.jti,
          });
        } catch {
          // Token validation failed
          return reply.send(inactiveResponse);
        }
      }

      // Token not found or invalid
      reply.send(inactiveResponse);
    } catch (error: any) {
      request.log.error({ error }, 'Token introspection failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Token introspection failed. Please try again later.',
      });
    }
  }

  /**
   * Complete MFA challenge and get access token
   * POST /auth/mfa/verify
   */
  async completeMFAChallenge(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { challengeToken, code, method } = request.body as {
      challengeToken: string;
      code: string;
      method: MFAMethodType | 'recovery';
    };

    try {
      // Verify challenge token
      let challengeData: any;
      try {
        challengeData = (request.server as any).jwt.verify(challengeToken);

        if (challengeData.type !== 'mfa_challenge') {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid challenge token',
          });
        }
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired challenge token',
        });
      }

      // Verify MFA code
      if (!this.mfaController) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'MFA service not available',
        });
      }

      const isValid = await this.verifyMFACode(
        challengeData.sub,
        challengeData.tenantId,
        method,
        code
      );

      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid MFA code',
        });
      }

      // If user requested to remember device, add to trusted devices
      // BUT: Only trust device if tenant doesn't require MFA (enforced by policy)
      // When tenant requires MFA, devices should not be trusted to ensure MFA is always required
      if (challengeData.rememberDevice && challengeData.deviceFingerprint) {
        // Check if tenant requires MFA - if so, don't trust device
        const tenantRequiresMFA = this.mfaPolicyService
          ? await this.mfaPolicyService.isMFARequired(challengeData.tenantId)
          : false;

        if (!tenantRequiresMFA) {
          const metadata = SessionManagementService.extractSessionMetadata(request);
          await this.mfaController.trustDevice(
            challengeData.sub,
            challengeData.tenantId,
            challengeData.deviceFingerprint,
            metadata.deviceInfo?.userAgent,
            metadata.locationInfo?.ip
          );
        } else {
          request.log.info(
            { userId: challengeData.sub, tenantId: challengeData.tenantId },
            'Device trust skipped: Tenant requires MFA'
          );
        }
      }

      // Get user details
      const user = await this.userService.findById(challengeData.sub, challengeData.tenantId);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Generate full access token
      const accessToken = (request.server as any).jwt.sign(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roles?.[0] || 'user',
          roles: user.roles || [],
          organizationId: user.organizationId,
          status: user.status,
          type: 'access',
        },
        {
          expiresIn: this.accessTokenExpiry,
        }
      );

      // Create refresh token
      const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(
        user.id,
        user.tenantId
      );

      // Extract device and location metadata
      const metadata = SessionManagementService.extractSessionMetadata(request);

      // Create session
      await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        provider: 'email',
        deviceInfo: metadata.deviceInfo,
        locationInfo: metadata.locationInfo,
      });

      request.log.info({ userId: user.id, email: user.email }, 'MFA challenge completed successfully');

      reply.send({
        accessToken,
        refreshToken: refreshTokenResult.token,
        expiresIn: this.accessTokenExpiry,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          permissions: await this.getUserPermissions(user),
        },
      });
    } catch (error: any) {
      request.log.error({ error }, 'MFA challenge verification failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'MFA challenge verification failed. Please try again later.',
      });
    }
  }

  /**
   * Generate device fingerprint from request metadata
   */
  private generateDeviceFingerprint(request: FastifyRequest): string {
    const userAgent = request.headers['user-agent'] || '';
    const acceptLanguage = request.headers['accept-language'] || '';
    const acceptEncoding = request.headers['accept-encoding'] || '';

    // Create a hash of device characteristics
    const data = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify MFA code for login
   */
  private async verifyMFACode(
    userId: string,
    tenantId: string,
    method: MFAMethodType | 'recovery',
    code: string
  ): Promise<boolean> {
    if (!this.mfaController) {
      return false;
    }

    try {
      // Get user to pass to MFA service
      const user = await this.userService.findById(userId, tenantId);
      if (!user) {
        return false;
      }

      // Verify based on method type
      if (method === 'recovery') {
        // Verify recovery code
        const result = await this.mfaController.verifyRecoveryCodeForLogin(userId, tenantId, code, user);
        return result;
      } else if (method === 'totp') {
        // Verify TOTP code
        const result = await this.mfaController.verifyTOTPForLogin(userId, tenantId, code, user);
        return result;
      } else if (method === 'sms' || method === 'email') {
        // Verify OTP code
        const result = await this.mfaController.verifyOTPForLogin(userId, tenantId, method, code, user);
        return result;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract and verify JWT token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify and decode JWT
      let decoded: any;
      try {
        decoded = await (request.server as any).jwt.verify(token);
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const userId = decoded.sub;
      const tenantId = decoded.tenantId || DEFAULT_TENANT_ID;

      if (!userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        });
        return;
      }

      // Fetch user from database
      const user = await this.userService.findById(userId, tenantId);

      if (!user) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }

      // Return user profile (excluding sensitive data)
      const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

      reply.send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName,
        tenantId: user.tenantId,
        roles: user.roles,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        permissions: await this.getUserPermissions(user),
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching user profile');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch profile',
      });
    }
  }

  /**
   * Update current user profile
   * PATCH /auth/me
   */
  async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Extract and verify JWT token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify and decode JWT
      let decoded: any;
      try {
        decoded = await (request.server as any).jwt.verify(token);
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const userId = decoded.sub;
      const tenantId = decoded.tenantId || DEFAULT_TENANT_ID;

      if (!userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        });
        return;
      }

      const { firstName, lastName } = request.body as any;

      // Fetch current user
      const currentUser = await this.userService.findById(userId, tenantId);

      if (!currentUser) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }

      // Update user profile
      const updatedUser = await this.userService.updateUser(userId, tenantId, {
        firstName: firstName !== undefined ? firstName : currentUser.firstName,
        lastName: lastName !== undefined ? lastName : currentUser.lastName,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update profile',
        });
        return;
      }

      const displayName = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.email;

      // Return updated profile
      reply.send({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        displayName,
        tenantId: updatedUser.tenantId,
        roles: updatedUser.roles,
        status: updatedUser.status,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        permissions: await this.getUserPermissions(updatedUser),
      });
    } catch (error) {
      request.log.error({ error }, 'Error updating user profile');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * List tenant memberships for current user
   * GET /auth/tenants
   */
  async listUserTenants(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = await (request.server as any).jwt.verify(token);
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const userId = decoded.sub;
      const tenantId = decoded.tenantId || DEFAULT_TENANT_ID;

      if (!userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        });
        return;
      }

      const currentUser = await this.userService.findById(userId, tenantId);
      if (!currentUser) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }

      const memberships = await this.buildTenantMembershipResponse(currentUser.email);
      reply.send(memberships);
    } catch (error) {
      request.log.error({ error }, 'Error listing user tenants');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch tenant memberships',
      });
    }
  }

  /**
   * Update default tenant for user
   * PATCH /auth/default-tenant
   */
  async updateDefaultTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = await (request.server as any).jwt.verify(token);
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const userId = decoded.sub;
      const currentTenantId = decoded.tenantId || DEFAULT_TENANT_ID;
      const { tenantId } = request.body as { tenantId?: string };

      if (!tenantId) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'tenantId is required',
        });
        return;
      }

      if (!userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        });
        return;
      }

      const currentUser = await this.userService.findById(userId, currentTenantId);
      if (!currentUser) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
        return;
      }

      try {
        await this.userService.updateDefaultTenant(currentUser.email, tenantId);
      } catch (serviceError: any) {
        if (serviceError.message === 'User is not a member of the requested tenant') {
          reply.status(400).send({
            error: 'Bad Request',
            message: serviceError.message,
          });
          return;
        }

        if (serviceError.message === 'User not found for default tenant update') {
          reply.status(404).send({
            error: 'Not Found',
            message: serviceError.message,
          });
          return;
        }

        throw serviceError;
      }

      const memberships = await this.buildTenantMembershipResponse(currentUser.email);
      reply.send({
        message: 'Default tenant updated successfully',
        ...memberships,
      });
    } catch (error) {
      request.log.error({ error }, 'Error updating default tenant');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update default tenant',
      });
    }
  }

  /**
   * Switch to a different tenant context
   * POST /auth/switch-tenant
   * Issues new tokens for the specified tenant
   */
  async switchTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7);
      let decoded: any;
      try {
        decoded = await (request.server as any).jwt.verify(token);
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      const userEmail = decoded.email;
      const currentTenantId = decoded.tenantId;
      const currentUserId = decoded.sub;
      const currentAccessExpiresAt = decoded.exp ? decoded.exp * 1000 : undefined;
      const { tenantId: targetTenantId } = request.body as { tenantId?: string };

      if (!targetTenantId) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'tenantId is required',
        });
        return;
      }

      if (!userEmail) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token payload',
        });
        return;
      }

      // Find user's membership in the target tenant
      const targetMembership = await this.userService.findByEmail(userEmail, targetTenantId);
      if (!targetMembership) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'You are not a member of this tenant',
        });
        return;
      }

      // Check if user is active in the target tenant
      if (targetMembership.status !== UserStatus.ACTIVE) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'Your membership in this tenant is not active',
        });
        return;
      }

      // Get tenant details
      const tenant = await this.tenantService.getTenant(targetTenantId);
      if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'This tenant is not available',
        });
        return;
      }

      // Generate new tokens for the target tenant
      const accessToken = (request.server as any).jwt.sign(
        {
          sub: targetMembership.id,
          email: targetMembership.email,
          tenantId: targetMembership.tenantId,
          isDefaultTenant: targetMembership.isDefaultTenant ?? false,
          firstName: targetMembership.firstName,
          lastName: targetMembership.lastName,
          role: targetMembership.roles?.[0] || 'user',
          roles: targetMembership.roles || [],
          organizationId: targetMembership.organizationId,
          status: targetMembership.status,
          type: 'access',
        },
        {
          expiresIn: this.accessTokenExpiry,
        }
      );

      // Create new refresh token for the target tenant
      const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(
        targetMembership.id,
        targetMembership.tenantId
      );

      // Revoke previous tenant tokens/sessions and blacklist current access token
      try {
        if (currentTenantId && currentUserId) {
          await this.cacheManager.tokens.revokeAllUserTokens(currentTenantId, currentUserId);
          await this.cacheManager.sessions.deleteAllUserSessions(currentTenantId, currentUserId);
          await this.cacheManager.jwtCache.invalidateUser(currentUserId);
        }

        if (currentAccessExpiresAt) {
          await this.cacheManager.blacklist.blacklistTokenString(token, currentAccessExpiresAt);
        }
      } catch (cleanupError) {
        request.log.warn({ cleanupError }, 'Failed to fully cleanup old tenant tokens/sessions');
      }

      // Extract metadata for session
      const metadata = SessionManagementService.extractSessionMetadata(request);

      // Create session for the new tenant context
      await this.cacheManager.sessions.createSession(targetMembership.id, targetMembership.tenantId, {
        email: targetMembership.email,
        name: `${targetMembership.firstName || ''} ${targetMembership.lastName || ''}`.trim() || targetMembership.email,
        provider: 'tenant_switch',
        deviceInfo: metadata.deviceInfo,
        locationInfo: metadata.locationInfo,
      });

      request.log.info(
        { userId: targetMembership.id, email: targetMembership.email, tenantId: targetTenantId },
        'User switched tenant context'
      );

      reply.send({
        accessToken,
        refreshToken: refreshTokenResult.token,
        expiresIn: this.accessTokenExpiry,
        user: {
          id: targetMembership.id,
          email: targetMembership.email,
          firstName: targetMembership.firstName,
          lastName: targetMembership.lastName,
          tenantId: targetMembership.tenantId,
          tenantName: tenant.name,
          roles: targetMembership.roles || [],
          permissions: await this.getUserPermissions(targetMembership),
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Error switching tenant');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to switch tenant',
      });
    }
  }

  private extractDomainFromEmail(email: string): string | null {
    const parts = email.toLowerCase().split('@');
    if (parts.length !== 2) {
      return null;
    }
    return this.normalizeDomain(parts[1]);
  }

  private normalizeDomain(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    return value.trim().toLowerCase() || null;
  }

  private async buildTenantMembershipResponse(email: string): Promise<{ tenants: Array<{ tenantId: string; tenantName?: string; domain?: string; status?: string; isDefault: boolean; roles: string[] }>; defaultTenantId: string | null }> {
    const memberships = await this.userService.findAllByEmail(email);

    if (!memberships.length) {
      return { tenants: [], defaultTenantId: null };
    }

    const tenantDetails = await Promise.all(
      memberships.map(async (membership) => {
        try {
          const tenant = await this.tenantService.getTenant(membership.tenantId);
          return {
            tenantId: membership.tenantId,
            tenantName: tenant?.name || membership.tenantId,
            domain: tenant?.domain,
            status: tenant?.status,
            isDefault: !!membership.isDefaultTenant,
            roles: membership.roles || [],
          };
        } catch (error) {
          return {
            tenantId: membership.tenantId,
            tenantName: membership.tenantId,
            domain: undefined,
            status: undefined,
            isDefault: !!membership.isDefaultTenant,
            roles: membership.roles || [],
          };
        }
      })
    );

    const defaultTenantId = tenantDetails.find((tenant) => tenant.isDefault)?.tenantId || tenantDetails[0]?.tenantId || null;

    return {
      tenants: tenantDetails,
      defaultTenantId,
    };
  }

  private async notifyTenantAdmins(tenantId: string, requesterEmail: string): Promise<void> {
    try {
      const tenant = await this.tenantService.getTenant(tenantId);
      if (!tenant || !tenant.adminUserIds?.length) {
        return;
      }

      for (const adminId of tenant.adminUserIds) {
        const adminUser = await this.userService.findById(adminId, tenantId);
        if (!adminUser) {
          continue;
        }

        await this.emailService.sendEmail({
          to: adminUser.email,
          subject: 'New tenant join request',
          text: `User ${requesterEmail} requested to join tenant ${tenant.name}.`,
        });
      }
    } catch (error) {
      // Non-critical failure; silently continue
      // Notification failure should not block registration
    }
  }

  /**
   * Check registration eligibility
   * POST /auth/check-registration
   * 
   * Step 1 of 2-step registration process.
   * Checks email to determine registration flow:
   * - active_user: User is active in a tenant -> redirect to login
   * - pending_user: User exists but pending approval
   * - tenant_exists: Email domain matches existing tenant -> request to join
   * - no_tenant: No matching tenant -> create new tenant
   */
  async checkRegistration(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { email } = request.body as { email: string };

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const emailDomain = this.extractDomainFromEmail(normalizedEmail);

      // Check if user already exists in any tenant
      const existingMemberships = await this.userService.findAllByEmail(normalizedEmail);

      if (existingMemberships.length > 0) {
        // Check if any membership is active
        const activeMembership = existingMemberships.find(m => m.status === UserStatus.ACTIVE);

        if (activeMembership) {
          // User is already active in a tenant - redirect to login
          const tenant = await this.tenantService.getTenant(activeMembership.tenantId);
          return reply.send({
            status: 'active_user',
            message: 'An account with this email already exists. Please log in.',
            tenant: tenant ? {
              id: tenant.id,
              name: tenant.name,
              domain: tenant.domain,
            } : null,
            redirectTo: '/login',
          });
        }

        // Check for pending approval
        const pendingMembership = existingMemberships.find(m => m.status === UserStatus.PENDING_APPROVAL);
        if (pendingMembership) {
          const tenant = await this.tenantService.getTenant(pendingMembership.tenantId);
          return reply.send({
            status: 'pending_user',
            message: `Your request to join ${tenant?.name || 'the tenant'} is pending admin approval.`,
            tenant: tenant ? {
              id: tenant.id,
              name: tenant.name,
              domain: tenant.domain,
            } : null,
            redirectTo: null,
          });
        }
      }

      // Check if email domain matches an existing tenant
      if (emailDomain) {
        const existingTenant = await this.tenantService.getTenantByDomain(emailDomain);

        if (existingTenant) {
          // Tenant exists but user doesn't have an account
          if (existingTenant.status === TenantStatus.SUSPENDED) {
            return reply.send({
              status: 'tenant_exists',
              message: 'This organization is currently suspended. Contact support for assistance.',
              tenant: {
                id: existingTenant.id,
                name: existingTenant.name,
                domain: existingTenant.domain,
              },
              redirectTo: null,
            });
          }

          return reply.send({
            status: 'tenant_exists',
            message: `Your email domain belongs to ${existingTenant.name}. You can request to join this organization.`,
            tenant: {
              id: existingTenant.id,
              name: existingTenant.name,
              domain: existingTenant.domain,
            },
            redirectTo: null,
          });
        }
      }

      // No matching tenant - user can create a new one
      return reply.send({
        status: 'no_tenant',
        message: 'No existing organization found. You can create a new tenant.',
        tenant: null,
        redirectTo: null,
      });

    } catch (error: any) {
      request.log.error({ error, email }, 'Registration check failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check registration status. Please try again.',
      });
    }
  }
}
