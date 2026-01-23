/**
 * Profile API client
 * Handles user profile operations via Next.js API routes
 */

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  tenantId: string;
  roles: string[];
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile update data
 */
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await fetch('/api/profile', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
    throw new Error(error.message || 'Failed to fetch profile');
  }

  return response.json();
}

/**
 * Update current user profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || 'Failed to update profile');
  }

  return response.json();
}
