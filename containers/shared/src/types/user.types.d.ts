/**
 * User-related types
 * @module @coder/shared/types/user
 */
/**
 * User interface.
 * Users and all platform data are scoped by tenantId.
 */
export interface User {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * User reference (lightweight)
 */
export interface UserReference {
    id: string;
    name: string;
    email: string;
}
//# sourceMappingURL=user.types.d.ts.map