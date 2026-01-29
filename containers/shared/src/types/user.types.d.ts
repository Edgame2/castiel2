/**
 * User-related types
 * @module @coder/shared/types/user
 */
/**
 * User interface
 */
export interface User {
    id: string;
    email: string;
    name: string;
    organizationId: string;
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