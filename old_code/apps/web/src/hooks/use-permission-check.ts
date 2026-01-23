import { useAuth } from '@/contexts/auth-context'
import { UserRole, hasPermission, hasAnyPermission, type Permission } from '@castiel/shared-types'

/**
 * Map frontend role string to UserRole enum
 */
function mapRoleToUserRole(role?: string | null): UserRole | null {
    if (!role) return null
    
    const normalizedRole = role.toLowerCase().replace(/-/g, '_')
    
    // Map common role variations to UserRole enum
    switch (normalizedRole) {
        case 'super_admin':
        case 'superadmin':
        case 'super-admin':
            return UserRole.SUPER_ADMIN
        case 'admin':
        case 'owner':
        case 'tenant_admin':
            return UserRole.ADMIN
        case 'director':
            return UserRole.DIRECTOR
        case 'manager':
            return UserRole.MANAGER
        case 'user':
            return UserRole.USER
        case 'guest':
        case 'read_only':
            return UserRole.GUEST
        default:
            // Try to match directly
            if (Object.values(UserRole).includes(normalizedRole as UserRole)) {
                return normalizedRole as UserRole
            }
            return null
    }
}

/**
 * Hook to check if the current user has a specific permission
 * Uses role-based permission system from shared-types
 * 
 * @param permission - Single permission or array of permissions to check
 * @returns true if user has at least one of the specified permissions
 * 
 * @example
 * ```tsx
 * const canReadRisks = usePermissionCheck('risk:read:team')
 * const canManageQuotas = usePermissionCheck(['quota:read:tenant', 'quota:create:tenant'])
 * ```
 */
export function usePermissionCheck(permission: string | string[]): boolean {
    const { user } = useAuth()

    if (!user) return false

    // Get user role - try role field first, then roles array
    const userRole = user.role || user.roles?.[0]
    const mappedRole = mapRoleToUserRole(userRole)
    
    if (!mappedRole) {
        // Fallback: check if permissions are explicitly in user object
        const permissions = Array.isArray(permission) ? permission : [permission]
        const userPermissions = user.permissions || []
        return permissions.some((perm) => userPermissions.includes(perm))
    }

    // Use role-based permission checking
    const permissions = Array.isArray(permission) ? permission : [permission]
    return hasAnyPermission(mappedRole, permissions as Permission[])
}
