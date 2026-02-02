/**
 * Authentication Provider Service
 * 
 * Manages linking and unlinking of authentication providers (OAuth, email/password).
 * 
 * Features:
 * - Link OAuth providers to existing accounts
 * - Unlink authentication providers
 * - Prevent unlinking last authentication method
 * - Track linked providers in authProviders JSON field
 * - Validate provider linking requests
 */

import { getDatabaseClient } from '@coder/shared';
import { getGoogleUserInfo } from '../services/providers/GoogleOAuth';

/**
 * Supported authentication providers
 */
export type AuthProvider = 'password' | 'google' | 'github' | 'azure_ad' | 'okta';

/**
 * Get list of linked authentication providers for a user
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of provider names
 */
export async function getLinkedProviders(userId: string): Promise<Array<{
  provider: AuthProvider;
  isPrimary: boolean;
  linkedAt: Date;
  lastUsedAt: Date | null;
}>> {
  const db = getDatabaseClient() as any;
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { 
      id: true,
      passwordHash: true,
      createdAt: true,
      authProviders: true, // Legacy JSON field
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get providers from UserAuthProvider table
  const authProviders = await db.userAuthProvider.findMany({
    where: { userId },
    orderBy: { linkedAt: 'desc' },
  });

  // Also check for password provider (stored in passwordHash)
  const providers: Array<{
    provider: AuthProvider;
    isPrimary: boolean;
    linkedAt: Date;
    lastUsedAt: Date | null;
  }> = [];

  if (user.passwordHash) {
    providers.push({
      provider: 'password',
      isPrimary: authProviders.length === 0, // Primary if no other providers
      linkedAt: user.createdAt, // Approximate
      lastUsedAt: null,
    });
  }

  // Add providers from UserAuthProvider table
  for (const ap of authProviders) {
    providers.push({
      provider: ap.provider as AuthProvider,
      isPrimary: ap.isPrimary,
      linkedAt: ap.linkedAt,
      lastUsedAt: ap.lastUsedAt,
    });
  }

  return providers;
}

/**
 * Link Google OAuth to an existing account
 * 
 * @param userId - User ID
 * @param googleAccessToken - Google OAuth access token
 * @returns Promise resolving when provider is linked
 * @throws Error if linking fails
 */
export async function linkGoogleProvider(
  userId: string,
  googleAccessToken: string
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      googleId: true,
      authProviders: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if already linked
  if (user.googleId) {
    throw new Error('Google account is already linked');
  }
  
  // Get Google user info
  const googleUser = await getGoogleUserInfo(googleAccessToken);
  
  // Check if Google account is already linked to another user
  const existingGoogleUser = await db.user.findUnique({
    where: { googleId: googleUser.id },
  });
  
  if (existingGoogleUser && existingGoogleUser.id !== userId) {
    throw new Error('This Google account is already linked to another user');
  }
  
  // Verify email matches (security: prevent account takeover)
  if (googleUser.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Google account email must match your account email');
  }
  
  // Update user with Google ID
  const currentProviders = (user.authProviders as AuthProvider[]) || [];
  const updatedProviders = Array.from(new Set([...currentProviders, 'google'])) as AuthProvider[];
  
  await db.user.update({
    where: { id: userId },
    data: {
      googleId: googleUser.id,
      picture: googleUser.picture || user.picture || undefined,
      authProviders: updatedProviders,
    },
  });
}

/**
 * Unlink an authentication provider from user account
 * 
 * Prevents unlinking if it's the last authentication method.
 * 
 * @param userId - User ID
 * @param provider - Provider to unlink ('google' or 'email')
 * @returns Promise resolving when provider is unlinked
 * @throws Error if unlinking fails or would leave user without auth method
 */
export async function unlinkProvider(
  userId: string,
  provider: AuthProvider
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      authProviders: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get all linked providers
  const authProviders = await db.userAuthProvider.findMany({
    where: { userId },
  });
  
  // Count available authentication methods
  const hasPassword = !!user.passwordHash;
  const providerCount = authProviders.length;
  const methodCount = (hasPassword ? 1 : 0) + providerCount;
  
  // Prevent unlinking last authentication method
  if (methodCount <= 1) {
    throw new Error('Cannot unlink your last authentication method. Please add another method first.');
  }
  
  // Unlink provider
  if (provider === 'password') {
    if (!user.passwordHash) {
      throw new Error('Email/password authentication is not set up');
    }
    
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: null,
      },
    });
    
    // Update authProviders JSON field
    const currentProviders = (user.authProviders as AuthProvider[]) || [];
    const updatedProviders = currentProviders.filter((p: string) => p !== 'password' && p !== 'email') as AuthProvider[];
    await db.user.update({
      where: { id: userId },
      data: {
        authProviders: updatedProviders.length > 0 ? updatedProviders : null,
      },
    });
  } else {
    // Unlink OAuth/SSO provider from UserAuthProvider table
    const authProvider = await db.userAuthProvider.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });
    
    if (!authProvider) {
      throw new Error(`${provider} account is not linked`);
    }
    
    await db.userAuthProvider.delete({
      where: { id: authProvider.id },
    });
    
    // Also update legacy googleId field if it's Google
    if (provider === 'google') {
      await db.user.update({
        where: { id: userId },
        data: {
          googleId: null,
        },
      });
    }
    
    // Update authProviders JSON field
    const currentProviders = (user.authProviders as AuthProvider[]) || [];
    const updatedProviders = currentProviders.filter(p => p !== provider) as AuthProvider[];
    await db.user.update({
      where: { id: userId },
      data: {
        authProviders: updatedProviders.length > 0 ? updatedProviders : null,
      },
    });
  }
}



