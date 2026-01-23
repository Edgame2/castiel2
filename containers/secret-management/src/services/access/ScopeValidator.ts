/**
 * Scope Validator
 * 
 * Validates secret scopes and resolves scope context.
 */

import { SecretScope, ScopeContext } from '../../types';
import { InvalidScopeError } from '../../errors/SecretErrors';

export class ScopeValidator {
  /**
   * Validate scope and context match
   */
  static validateScope(scope: SecretScope, context: ScopeContext): boolean {
    switch (scope) {
      case 'GLOBAL':
        // Global secrets require super admin (checked separately)
        return true;
      
      case 'ORGANIZATION':
        if (!context.organizationId) {
          return false;
        }
        return true;
      
      case 'TEAM':
        if (!context.organizationId || !context.teamId) {
          return false;
        }
        return true;
      
      case 'PROJECT':
        if (!context.organizationId || !context.projectId) {
          return false;
        }
        return true;
      
      case 'USER':
        if (!context.userId) {
          return false;
        }
        // User secrets belong to the user
        return true;
      
      default:
        throw new InvalidScopeError(scope as string);
    }
  }
  
  /**
   * Get required context fields for a scope
   */
  static getRequiredContext(scope: SecretScope): (keyof ScopeContext)[] {
    switch (scope) {
      case 'GLOBAL':
        return ['userId']; // User ID for audit
      
      case 'ORGANIZATION':
        return ['userId', 'organizationId'];
      
      case 'TEAM':
        return ['userId', 'organizationId', 'teamId'];
      
      case 'PROJECT':
        return ['userId', 'organizationId', 'projectId'];
      
      case 'USER':
        return ['userId'];
      
      default:
        throw new InvalidScopeError(scope as string);
    }
  }
  
  /**
   * Check if user can access scope
   */
  static canAccessScope(
    requestedScope: SecretScope,
    userContext: ScopeContext,
    userRoles?: string[]
  ): boolean {
    // Super admin can access all scopes
    if (userRoles?.includes('Super Admin')) {
      return true;
    }
    
    // Validate scope matches context
    if (!this.validateScope(requestedScope, userContext)) {
      return false;
    }
    
    // Additional checks based on scope
    switch (requestedScope) {
      case 'GLOBAL':
        // Only super admin
        return userRoles?.includes('Super Admin') || false;
      
      case 'ORGANIZATION':
        // User must be member of organization
        return userContext.organizationId !== undefined;
      
      case 'TEAM':
        // User must be member of team
        return userContext.organizationId !== undefined && userContext.teamId !== undefined;
      
      case 'PROJECT':
        // User must have access to project
        return userContext.organizationId !== undefined && userContext.projectId !== undefined;
      
      case 'USER':
        // User can only access their own secrets
        return true;
      
      default:
        return false;
    }
  }
  
  /**
   * Resolve scope from context
   */
  static resolveScope(context: ScopeContext): SecretScope {
    if (context.projectId) {
      return 'PROJECT';
    }
    if (context.teamId) {
      return 'TEAM';
    }
    if (context.organizationId) {
      return 'ORGANIZATION';
    }
    return 'USER';
  }
}
