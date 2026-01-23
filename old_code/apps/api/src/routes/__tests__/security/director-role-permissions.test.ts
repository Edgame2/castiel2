/**
 * Director Role Permission Tests
 * 
 * Tests for Director role permission validation.
 * Verifies that Director role has correct permissions as defined in roles.ts.
 * 
 * Tests cover:
 * - Director role enum definition
 * - Director permissions in RolePermissions
 * - Director permissions in ShardTypeRolePermissions
 * - Permission checking functions
 * - Director vs Manager vs Admin permission differences
 */

import { describe, it, expect } from 'vitest';
import {
  UserRole,
  RolePermissions,
  ShardTypeRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
} from '@castiel/shared-types';

describe('Director Role Permission Tests', () => {
  describe('Role Enum Definition', () => {
    it('should have DIRECTOR in UserRole enum', () => {
      expect(UserRole.DIRECTOR).toBe('director');
      expect(Object.values(UserRole)).toContain(UserRole.DIRECTOR);
    });

    it('should have DIRECTOR positioned correctly in hierarchy', () => {
      const roles = Object.values(UserRole);
      const directorIndex = roles.indexOf(UserRole.DIRECTOR);
      const managerIndex = roles.indexOf(UserRole.MANAGER);
      const adminIndex = roles.indexOf(UserRole.ADMIN);

      // DIRECTOR should be between ADMIN and MANAGER
      expect(directorIndex).toBeGreaterThan(managerIndex);
      expect(directorIndex).toBeLessThan(adminIndex);
    });
  });

  describe('ShardType Permissions', () => {
    it('should have shard-type:read:all permission', () => {
      const permissions = ShardTypeRolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard-type:read:all');
    });

    it('should have same shard-type permissions as Manager', () => {
      const directorPerms = ShardTypeRolePermissions[UserRole.DIRECTOR];
      const managerPerms = ShardTypeRolePermissions[UserRole.MANAGER];
      expect(directorPerms).toEqual(managerPerms);
    });
  });

  describe('Shard Permissions', () => {
    it('should have shard:create:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:create:own');
    });

    it('should have shard:read:all permission (department-level access)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:read:all');
    });

    it('should have shard:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:read:team');
    });

    it('should have shard:read:assigned permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:read:assigned');
    });

    it('should have shard:update:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:update:own');
    });

    it('should have shard:delete:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('shard:delete:own');
    });

    it('should NOT have shard:update:all permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('shard:update:all');
    });

    it('should NOT have shard:delete:all permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('shard:delete:all');
    });
  });

  describe('Team Management Permissions', () => {
    it('should have team:read:tenant permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('team:read:tenant');
    });

    it('should have team:read:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('team:read:own');
    });

    it('should have team:update:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('team:update:own');
    });
  });

  describe('User Management Permissions', () => {
    it('should have user:read:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('user:read:own');
    });

    it('should have user:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('user:read:team');
    });

    it('should have user:read:tenant permission (department-level)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('user:read:tenant');
    });

    it('should have user:update:own permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('user:update:own');
    });

    it('should NOT have user:create:tenant permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('user:create:tenant');
    });

    it('should NOT have user:delete:tenant permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('user:delete:tenant');
    });
  });

  describe('Analytics and Dashboard Permissions', () => {
    it('should have dashboard:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('dashboard:read:team');
    });

    it('should have dashboard:read:tenant permission (department-level)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('dashboard:read:tenant');
    });

    it('should have quota:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('quota:read:team');
    });

    it('should have quota:read:tenant permission (department-level)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('quota:read:tenant');
    });

    it('should have pipeline:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('pipeline:read:team');
    });

    it('should have pipeline:read:tenant permission (department-level)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('pipeline:read:tenant');
    });

    it('should have risk:read:team permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('risk:read:team');
    });

    it('should have risk:read:tenant permission (department-level)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('risk:read:tenant');
    });
  });

  describe('Strategic Analytics Permissions', () => {
    it('should have audit:read:tenant permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('audit:read:tenant');
    });

    it('should NOT have audit:export:tenant permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('audit:export:tenant');
    });
  });

  describe('Integration Permissions', () => {
    it('should have integration:read:tenant permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('integration:read:tenant');
    });

    it('should have integration:search:tenant permission', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).toContain('integration:search:tenant');
    });

    it('should NOT have integration:create:tenant permission (Admin only)', () => {
      const permissions = RolePermissions[UserRole.DIRECTOR];
      expect(permissions).not.toContain('integration:create:tenant');
    });
  });

  describe('Permission Checking Functions', () => {
    it('should return true for hasPermission with valid Director permission', () => {
      expect(hasPermission(UserRole.DIRECTOR, 'shard:read:all')).toBe(true);
      expect(hasPermission(UserRole.DIRECTOR, 'risk:read:tenant')).toBe(true);
      expect(hasPermission(UserRole.DIRECTOR, 'quota:read:tenant')).toBe(true);
    });

    it('should return false for hasPermission with invalid Director permission', () => {
      expect(hasPermission(UserRole.DIRECTOR, 'shard:update:all')).toBe(false);
      expect(hasPermission(UserRole.DIRECTOR, 'user:create:tenant')).toBe(false);
      expect(hasPermission(UserRole.DIRECTOR, 'admin:only:permission')).toBe(false);
    });

    it('should return true for hasAnyPermission when Director has at least one', () => {
      const permissions = ['shard:read:all', 'invalid:permission', 'another:invalid'];
      expect(hasAnyPermission(UserRole.DIRECTOR, permissions)).toBe(true);
    });

    it('should return false for hasAnyPermission when Director has none', () => {
      const permissions = ['invalid:permission', 'another:invalid'];
      expect(hasAnyPermission(UserRole.DIRECTOR, permissions)).toBe(false);
    });

    it('should return true for hasAllPermissions when Director has all', () => {
      const permissions = ['shard:read:all', 'risk:read:tenant', 'quota:read:tenant'];
      expect(hasAllPermissions(UserRole.DIRECTOR, permissions)).toBe(true);
    });

    it('should return false for hasAllPermissions when Director missing one', () => {
      const permissions = ['shard:read:all', 'shard:update:all'];
      expect(hasAllPermissions(UserRole.DIRECTOR, permissions)).toBe(false);
    });

    it('should return correct permissions for getPermissionsForRole', () => {
      const permissions = getPermissionsForRole(UserRole.DIRECTOR);
      expect(permissions).toBeInstanceOf(Array);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('shard:read:all');
      expect(permissions).toContain('risk:read:tenant');
    });
  });

  describe('Director vs Manager Permission Comparison', () => {
    it('should have all Manager permissions plus additional tenant-level permissions', () => {
      const directorPerms = RolePermissions[UserRole.DIRECTOR];
      const managerPerms = RolePermissions[UserRole.MANAGER];

      // Director should have all Manager permissions
      managerPerms.forEach(perm => {
        expect(directorPerms).toContain(perm);
      });

      // Director should have additional tenant-level permissions
      expect(directorPerms).toContain('shard:read:all');
      expect(directorPerms).toContain('user:read:tenant');
      expect(directorPerms).toContain('dashboard:read:tenant');
      expect(directorPerms).toContain('quota:read:tenant');
      expect(directorPerms).toContain('pipeline:read:tenant');
      expect(directorPerms).toContain('risk:read:tenant');
      expect(directorPerms).toContain('audit:read:tenant');
    });
  });

  describe('Director vs Admin Permission Comparison', () => {
    it('should NOT have Admin-only write permissions', () => {
      const directorPerms = RolePermissions[UserRole.DIRECTOR];
      const adminPerms = RolePermissions[UserRole.ADMIN];

      // Director should not have admin write permissions
      expect(directorPerms).not.toContain('shard:update:all');
      expect(directorPerms).not.toContain('shard:delete:all');
      expect(directorPerms).not.toContain('user:create:tenant');
      expect(directorPerms).not.toContain('user:delete:tenant');
      expect(directorPerms).not.toContain('role:create:tenant');
      expect(directorPerms).not.toContain('role:delete:tenant');
    });

    it('should have read-only tenant-level access like Admin but not write access', () => {
      const directorPerms = RolePermissions[UserRole.DIRECTOR];
      
      // Director has tenant-level read access
      expect(directorPerms).toContain('shard:read:all');
      expect(directorPerms).toContain('user:read:tenant');
      
      // But not write access
      expect(directorPerms).not.toContain('shard:create:tenant');
      expect(directorPerms).not.toContain('shard:update:all');
    });
  });
});


