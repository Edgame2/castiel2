/**
 * Unit tests for Scope Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScopeValidator } from '../../../../src/services/access/ScopeValidator';
import { SecretContext } from '../../../../src/types';

describe('ScopeValidator', () => {
  let context: SecretContext;

  beforeEach(() => {
    context = {
      userId: 'user-123',
      organizationId: 'org-123',
      teamId: 'team-123',
      projectId: 'project-123',
      consumerModule: 'test-module',
      consumerResourceId: 'resource-123',
    };
  });

  describe('validateScope', () => {
    it('should validate GLOBAL scope', () => {
      const result = ScopeValidator.validateScope('GLOBAL', context);
      expect(result).toBe(true);
    });

    it('should validate ORGANIZATION scope with organizationId', () => {
      const result = ScopeValidator.validateScope('ORGANIZATION', context);
      expect(result).toBe(true);
    });

    it('should invalidate ORGANIZATION scope without organizationId', () => {
      const contextWithoutOrg = {
        ...context,
        organizationId: undefined,
      };
      
      const result = ScopeValidator.validateScope('ORGANIZATION', contextWithoutOrg);
      expect(result).toBe(false);
    });

    it('should validate TEAM scope with teamId', () => {
      const result = ScopeValidator.validateScope('TEAM', context);
      expect(result).toBe(true);
    });

    it('should invalidate TEAM scope without teamId', () => {
      const contextWithoutTeam = {
        ...context,
        teamId: undefined,
      };
      
      const result = ScopeValidator.validateScope('TEAM', contextWithoutTeam);
      expect(result).toBe(false);
    });

    it('should validate PROJECT scope with projectId', () => {
      const result = ScopeValidator.validateScope('PROJECT', context);
      expect(result).toBe(true);
    });

    it('should invalidate PROJECT scope without projectId', () => {
      const contextWithoutProject = {
        ...context,
        projectId: undefined,
      };
      
      const result = ScopeValidator.validateScope('PROJECT', contextWithoutProject);
      expect(result).toBe(false);
    });

    it('should validate USER scope', () => {
      const result = ScopeValidator.validateScope('USER', context);
      expect(result).toBe(true);
    });
  });
});


