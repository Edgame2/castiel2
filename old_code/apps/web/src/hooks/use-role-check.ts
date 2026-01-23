export function useRoleCheck(requiredRole: string | string[]) {
    // Placeholder - integrate with actual auth context
    const user = null // TODO: Get from auth context

    if (!user) return false

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    return roles.some((role) => (user as any).role === role)
}
