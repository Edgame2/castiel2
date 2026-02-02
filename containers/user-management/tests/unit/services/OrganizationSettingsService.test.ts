/**
 * Unit tests for OrganizationSettingsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as OrganizationSettingsService from '../../../src/services/OrganizationSettingsService';
import { getDatabaseClient } from '@coder/shared';

const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

const mockGetDatabaseClient = vi.mocked(getDatabaseClient);

describe('OrganizationSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockGetDatabaseClient.mockReturnValue({
      organization: { findUnique: mockFindUnique, update: mockUpdate },
      organizationMembership: { findFirst: mockFindFirst },
      role: { findUnique: vi.fn() },
    } as any);
  });

  describe('getOrganizationSettings', () => {
    it('throws when organization not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        OrganizationSettingsService.getOrganizationSettings('org-1', 'user-1')
      ).rejects.toThrow('Organization not found');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        select: { id: true, settings: true },
      });
    });

    it('throws when user is not a member', async () => {
      mockFindUnique.mockResolvedValue({ id: 'org-1', settings: {} });
      mockFindFirst.mockResolvedValue(null);

      await expect(
        OrganizationSettingsService.getOrganizationSettings('org-1', 'user-1')
      ).rejects.toThrow('You are not a member of this organization');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', organizationId: 'org-1', status: 'active' },
      });
    });

    it('returns organization settings when org and membership exist', async () => {
      const settings = { branding: { primaryColor: '#FF0000' } };
      mockFindUnique.mockResolvedValue({ id: 'org-1', settings });
      mockFindFirst.mockResolvedValue({ id: 'mem-1' });

      const result = await OrganizationSettingsService.getOrganizationSettings('org-1', 'user-1');

      expect(result).toEqual(settings);
    });

    it('returns empty object when organization has no settings', async () => {
      mockFindUnique.mockResolvedValue({ id: 'org-1', settings: null });
      mockFindFirst.mockResolvedValue({ id: 'mem-1' });

      const result = await OrganizationSettingsService.getOrganizationSettings('org-1', 'user-1');

      expect(result).toEqual({});
    });
  });

  describe('updateOrganizationSettings', () => {
    it('throws when organization not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        OrganizationSettingsService.updateOrganizationSettings('org-1', 'user-1', {})
      ).rejects.toThrow('Organization not found');
    });

    it('throws permission denied when user is not owner or Super Admin', async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: 'org-1', settings: {}, ownerUserId: 'other-owner' })
        .mockResolvedValueOnce({ id: 'org-1', settings: {}, ownerUserId: 'other-owner' });
      mockFindFirst.mockResolvedValue({
        id: 'mem-1',
        role: { isSuperAdmin: false },
      });

      await expect(
        OrganizationSettingsService.updateOrganizationSettings('org-1', 'user-1', { branding: { primaryColor: '#FF0000' } })
      ).rejects.toThrow('Permission denied');
    });

    it('updates settings when user is owner', async () => {
      const currentSettings = {};
      mockFindUnique.mockImplementation(() =>
        Promise.resolve({ id: 'org-1', settings: currentSettings, ownerUserId: 'user-1' })
      );
      mockFindFirst.mockResolvedValue({ id: 'mem-1', role: { isSuperAdmin: false } });
      mockUpdate.mockResolvedValue({});

      const result = await OrganizationSettingsService.updateOrganizationSettings('org-1', 'user-1', {
        branding: { primaryColor: '#FF0000', accentColor: '#00FF00' },
      });

      expect(result.branding).toEqual({ primaryColor: '#FF0000', accentColor: '#00FF00' });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { settings: expect.objectContaining({ branding: { primaryColor: '#FF0000', accentColor: '#00FF00' } }) },
      });
    });

    it('throws when primary color is invalid hex', async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: 'org-1', settings: {}, ownerUserId: 'user-1' })
        .mockResolvedValueOnce({ id: 'org-1', settings: {}, ownerUserId: 'user-1' });
      mockFindFirst.mockResolvedValue({ id: 'mem-1', role: { isSuperAdmin: false } });

      await expect(
        OrganizationSettingsService.updateOrganizationSettings('org-1', 'user-1', {
          branding: { primaryColor: 'not-a-hex' },
        })
      ).rejects.toThrow('Invalid primary color format');
    });
  });
});
