/**
 * User Service
 * 
 * Manages user profiles, authentication, sessions, and account operations.
 * 
 * Features:
 * - Get and update user profiles
 * - List and manage user sessions
 * - Deactivate/reactivate users
 * - Delete users (hard delete after 90 days)
 */

import { getDatabaseClient } from '@coder/shared';

// TODO: These should be accessed via API calls to auth-service
// For now, we'll need to import from a shared location or make API calls
// import { revokeSession, revokeAllUserSessions } from '../services/sessionService';
// import { listUserOrganizations } from '../services/organizationService';

/**
 * User profile data
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  picture: string | null;
  function: string | null;
  speciality: string | null;
  timezone: string;
  language: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authProviders: string[];
}

/**
 * User session information
 */
export interface UserSession {
  id: string;
  organizationId: string | null;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isRememberMe: boolean;
  expiresAt: Date;
  lastActivityAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * Get user profile
 * 
 * @param userId - User ID
 * @returns Promise resolving to user profile
 * @throws Error if user not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      avatarUrl: true,
      picture: true,
      function: true,
      speciality: true,
      timezone: true,
      language: true,
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      authProviders: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const authProviders = (user.authProviders as string[]) || [];
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    picture: user.picture,
    function: user.function,
    speciality: user.speciality,
    timezone: user.timezone,
    language: user.language,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    authProviders,
  };
}

/**
 * Update user profile
 * 
 * @param userId - User ID
 * @param updates - Fields to update
 * @returns Promise resolving to updated user profile
 * @throws Error if validation fails
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    function?: string;
    speciality?: string;
    timezone?: string;
    language?: string;
  }
): Promise<UserProfile> {
  // Get current user
  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Prepare update data
  const updateData: any = {};
  
  if (updates.name !== undefined) {
    if (updates.name && updates.name.length > 200) {
      throw new Error('Name must be 200 characters or less');
    }
    updateData.name = updates.name?.trim() || null;
  }
  
  if (updates.firstName !== undefined) {
    if (updates.firstName && updates.firstName.length > 100) {
      throw new Error('First name must be 100 characters or less');
    }
    updateData.firstName = updates.firstName?.trim() || null;
  }
  
  if (updates.lastName !== undefined) {
    if (updates.lastName && updates.lastName.length > 100) {
      throw new Error('Last name must be 100 characters or less');
    }
    updateData.lastName = updates.lastName?.trim() || null;
  }
  
  if (updates.phoneNumber !== undefined) {
    if (updates.phoneNumber) {
      // Basic E.164 format validation (starts with +, followed by digits)
      if (!/^\+[1-9]\d{1,14}$/.test(updates.phoneNumber)) {
        throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
      }
      updateData.phoneNumber = updates.phoneNumber.trim();
    } else {
      updateData.phoneNumber = null;
    }
  }
  
  if (updates.avatarUrl !== undefined) {
    if (updates.avatarUrl) {
      // Validate URL format
      try {
        new URL(updates.avatarUrl);
        updateData.avatarUrl = updates.avatarUrl.trim();
      } catch {
        throw new Error('Invalid avatar URL format');
      }
    } else {
      updateData.avatarUrl = null;
    }
  }

  if (updates.function !== undefined) {
    if (updates.function && updates.function.length > 200) {
      throw new Error('Function must be 200 characters or less');
    }
    updateData.function = updates.function?.trim() || null;
  }
  
  if (updates.speciality !== undefined) {
    if (updates.speciality && updates.speciality.length > 200) {
      throw new Error('Speciality must be 200 characters or less');
    }
    updateData.speciality = updates.speciality?.trim() || null;
  }
  
  if (updates.timezone !== undefined) {
    // Validate timezone (basic check - should be a valid IANA timezone)
    if (updates.timezone && updates.timezone.length > 50) {
      throw new Error('Timezone must be 50 characters or less');
    }
    updateData.timezone = updates.timezone?.trim() || 'UTC';
  }
  
  if (updates.language !== undefined) {
    // Validate language code (ISO 639-1 format: 2 letters)
    if (updates.language && !/^[a-z]{2}$/i.test(updates.language)) {
      throw new Error('Language must be a valid ISO 639-1 code (2 letters)');
    }
    updateData.language = updates.language?.trim() || 'en';
  }
  
  // Update user
  const updated = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      avatarUrl: true,
      picture: true,
      function: true,
      speciality: true,
      timezone: true,
      language: true,
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      authProviders: true,
    },
  });
  
  const authProviders = (updated.authProviders as string[]) || [];
  
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    firstName: updated.firstName,
    lastName: updated.lastName,
    phoneNumber: updated.phoneNumber,
    avatarUrl: updated.avatarUrl,
    picture: updated.picture,
    function: updated.function,
    speciality: updated.speciality,
    timezone: updated.timezone,
    language: updated.language,
    isEmailVerified: updated.isEmailVerified,
    isActive: updated.isActive,
    lastLoginAt: updated.lastLoginAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    authProviders,
  };
}

/**
 * List user sessions
 * 
 * @param userId - User ID
 * @param currentSessionId - Current session ID to mark
 * @returns Promise resolving to array of user sessions
 */
export async function listUserSessions(userId: string, currentSessionId?: string): Promise<any[]> {
  const db = getDatabaseClient();
  const sessions = await db.session.findMany({
    where: {
      userId,
      revokedAt: null, // Only return active sessions
    },
    select: {
      id: true,
      organizationId: true,
      deviceName: true,
      deviceType: true,
      deviceFingerprint: true,
      ipAddress: true,
      userAgent: true,
      country: true,
      city: true,
      isRememberMe: true,
      expiresAt: true,
      lastActivityAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return sessions.map(s => ({
    id: s.id,
    organizationId: s.organizationId,
    deviceName: s.deviceName,
    deviceType: s.deviceType,
    deviceFingerprint: s.deviceFingerprint,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    country: s.country,
    city: s.city,
    isRememberMe: s.isRememberMe,
    expiresAt: s.expiresAt,
    lastActivityAt: s.lastActivityAt || s.createdAt,
    createdAt: s.createdAt,
    revokedAt: s.revokedAt,
    isCurrent: s.id === currentSessionId, // Mark current session
  }));
}

/**
 * Revoke a specific user session
 * 
 * @param userId - User ID (for verification)
 * @param sessionId - Session ID to revoke
 * @returns Promise resolving when session is revoked
 * @throws Error if session not found or doesn't belong to user
 */
export async function revokeUserSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const db = getDatabaseClient();
  // Verify session belongs to user
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.userId !== userId) {
    throw new Error('Session does not belong to this user');
  }
  
  // Revoke session
  await db.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all other sessions (keep current session)
 * 
 * @param userId - User ID
 * @param currentSessionId - Current session ID to keep
 * @returns Promise resolving when sessions are revoked
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<void> {
  const db = getDatabaseClient();
  // Revoke all active sessions except current
  await db.session.updateMany({
    where: {
      userId,
      id: { not: currentSessionId },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * Deactivate user account
 * 
 * @param userId - User ID to deactivate
 * @param deactivatedBy - User ID performing the deactivation
 * @returns Promise resolving when user is deactivated
 * @throws Error if permission denied
 */
export async function deactivateUser(
  userId: string,
  deactivatedBy: string
): Promise<void> {
  const db = getDatabaseClient();
  // Check if deactivator is Super Admin in at least one organization
  // For now, allow self-deactivation or Super Admin deactivation
  if (userId !== deactivatedBy) {
    // Check if deactivator is Super Admin in any organization
    const memberships = await db.organizationMembership.findMany({
      where: {
        userId: deactivatedBy,
        status: 'active',
      },
      include: { role: true },
    });
    
    const isSuperAdmin = memberships.some(m => m.role.isSuperAdmin);
    
    if (!isSuperAdmin) {
      throw new Error('Permission denied. Only Super Admin can deactivate other users.');
    }
  }
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.isActive) {
    throw new Error('User is already deactivated');
  }
  
  // Deactivate user
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deletedAt: new Date(), // Soft delete
    },
  });
  
  // Revoke all sessions
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * Reactivate user account
 * 
 * @param userId - User ID to reactivate
 * @param reactivatedBy - User ID performing the reactivation
 * @returns Promise resolving when user is reactivated
 * @throws Error if permission denied
 */
export async function reactivateUser(
  userId: string,
  reactivatedBy: string
): Promise<void> {
  const db = getDatabaseClient();
  // Check if reactivator is Super Admin
  const memberships = await db.organizationMembership.findMany({
    where: {
      userId: reactivatedBy,
      status: 'active',
    },
    include: { role: true },
  });
  
  const isSuperAdmin = memberships.some(m => m.role.isSuperAdmin);
  
  if (!isSuperAdmin) {
    throw new Error('Permission denied. Only Super Admin can reactivate users.');
  }
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.isActive) {
    throw new Error('User is already active');
  }
  
  // Reactivate user
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      deletedAt: null, // Remove soft delete
    },
  });
}

/**
 * Delete user account (hard delete after 90 days grace period)
 * 
 * @param userId - User ID to delete
 * @param deletedBy - User ID performing the deletion
 * @returns Promise resolving when user is deleted
 * @throws Error if permission denied or grace period not expired
 */
export async function deleteUser(
  userId: string,
  deletedBy: string
): Promise<void> {
  const db = getDatabaseClient();
  // Check if deleter is Super Admin
  const memberships = await db.organizationMembership.findMany({
    where: {
      userId: deletedBy,
      status: 'active',
    },
    include: { role: true },
  });
  
  const isSuperAdmin = memberships.some(m => m.role.isSuperAdmin);
  
  if (!isSuperAdmin) {
    throw new Error('Permission denied. Only Super Admin can delete users.');
  }
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if user is soft-deleted
  if (!user.deletedAt) {
    throw new Error('User must be soft-deleted first. Use deactivateUser instead.');
  }
  
  // Check if 90 days have passed since soft delete
  const daysSinceDeletion = (Date.now() - user.deletedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceDeletion < 90) {
    const daysRemaining = Math.ceil(90 - daysSinceDeletion);
    throw new Error(`User can only be permanently deleted after 90 days. ${daysRemaining} days remaining.`);
  }
  
  // Hard delete user (cascade will handle related records)
  await db.user.delete({
    where: { id: userId },
  });
}

