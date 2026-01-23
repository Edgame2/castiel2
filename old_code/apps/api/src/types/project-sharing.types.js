/**
 * Project Sharing & Collaboration Types
 * Defines structures for project ownership, role-based access, and sharing operations
 * Supports bulk operations, notifications, and comprehensive audit trails
 */
export var ProjectRole;
(function (ProjectRole) {
    /** Full project control: sharing, linking, settings, deletion, member management */
    ProjectRole["OWNER"] = "OWNER";
    /** Can manage project, create links, but cannot delete project or change owner */
    ProjectRole["MANAGER"] = "MANAGER";
    /** Can view, create links, participate in chat, but cannot manage members or settings */
    ProjectRole["CONTRIBUTOR"] = "CONTRIBUTOR";
    /** Read-only access: view project and shards, access chat history */
    ProjectRole["VIEWER"] = "VIEWER";
})(ProjectRole || (ProjectRole = {}));
/**
 * Project role permissions matrix
 */
export const PROJECT_ROLE_PERMISSIONS = {
    [ProjectRole.OWNER]: [
        'view',
        'edit',
        'delete',
        'share',
        'manage-members',
        'transfer-ownership',
        'manage-settings',
        'link-shards',
        'create-snapshots',
        'configure-ai-questions',
        'access-templates',
        'bulk-operations',
    ],
    [ProjectRole.MANAGER]: [
        'view',
        'edit',
        'share',
        'manage-members', // Limited: can only add Contributors/Viewers
        'link-shards',
        'create-snapshots',
        'configure-ai-questions',
        'bulk-operations',
    ],
    [ProjectRole.CONTRIBUTOR]: [
        'view',
        'edit',
        'link-shards',
        'access-chat',
        'comment',
    ],
    [ProjectRole.VIEWER]: ['view', 'access-chat-history', 'view-linked-shards'],
};
//# sourceMappingURL=project-sharing.types.js.map