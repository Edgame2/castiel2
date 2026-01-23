/**
 * User Management Service
 * Admin-level operations for user management
 */

import type { Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { User, UserStatus } from '../../types/user.types.js';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListQuery,
  UserListResponse,
  UserActivityResponse,
  AdminPasswordResetResponse,
  InviteUserRequest,
  InviteUserResponse,
  ImpersonationAuditEntry,
} from '../../types/user-management.types.js';
import { UserCacheService } from './user-cache.service.js';
import { EmailService } from './email.service.js';

interface ImportResult {
  added: number;
  failed: number;
  errors: { row: number; error: string; email?: string }[];
}

interface ImpersonationOptions {
  adminId: string;
  adminEmail: string;
  reason?: string;
  expiryMinutes?: number;
  metadata?: Record<string, any>;
}

interface ImpersonationResult {
  user: UserResponse;
  impersonationId: string;
  expiresAt: string;
  expiresInSeconds: number;
  reason?: string;
}

export class UserManagementService {
  private container: Container;
  private cacheService?: UserCacheService;
  private monitoring?: IMonitoringProvider;
  private emailService?: EmailService;

  constructor(container: Container, cacheService?: UserCacheService, emailService?: EmailService, monitoring?: IMonitoringProvider) {
    this.container = container;
    this.cacheService = cacheService;
    this.emailService = emailService;
    this.monitoring = monitoring;
  }

  /**
   * Initiate user impersonation (admin action)
   */
  async impersonateUser(
    tenantId: string,
    userId: string,
    options: ImpersonationOptions
  ): Promise<ImpersonationResult> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('User is not active');
      }

      if (user.id === options.adminId) {
        throw new Error('Cannot impersonate yourself');
      }

      const expiryMinutes = Math.min(Math.max(options.expiryMinutes ?? 60, 15), 60);
      const expiresInMs = expiryMinutes * 60 * 1000;
      const impersonationId = randomBytes(16).toString('hex');
      const initiatedAt = new Date();
      const expiresAt = new Date(initiatedAt.getTime() + expiresInMs);
      const reason = (options.reason?.trim() || 'Administrative impersonation').slice(0, 250);

      const metadata = (user.metadata || {});
      const history: ImpersonationAuditEntry[] = Array.isArray(metadata.impersonationHistory)
        ? metadata.impersonationHistory
        : [];

      const auditEntry: ImpersonationAuditEntry = {
        id: impersonationId,
        adminId: options.adminId,
        adminEmail: options.adminEmail,
        reason,
        createdAt: initiatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        metadata: {
          ...options.metadata,
        },
      };

      metadata.impersonationHistory = [...history, auditEntry].slice(-20);
      metadata.lastImpersonatedAt = auditEntry.createdAt;
      user.metadata = metadata;
      user.updatedAt = new Date();

      const { resource } = await this.container.item(userId, tenantId).replace(user);
      const updatedUser = resource as User;

      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return {
        user: this.toResponse(updatedUser),
        impersonationId,
        expiresAt: auditEntry.expiresAt,
        expiresInSeconds: Math.floor(expiresInMs / 1000),
        reason,
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.impersonate' });
      throw error instanceof Error ? error : new Error('Failed to impersonate user');
    }
  }

  /**
   * Convert User document to UserResponse (remove sensitive data)
   */
  private toResponse(user: User): UserResponse {
    // Helper to convert date-like values to ISO string
    const toISOString = (value: any): string => {
      if (!value) {return value;}
      if (typeof value === 'string') {return value;}
      if (value instanceof Date) {return value.toISOString();}
      return new Date(value).toISOString();
    };

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.roles,
      providers: user.providers?.map(p => ({
        provider: p.provider,
        providerId: p.providerId,
        email: p.email,
        connectedAt: toISOString(p.connectedAt),
      })),
      metadata: user.metadata,
      createdAt: toISOString(user.createdAt),
      updatedAt: toISOString(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? toISOString(user.lastLoginAt) : undefined,
    };
  }

  /**
   * List users with filtering and pagination
   */
  async listUsers(tenantId: string, query: UserListQuery = {}): Promise<UserListResponse> {
    const {
      status,
      role,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    try {
      // Build query
      let queryStr = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
      ];

      // Add filters
      if (status) {
        queryStr += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }

      if (role) {
        queryStr += ' AND ARRAY_CONTAINS(c.roles, @role)';
        parameters.push({ name: '@role', value: role });
      }

      if (search) {
        queryStr += ' AND (CONTAINS(LOWER(c.email), @search) OR CONTAINS(LOWER(c.firstName), @search) OR CONTAINS(LOWER(c.lastName), @search))';
        parameters.push({ name: '@search', value: search.toLowerCase() });
      }

      // Add sorting
      const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
      queryStr += ` ORDER BY c.${sortBy} ${orderDir}`;

      // Get total count
      const countQuery = queryStr.replace('SELECT *', 'SELECT VALUE COUNT(1)');
      const { resources: countResult } = await this.container.items
        .query({ query: countQuery, parameters }, { partitionKey: tenantId })
        .fetchAll();
      const total = countResult[0] || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      queryStr += ` OFFSET ${offset} LIMIT ${limit}`;

      const { resources } = await this.container.items
        .query<User>({ query: queryStr, parameters }, { partitionKey: tenantId })
        .fetchAll();

      return {
        users: resources.map(u => this.toResponse(u)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'user-management.list-users' });
      throw new Error('Failed to list users');
    }
  }

  /**
   * Create user (admin)
   */
  async createUser(tenantId: string, data: CreateUserRequest): Promise<UserResponse> {
    const userId = randomBytes(16).toString('hex');

    // Check if user already exists
    const existingQuery = {
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tenantId = @tenantId',
      parameters: [
        { name: '@email', value: data.email.toLowerCase() },
        { name: '@tenantId', value: tenantId },
      ],
    };

    const { resources: existing } = await this.container.items
      .query(existingQuery, { partitionKey: tenantId })
      .fetchAll();

    if (existing.length > 0) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      id: userId,
      tenantId,
      email: data.email.toLowerCase(),
      emailVerified: data.status === 'active', // Auto-verify if status is active
      firstName: data.firstName,
      lastName: data.lastName,
      status: (data.status as UserStatus) || ('pending_verification' as UserStatus),
      roles: data.roles || ['user'],
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      partitionKey: tenantId,
    };

    // If sendInvite, generate verification token
    if (data.sendInvite) {
      user.verificationToken = randomBytes(32).toString('hex');
      user.verificationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    try {
      const { resource } = await this.container.items.create(user);
      const createdUser = resource as User;

      // Send invitation email if requested
      if (data.sendInvite && this.emailService && user.verificationToken) {
        // TODO: Add generic sendEmail method to EmailService or create specific invitation email method
        // For now, using verification email as it has similar functionality
        const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
        const baseUrl = process.env.FRONTEND_URL || 
          process.env.PUBLIC_APP_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (nodeEnv === 'production' 
            ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
            : 'http://localhost:3000');
        await this.emailService.sendVerificationEmail(user.email, user.verificationToken, baseUrl);
      }

      // Cache the user
      if (this.cacheService) {
        await this.cacheService.setCachedUser(createdUser);
      }

      return this.toResponse(createdUser);
    } catch (error: any) {
      this.monitoring?.trackException(error as Error, { operation: 'user-management.create-user' });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId: string, userId: string): Promise<UserResponse | null> {
    try {
      // Check cache first
      let user: User | null = null;
      if (this.cacheService) {
        user = await this.cacheService.getCachedUser(userId, tenantId);
      }

      if (!user) {
        const { resource } = await this.container.item(userId, tenantId).read<User>();
        user = resource || null;

        if (user && this.cacheService) {
          await this.cacheService.setCachedUser(user);
        }
      }

      return user ? this.toResponse(user) : null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.get-user' });
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update user
   */
  async updateUser(tenantId: string, userId: string, data: UpdateUserRequest): Promise<UserResponse> {
    try {
      const { resource: current } = await this.container.item(userId, tenantId).read<User>();
      if (!current) {
        throw new Error('User not found');
      }

      const updated: User = {
        ...current,
        firstName: data.firstName !== undefined ? data.firstName : current.firstName,
        lastName: data.lastName !== undefined ? data.lastName : current.lastName,
        roles: data.roles !== undefined ? data.roles : current.roles,
        status: (data.status as UserStatus) !== undefined ? (data.status as UserStatus) : current.status,
        emailVerified: data.emailVerified !== undefined ? data.emailVerified : current.emailVerified,
        metadata: data.metadata !== undefined ? { ...current.metadata, ...data.metadata } : current.metadata,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(userId, tenantId).replace(updated);
      const updatedUser = resource as User;

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return this.toResponse(updatedUser);
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.update-user' });
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(tenantId: string, userId: string): Promise<void> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      user.status = 'deleted' as UserStatus;
      user.updatedAt = new Date();

      await this.container.item(userId, tenantId).replace(user);

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.delete-user' });
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Activate user
   */
  async activateUser(tenantId: string, userId: string): Promise<UserResponse> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'active') {
        throw new Error('User is already active');
      }

      user.status = 'active' as UserStatus;
      user.updatedAt = new Date();

      const { resource } = await this.container.item(userId, tenantId).replace(user);
      const updatedUser = resource as User;

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return this.toResponse(updatedUser);
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.activate-user' });
      throw new Error('Failed to activate user');
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(tenantId: string, userId: string): Promise<UserResponse> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'suspended') {
        throw new Error('User is already suspended');
      }

      user.status = 'suspended' as UserStatus;
      user.updatedAt = new Date();

      const { resource } = await this.container.item(userId, tenantId).replace(user);
      const updatedUser = resource as User;

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return this.toResponse(updatedUser);
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.deactivate-user' });
      throw new Error('Failed to deactivate user');
    }
  }

  /**
   * Update user status (generic method for all status changes)
   */
  async updateUserStatus(
    userId: string,
    newStatus: string,
    adminUser: { id: string; tenantId: string }
  ): Promise<UserResponse | null> {
    try {
      // First try to find the user in the admin's tenant
      let user: User | null = null;
      let tenantId = adminUser.tenantId;

      const { resource } = await this.container.item(userId, tenantId).read<User>();
      user = resource || null;

      if (!user) {
        // Try to find user across all tenants (for super admins)
        const query = 'SELECT * FROM c WHERE c.id = @userId';
        const { resources } = await this.container.items.query<User>({
          query,
          parameters: [{ name: '@userId', value: userId }],
        }).fetchAll();

        if (resources.length > 0) {
          user = resources[0];
          tenantId = user.tenantId;
        }
      }

      if (!user) {
        return null;
      }

      // Validate status transition
      const validStatuses = ['active', 'suspended', 'pending_verification', 'pending_approval', 'deleted'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Update the status
      const previousStatus = user.status;
      user.status = newStatus as UserStatus;
      user.updatedAt = new Date();

      const { resource: updatedResource } = await this.container.item(userId, tenantId).replace(user);
      const updatedUser = updatedResource as User;

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      this.monitoring?.trackEvent('user-management.status-changed', {
        userId,
        previousStatus,
        newStatus,
        adminId: adminUser.id,
      });

      return this.toResponse(updatedUser);
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.update-user-status' });
      throw new Error('Failed to update user status');
    }
  }

  /**
   * Admin password reset
   */
  async adminPasswordReset(tenantId: string, userId: string, sendEmail: boolean = true): Promise<AdminPasswordResetResponse> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      const resetToken = randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      user.updatedAt = new Date();

      await this.container.item(userId, tenantId).replace(user);

      // Send email if requested
      if (sendEmail && this.emailService && user.passwordResetToken) {
        const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
        const baseUrl = process.env.FRONTEND_URL || 
          process.env.PUBLIC_APP_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (nodeEnv === 'production' 
            ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
            : 'http://localhost:3000');
        await this.emailService.sendPasswordResetEmail(user.email, user.passwordResetToken, baseUrl);
        return {
          message: 'Password reset email sent',
        };
      }

      return {
        message: 'Password reset token generated',
        resetToken,
        expiresAt: user.passwordResetTokenExpiry.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.reset-password' });
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Add role to user
   */
  async addRoleToUser(userId: string, tenantId: string, role: string): Promise<User | null> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      // Check if role already exists
      if (user.roles.includes(role)) {
        return user; // Role already exists, return user as-is
      }

      // Add role
      user.roles = [...user.roles, role];
      user.updatedAt = new Date();

      const { resource: updatedUser } = await this.container.item(userId, tenantId).replace(user);

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return updatedUser as User;
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.add-role' });
      throw new Error('Failed to add role to user');
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, tenantId: string, role: string): Promise<User | null> {
    try {
      const { resource: user } = await this.container.item(userId, tenantId).read<User>();
      if (!user) {
        throw new Error('User not found');
      }

      // Check if role exists
      if (!user.roles.includes(role)) {
        return user; // Role doesn't exist, return user as-is
      }

      // Remove role (ensure at least 'user' role remains)
      user.roles = user.roles.filter(r => r !== role);
      if (user.roles.length === 0) {
        user.roles = ['user'];
      }
      user.updatedAt = new Date();

      const { resource: updatedUser } = await this.container.item(userId, tenantId).replace(user);

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateUserCache(userId, tenantId);
        await this.cacheService.publishCacheInvalidation(userId, tenantId);
      }

      return updatedUser as User;
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('User not found');
      }
      this.monitoring?.trackException(error as Error, { operation: 'user-management.remove-role' });
      throw new Error('Failed to remove role from user');
    }
  }

  /**
   * Get user activity (placeholder - requires activity logging system)
   */
  async getUserActivity(_tenantId: string, _userId: string, page: number = 1, limit: number = 20): Promise<UserActivityResponse> {
    // This is a placeholder. In a real implementation, you would query an activity log container
    return {
      activities: [],
      total: 0,
      page,
      limit,
    };
  }

  /**
   * Invite user
   */
  async inviteUser(tenantId: string, data: InviteUserRequest): Promise<InviteUserResponse> {
    const invitationId = randomBytes(16).toString('hex');
    const invitationToken = randomBytes(32).toString('hex');
    const expiryDays = data.expiryDays || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Check if user already exists
    const existingQuery = {
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tenantId = @tenantId',
      parameters: [
        { name: '@email', value: data.email.toLowerCase() },
        { name: '@tenantId', value: tenantId },
      ],
    };

    const { resources: existing } = await this.container.items
      .query(existingQuery, { partitionKey: tenantId })
      .fetchAll();

    if (existing.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Create user with pending status
    const user: User = {
      id: randomBytes(16).toString('hex'),
      tenantId,
      email: data.email.toLowerCase(),
      emailVerified: false,
      firstName: data.firstName,
      lastName: data.lastName,
      status: 'pending_verification' as UserStatus,
      roles: data.roles || ['user'],
      verificationToken: invitationToken,
      verificationTokenExpiry: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      partitionKey: tenantId,
    };

    try {
      await this.container.items.create(user);

      const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
      const frontendUrl = process.env.FRONTEND_URL || 
        process.env.PUBLIC_APP_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (nodeEnv === 'production' 
          ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
          : 'http://localhost:3000');
      const invitationUrl = `${frontendUrl}/auth/accept-invite/${invitationToken}`;

      // Send invitation email
      if (this.emailService) {
        // TODO: Add specific invitation email method to EmailService
        // For now, using verification email as it has similar functionality
        const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
        const baseUrl = process.env.FRONTEND_URL || 
          process.env.PUBLIC_APP_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (nodeEnv === 'production' 
            ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
            : 'http://localhost:3000');
        await this.emailService.sendVerificationEmail(data.email, invitationToken, baseUrl);
      }

      return {
        invitationId,
        email: data.email,
        expiresAt: expiresAt.toISOString(),
        invitationUrl,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'user-management.invite-user' });
      throw new Error('Failed to invite user');
    }
  }
  /**
   * Import users from CSV content
   */
  async importUsers(tenantId: string, fileContent: string): Promise<ImportResult> {
    const rows = this.parseCSV(fileContent);
    let added = 0;
    let failed = 0;
    const errors: { row: number; error: string; email?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = row.email || row.Email;

      if (!email || !email.includes('@')) {
        failed++;
        errors.push({ row: i + 2, error: 'Invalid or missing email', email });
        continue;
      }

      try {
        const roles = row.roles ? row.roles.split(',').map((r: string) => r.trim()) : ['user'];
        const firstName = row.firstName || row['First Name'] || '';
        const lastName = row.lastName || row['Last Name'] || '';

        await this.createUser(tenantId, {
          email,
          firstName,
          lastName,
          roles,
          status: 'active' as UserStatus, // Default to active for imported users, or make configurable
          sendInvite: true // Send invite so they can set password
        });
        added++;

        // Add artificial delay to prevent rate limiting if processing many
        if (i % 10 === 0) {await new Promise(resolve => setTimeout(resolve, 50));}
      } catch (error: any) {
        failed++;
        errors.push({ row: i + 2, error: error.message || 'Failed to create user', email });
      }
    }

    return { added, failed, errors };
  }

  /**
   * Simple CSV Parser
   * Assumes first row is header
   */
  private parseCSV(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {return [];}

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle simple quoted CSV (does not handle newlines in quotes)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          row[header] = values[index];
        }
      });
      result.push(row);
    }

    return result;
  }
}