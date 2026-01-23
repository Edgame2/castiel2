/**
 * Auth Provider Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { linkGoogleProvider, unlinkProvider, getLinkedProviders } from '../../../src/services/AuthProviderService';

// Mock database
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

// Mock event publisher
vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  publishEventSafely: vi.fn(),
}));

// Mock logging service
vi.mock('../../../src/services/LoggingService', () => ({
  getLoggingService: vi.fn(() => ({
    logFromRequest: vi.fn(async () => {}),
  })),
}));

// Mock Google OAuth
const mockGetGoogleUserInfo = vi.fn();
vi.mock('../../../src/services/providers/GoogleOAuth', () => ({
  getGoogleUserInfo: (...args: any[]) => mockGetGoogleUserInfo(...args),
}));

describe('AuthProviderService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      userAuthProvider: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
    };
    
    (getDatabaseClient as any).mockReturnValue(mockDb);
    
    // Default mock for getGoogleUserInfo - will be overridden in specific tests
    mockGetGoogleUserInfo.mockResolvedValue({
      id: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
    });
  });

  describe('linkGoogleProvider', () => {
    it('should link Google provider successfully', async () => {
      const userId = 'user-123';
      const userEmail = 'test@example.com';
      const googleAccessToken = 'google-access-token';
      
      // Mock getGoogleUserInfo to return email matching user email
      mockGetGoogleUserInfo.mockResolvedValue({
        id: 'google-123',
        email: userEmail, // Match user email
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      });
      
      mockDb.user.findUnique
        .mockResolvedValueOnce({
          id: userId,
          email: userEmail,
          googleId: null,
          authProviders: [],
        })
        .mockResolvedValueOnce(null); // No existing user with this googleId
      
      mockDb.user.update.mockResolvedValue({
        id: userId,
        email: userEmail,
        googleId: 'google-123',
      });

      await linkGoogleProvider(userId, googleAccessToken);

      expect(mockDb.user.update).toHaveBeenCalled();
      expect(mockGetGoogleUserInfo).toHaveBeenCalledWith(googleAccessToken);
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user';
      const googleAccessToken = 'google-access-token';
      
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(linkGoogleProvider(userId, googleAccessToken)).rejects.toThrow('User not found');
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if provider already linked', async () => {
      const userId = 'user-123';
      const googleAccessToken = 'google-access-token';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        googleId: 'already-linked-google-id',
        authProviders: [],
      });

      await expect(linkGoogleProvider(userId, googleAccessToken)).rejects.toThrow('already linked');
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });

  describe('unlinkProvider', () => {
    it('should unlink provider successfully', async () => {
      const userId = 'user-123';
      const provider = 'google';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        authProviders: [],
      });
      
      mockDb.userAuthProvider.findUnique.mockResolvedValue({
        id: 'provider-123',
        userId,
        provider: 'google',
      });
      
      mockDb.userAuthProvider.findMany.mockResolvedValue([
        { id: 'provider-123', provider: 'google' },
        { id: 'provider-456', provider: 'github' },
      ]);
      
      mockDb.userAuthProvider.delete.mockResolvedValue({});

      await unlinkProvider(userId, provider);

      expect(mockDb.userAuthProvider.delete).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user';
      const provider = 'google';
      
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(unlinkProvider(userId, provider)).rejects.toThrow('User not found');
      expect(mockDb.userAuthProvider.delete).not.toHaveBeenCalled();
    });

    it('should throw error if provider not linked', async () => {
      const userId = 'user-123';
      const provider = 'google';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        authProviders: [],
      });
      
      mockDb.userAuthProvider.findUnique.mockResolvedValue(null);
      mockDb.userAuthProvider.findMany.mockResolvedValue([]);

      await expect(unlinkProvider(userId, provider)).rejects.toThrow();
      expect(mockDb.userAuthProvider.delete).not.toHaveBeenCalled();
    });

    it('should prevent unlinking last provider if user has no password', async () => {
      const userId = 'user-123';
      const provider = 'google';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: null, // No password
        createdAt: new Date(),
        authProviders: [],
      });
      
      mockDb.userAuthProvider.findUnique.mockResolvedValue({
        id: 'provider-123',
        userId,
        provider: 'google',
      });
      
      mockDb.userAuthProvider.findMany.mockResolvedValue([
        { id: 'provider-123', provider: 'google' },
      ]); // Only one provider

      await expect(unlinkProvider(userId, provider)).rejects.toThrow('last authentication method');
      expect(mockDb.userAuthProvider.delete).not.toHaveBeenCalled();
    });
  });

  describe('getLinkedProviders', () => {
    it('should return all linked providers for a user', async () => {
      const userId = 'user-123';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        authProviders: [],
      });
      
      const providers = [
        { id: 'provider-1', provider: 'google', providerUserId: 'google-123', isPrimary: false, linkedAt: new Date(), lastUsedAt: null },
        { id: 'provider-2', provider: 'github', providerUserId: 'github-456', isPrimary: false, linkedAt: new Date(), lastUsedAt: null },
      ];
      
      mockDb.userAuthProvider.findMany.mockResolvedValue(providers);

      const result = await getLinkedProviders(userId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockDb.user.findUnique).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user';
      
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(getLinkedProviders(userId)).rejects.toThrow('User not found');
    });
  });
});

