# Collaboration & Organization Module - Views & UI Components

**Last Updated:** 2025-01-27  
**Purpose:** Comprehensive list of all views and UI components needed for the Collaboration & Organization modules

---

## Table of Contents

1. [Authentication Views](#authentication-views)
2. [User Management Views](#user-management-views)
3. [Team Management Views](#team-management-views)
4. [Organization Management Views](#organization-management-views)
5. [RBAC & Permissions Views](#rbac--permissions-views)
6. [Shared Components](#shared-components)
7. [Layout Components](#layout-components)
8. [Implementation Priority](#implementation-priority)

---

## Authentication Views

### 1. Login View
**Location:** `src/renderer/views/auth/LoginView.tsx`

**Purpose:** User authentication entry point

**Components:**
- Login form container
- Google OAuth button
- Email/password login form (if supported)
- "Remember me" checkbox
- Forgot password link
- Terms & privacy links
- Loading state indicators

**UI Elements:**
- Large application logo
- Welcome message
- OAuth provider buttons with icons
- Input fields (email, password)
- Primary action button ("Sign in")
- Error message display
- Success message display

**Features:**
- Initiate Google OAuth flow
- Handle OAuth callback
- Token storage via IPC
- Redirect to main app after login
- Error handling and display

---

### 2. OAuth Callback View
**Location:** `src/renderer/views/auth/OAuthCallbackView.tsx`

**Purpose:** Handle OAuth redirect and token extraction

**Components:**
- Loading spinner
- Processing message
- Error display (if OAuth fails)
- Redirect handler

**UI Elements:**
- Centered loading spinner
- "Signing you in..." message
- Progress indicator
- Error message with retry button

**Features:**
- Extract token from URL
- Store token securely
- Fetch user profile
- Redirect to dashboard
- Handle errors gracefully

---

### 3. Account Settings View
**Location:** `src/renderer/views/auth/AccountSettingsView.tsx`

**Purpose:** User account management

**Sections:**

#### 3.1 Profile Section
**Components:**
- Profile avatar upload/edit
- Name fields (firstName, lastName)
- Email display (read-only)
- Phone number input (E.164 format)
- Save/cancel buttons

#### 3.2 Security Section
**Components:**
- Change password form
- Current password input
- New password input
- Confirm password input
- Password strength indicator
- Linked auth providers list
- Link/unlink provider buttons

#### 3.3 Sessions Section
**Components:**
- Active sessions list
- Session cards showing:
  - Device info
  - IP address
  - Last activity
  - Current session indicator
- "Revoke session" button per session
- "Revoke all other sessions" button

#### 3.4 Danger Zone Section
**Components:**
- Deactivate account section
- Delete account section (if eligible)
- Confirmation dialogs
- Warning messages

**UI Elements:**
- Tab navigation for sections
- Form inputs with validation
- Action buttons (primary/secondary)
- Confirmation modals
- Toast notifications for success/error

---

## User Management Views

### 4. User Profile View
**Location:** `src/renderer/views/users/UserProfileView.tsx`

**Purpose:** View and edit user profile (own or other users)

**Components:**
- Profile header with avatar
- Profile information display/edit
- Organization memberships list
- Team memberships list
- Permissions list (if has permission)
- Activity timeline
- Edit profile button (if own profile)

**UI Elements:**
- Large avatar with edit button
- Information cards/sections
- Badge indicators (verified, active)
- List/grid of organizations
- List of teams with roles
- Permission chips/tags
- Edit form (inline or modal)

**Features:**
- View user details
- Edit own profile
- View user's organizations
- View user's teams
- View user's permissions (if authorized)
- Upload/change avatar

---

### 5. User List View
**Location:** `src/renderer/views/users/UserListView.tsx`

**Purpose:** List and manage users (Super Admin only)

**Components:**
- Users table/grid
- Search and filter bar
- Bulk action toolbar
- User row actions
- Pagination controls

**Columns:**
- Avatar
- Name
- Email
- Status (active/inactive/deleted)
- Last login
- Organizations count
- Actions menu

**Filters:**
- Status filter
- Organization filter
- Role filter
- Date range filter
- Search by name/email

**Actions:**
- View user profile
- Deactivate user
- Reactivate user
- Delete user (with confirmation)
- Export user list

**UI Elements:**
- Data table with sorting
- Filter chips
- Action dropdown menus
- Status badges
- Confirmation dialogs
- Bulk select checkboxes

---

### 6. Session Management View
**Location:** `src/renderer/views/users/SessionManagementView.tsx`

**Purpose:** Manage active sessions

**Components:**
- Active sessions list
- Session cards with details:
  - Device name/type
  - Browser/OS info
  - IP address
  - Location (if available)
  - Last activity timestamp
  - Current session indicator
- Session actions:
  - Revoke session button
  - View session details
- Bulk actions:
  - Revoke all sessions
  - Revoke all other sessions

**UI Elements:**
- Card grid/list layout
- Current session highlight
- Device/browser icons
- Location badges
- Time since last activity
- Confirmation dialogs
- Toast notifications

---

## Team Management Views

### 7. Team List View
**Location:** `src/renderer/views/teams/TeamListView.tsx`

**Purpose:** View all teams user belongs to or can manage

**Components:**
- Teams grid/list
- Team cards showing:
  - Team name
  - Description
  - Member count
  - Project count
  - Parent team (if applicable)
  - Team avatar/icon
- Create team button
- Search and filter bar
- Sort controls

**Filters:**
- Organization filter
- My teams only
- Teams I manage
- Parent team filter
- Has projects filter

**Actions:**
- View team details
- Edit team (if has permission)
- Delete team (if has permission)

**UI Elements:**
- Card/list toggle
- Team cards with hover effects
- Member avatars (stacked)
- Project badges
- Action dropdown menus
- Empty state (no teams)

---

### 8. Team Detail View
**Location:** `src/renderer/views/teams/TeamDetailView.tsx`

**Purpose:** View and manage team details

**Components:**

#### 8.1 Team Header
- Team name and description
- Edit team button (if authorized)
- Team actions dropdown
- Team avatar/icon

#### 8.2 Team Members Section
- Members list/grid
- Member cards showing:
  - Avatar
  - Name
  - Role in team
  - Email
  - Join date
- Add member button
- Remove member button (per member)
- Change member role dropdown

#### 8.3 Team Projects Section
- Projects list
- Project cards with:
  - Project name
  - Status
  - Last updated
- View project link

#### 8.4 Subteams Section
- Subteams list
- Create subteam button
- Subteam cards

#### 8.5 Team Settings Section
- Team name/description edit
- Parent team selector
- Delete team button

**UI Elements:**
- Tab navigation for sections
- Member/project cards
- Action buttons
- Confirmation dialogs
- Form inputs with validation
- Hierarchical tree view (for subteams)

---

### 9. Team Creation/Edit Modal
**Location:** `src/renderer/components/teams/TeamFormModal.tsx`

**Purpose:** Create or edit team

**Form Fields:**
- Team name (required)
- Description (optional)
- Parent team selector (optional)
- Organization selector (if multi-org)
- Initial members selector (optional, on create)

**UI Elements:**
- Modal dialog
- Form inputs
- Autocomplete for parent team
- User search/select for members
- Save/cancel buttons
- Validation error display

---

### 10. Add Team Member Modal
**Location:** `src/renderer/components/teams/AddMemberModal.tsx`

**Purpose:** Add members to team

**Components:**
- User search input
- User selection list
- Role selector per user
- Bulk add users
- Add button

**UI Elements:**
- Modal dialog
- Searchable user list
- Selected users chips
- Role dropdown per user
- Add/cancel buttons

---

## Organization Management Views

### 11. Organization Switcher Component
**Location:** `src/renderer/components/organization/OrganizationSwitcher.tsx`

**Purpose:** Quick switch between organizations

**Components:**
- Current organization display
- Organization dropdown
- Organization list with:
  - Organization name
  - Organization logo
  - Member count
  - Current indicator
- Create organization button
- Organization settings link

**UI Elements:**
- Dropdown menu/popover
- Organization logos
- Checkmark for current org
- Search filter (if many orgs)
- Hover effects
- Keyboard navigation

**Features:**
- Display current organization
- List user's organizations
- Switch organization (with loading state)
- Create new organization
- Navigate to org settings

---

### 12. Organization Dashboard View
**Location:** `src/renderer/views/organization/OrganizationDashboardView.tsx`

**Purpose:** Organization overview and quick actions

**Sections:**

#### 12.1 Overview Section
- Organization name and description
- Member count
- Team count
- Project count
- Subscription tier/status
- Quick stats cards

#### 12.2 Recent Activity Section
- Activity feed showing:
  - New members
  - New teams
  - New projects
  - Permission changes
- View all activity link

#### 12.3 Quick Actions Section
- Invite members button
- Create team button
- Create project button
- View settings button

#### 12.4 Teams Section
- Teams overview
- Top teams by member count
- View all teams link

#### 12.5 Members Section
- Members overview
- Recent members
- View all members link

**UI Elements:**
- Stat cards with icons
- Activity timeline
- Quick action buttons
- Team/member cards
- Charts/graphs for metrics

---

### 13. Organization Settings View
**Location:** `src/renderer/views/organization/OrganizationSettingsView.tsx`

**Purpose:** Configure organization settings

**Tabs/Sections:**

#### 13.1 General Settings
- Organization name
- Slug (URL-friendly identifier)
- Description
- Logo upload
- Save changes button

#### 13.2 Members & Invitations
- Members list
- Pending invitations list
- Member limit display
- Invite member button
- Remove member action
- Change member role action

#### 13.3 Teams
- Teams list
- Create team button
- Team hierarchy view
- Manage teams

#### 13.4 Roles & Permissions
- Roles list
- Create custom role button
- Edit role permissions
- Delete custom role
- View system roles (read-only)

#### 13.5 Advanced Settings
- Member limit setting
- Organization features toggle
- Danger zone:
  - Deactivate organization
  - Delete organization

**UI Elements:**
- Tab navigation
- Form inputs
- Tables/lists
- Action buttons
- Confirmation dialogs
- Toggle switches
- Upload component for logo

---

### 14. Create Organization Modal
**Location:** `src/renderer/components/organization/CreateOrganizationModal.tsx`

**Purpose:** Create new organization

**Form Fields:**
- Organization name (required)
- Slug (auto-generated, editable)
- Description (optional)
- Logo upload (optional)

**UI Elements:**
- Modal dialog
- Form inputs
- Slug preview/validation
- Image upload component
- Create/cancel buttons
- Validation error display
- Loading state

**Features:**
- Auto-generate slug from name
- Validate slug uniqueness
- Upload logo
- Create organization
- Auto-switch to new organization

---

### 15. Organization Members View
**Location:** `src/renderer/views/organization/OrganizationMembersView.tsx`

**Purpose:** Manage organization members

**Components:**
- Members table/grid
- Search and filter bar
- Invite member button
- Bulk actions toolbar
- Pagination controls

**Columns:**
- Avatar
- Name
- Email
- Role
- Teams
- Status (active/pending)
- Joined date
- Actions

**Filters:**
- Role filter
- Team filter
- Status filter
- Search by name/email

**Actions:**
- View member profile
- Change member role
- Remove member
- Resend invitation (if pending)

**UI Elements:**
- Data table with sorting
- Filter chips
- Action dropdown menus
- Status badges
- Confirmation dialogs
- Bulk select checkboxes

---

### 16. Invite Member Modal
**Location:** `src/renderer/components/organization/InviteMemberModal.tsx`

**Purpose:** Invite new members to organization

**Form Fields:**
- Email address(es) (comma-separated or multi-input)
- Role selector
- Teams to add (optional)
- Custom message (optional)
- Expiration date (optional)

**UI Elements:**
- Modal dialog
- Email input (with validation)
- Role dropdown
- Team multi-select
- Text area for message
- Date picker for expiration
- Send invitation button
- Cancel button

**Features:**
- Bulk invite via email list
- Assign role
- Add to teams on acceptance
- Custom invitation message
- Set invitation expiration

---

## RBAC & Permissions Views

### 17. Roles Management View
**Location:** `src/renderer/views/rbac/RolesManagementView.tsx`

**Purpose:** Manage roles and permissions

**Components:**

#### 17.1 Roles List Section
- Roles table/grid showing:
  - Role name
  - Type (system/custom)
  - Permission count
  - Member count
  - Created by
  - Actions
- Create custom role button
- Filter by type

#### 17.2 Role Detail Section
- Selected role information
- Role name and description
- Assigned permissions list grouped by module
- Members with this role
- Edit role button
- Delete role button (if custom)

**UI Elements:**
- Two-column layout (list + detail)
- Role cards
- Permission tree/list
- Member avatars
- Action buttons
- Confirmation dialogs

---

### 18. Role Editor Modal
**Location:** `src/renderer/components/rbac/RoleEditorModal.tsx`

**Purpose:** Create or edit custom roles

**Components:**

#### 18.1 Basic Information
- Role name input
- Description textarea
- Based on template selector (optional)

#### 18.2 Permissions Section
- Permission tree/list grouped by:
  - Module (projects, teams, users, etc.)
  - Resource (project, team, user)
  - Action (create, read, update, delete)
  - Scope (own, team, organization, all)
- Select all / deselect all per module
- Search permissions
- Permission descriptions on hover

**UI Elements:**
- Modal dialog
- Form inputs
- Nested checkboxes for permissions
- Permission tree with expand/collapse
- Search input for permissions
- Permission count display
- Save/cancel buttons
- Preview of role capabilities

**Features:**
- Create custom role
- Edit custom role
- Clone existing role
- Permission search/filter
- Bulk permission selection
- Wildcard permission support

---

### 19. Permission Management View
**Location:** `src/renderer/views/rbac/PermissionManagementView.tsx`

**Purpose:** View all available permissions (Super Admin only)

**Components:**
- Permissions list grouped by module
- Permission cards showing:
  - Permission code
  - Display name
  - Description
  - Module/resource/action/scope
  - Roles using this permission
- Search and filter bar
- Export permissions button

**Filters:**
- Module filter
- Action filter
- Scope filter
- System vs custom permissions

**UI Elements:**
- Grouped list/tree view
- Expandable sections per module
- Permission cards
- Filter chips
- Search input
- Export button

---

### 20. User Permissions View
**Location:** `src/renderer/views/rbac/UserPermissionsView.tsx`

**Purpose:** View user's effective permissions

**Components:**
- User selector (if viewing others)
- Organization selector
- Permissions list grouped by module
- Permission source indicator (role or resource)
- Permission scope display
- Search permissions

**UI Elements:**
- User avatar and name
- Organization badge
- Permission tree/list
- Source badges (role name)
- Scope indicators
- Search input
- Export button

**Features:**
- View own permissions
- View other user's permissions (if authorized)
- Show permission sources (which roles)
- Filter by module/scope
- Export permission report

---

## Shared Components

### 21. User Avatar Component
**Location:** `src/renderer/components/common/UserAvatar.tsx`

**Props:**
- User object or userId
- Size (xs, sm, md, lg, xl)
- Show online indicator (boolean)
- Editable (boolean)
- onClick handler

**Features:**
- Display user avatar image
- Fallback to initials
- Online status indicator
- Edit overlay on hover (if editable)
- Click to view profile

---

### 22. Organization Logo Component
**Location:** `src/renderer/components/common/OrganizationLogo.tsx`

**Props:**
- Organization object or orgId
- Size (xs, sm, md, lg, xl)
- Editable (boolean)

**Features:**
- Display org logo
- Fallback to org name initials
- Edit overlay (if editable)
- Click to view org

---

### 23. User Selector Component
**Location:** `src/renderer/components/common/UserSelector.tsx`

**Props:**
- Organization ID (optional)
- Team ID (optional)
- Multiple selection (boolean)
- Exclude users (array)
- onChange handler

**Features:**
- Search users by name/email
- Filter by organization/team
- Display user avatar and info
- Multi-select support
- Clear selection
- Create invitation option (if email not found)

---

### 24. Role Badge Component
**Location:** `src/renderer/components/common/RoleBadge.tsx`

**Props:**
- Role object or roleId
- Size (sm, md, lg)
- Clickable (boolean)
- onClick handler

**Features:**
- Display role name
- System vs custom indicator
- Super Admin highlight
- Tooltip with role description
- Click to view role details

---

### 25. Permission Chip Component
**Location:** `src/renderer/components/common/PermissionChip.tsx`

**Props:**
- Permission code
- Show scope (boolean)
- Clickable (boolean)
- onClick handler

**Features:**
- Display permission code
- Color-coded by module
- Scope indicator
- Tooltip with description
- Click to view permission details

---

### 26. Team Badge Component
**Location:** `src/renderer/components/common/TeamBadge.tsx`

**Props:**
- Team object or teamId
- Show member count (boolean)
- Clickable (boolean)
- onClick handler

**Features:**
- Display team name
- Member count badge
- Parent team indicator
- Click to view team

---

### 27. Status Badge Component
**Location:** `src/renderer/components/common/StatusBadge.tsx`

**Props:**
- Status (active, inactive, pending, deleted)
- Size (sm, md, lg)

**Features:**
- Color-coded status
- Status icon
- Consistent styling

---

### 28. Confirmation Dialog Component
**Location:** `src/renderer/components/common/ConfirmationDialog.tsx`

**Props:**
- Title
- Message
- Danger mode (boolean)
- Confirmation text requirement (boolean)
- onConfirm handler
- onCancel handler

**Features:**
- Modal confirmation dialog
- Danger styling for destructive actions
- Require typing confirmation text
- Cancel/confirm buttons

---

### 29. Empty State Component
**Location:** `src/renderer/components/common/EmptyState.tsx`

**Props:**
- Title
- Description
- Icon
- Action button (optional)
- onClick handler

**Features:**
- Centered empty state
- Icon illustration
- Call-to-action button
- Customizable message

---

### 30. Loading Skeleton Component
**Location:** `src/renderer/components/common/LoadingSkeleton.tsx`

**Props:**
- Type (list, card, table, profile)
- Count (number of items)

**Features:**
- Animated skeleton screens
- Different layouts (list, card, etc.)
- Smooth loading experience

---

### 31. Data Table Component
**Location:** `src/renderer/components/common/DataTable.tsx`

**Props:**
- Columns configuration
- Data array
- Sortable columns
- Filterable columns
- Pagination options
- Row actions
- Bulk actions
- Loading state
- Empty state

**Features:**
- Sortable columns
- Column filters
- Pagination
- Row selection
- Bulk actions toolbar
- Column visibility toggle
- Export data
- Responsive design

---

### 32. Search Bar Component
**Location:** `src/renderer/components/common/SearchBar.tsx`

**Props:**
- Placeholder
- onSearch handler
- Filters (optional)
- Quick filters (chips)

**Features:**
- Search input with icon
- Debounced search
- Clear button
- Filter dropdown
- Quick filter chips
- Keyboard shortcuts

---

## Layout Components

### 33. Settings Layout Component
**Location:** `src/renderer/components/layouts/SettingsLayout.tsx`

**Purpose:** Consistent layout for settings pages

**Components:**
- Sidebar navigation
- Content area
- Breadcrumbs
- Save/cancel action bar (sticky)

**Features:**
- Tab navigation in sidebar
- Unsaved changes warning
- Responsive layout
- Sticky action bar

---

### 34. Modal Layout Component
**Location:** `src/renderer/components/layouts/ModalLayout.tsx`

**Purpose:** Consistent modal styling

**Components:**
- Modal header
- Modal body
- Modal footer
- Close button

**Features:**
- Backdrop click to close
- ESC key to close
- Focus trap
- Consistent sizing
- Animation

---

### 35. List View Layout Component
**Location:** `src/renderer/components/layouts/ListViewLayout.tsx`

**Purpose:** Consistent list/grid layout

**Components:**
- Header with title and actions
- Search and filter bar
- Content area (list/grid)
- Pagination
- Empty state

**Features:**
- Responsive grid/list toggle
- Consistent spacing
- Action buttons
- Filter chips

---

## Implementation Priority

### Phase 1: Core Authentication & Organization (Must Have)
**Priority:** Highest

1. **Login View** - User authentication entry
2. **OAuth Callback View** - Handle OAuth flow
3. **Organization Switcher Component** - Critical for multi-org
4. **Account Settings View** - Basic profile management
5. **Organization Dashboard View** - Organization overview
6. **User Avatar Component** - Shared component
7. **Organization Logo Component** - Shared component

**Estimated Time:** 2-3 weeks

---

### Phase 2: User & Team Management (High Priority)
**Priority:** High

1. **User Profile View** - View/edit profiles
2. **Team List View** - View all teams
3. **Team Detail View** - Team management
4. **Team Creation/Edit Modal** - Create/edit teams
5. **Add Team Member Modal** - Add members
6. **User Selector Component** - Shared component
7. **Team Badge Component** - Shared component
8. **Role Badge Component** - Shared component

**Estimated Time:** 2-3 weeks

---

### Phase 3: Organization Management (High Priority)
**Priority:** High

1. **Organization Settings View** - Configure organization
2. **Create Organization Modal** - Create new orgs
3. **Organization Members View** - Manage members
4. **Invite Member Modal** - Invite new members
5. **Status Badge Component** - Shared component
6. **Confirmation Dialog Component** - Shared component

**Estimated Time:** 2 weeks

---

### Phase 4: RBAC & Permissions (Medium Priority)
**Priority:** Medium

1. **Roles Management View** - Manage roles
2. **Role Editor Modal** - Create/edit roles
3. **Permission Management View** - View permissions
4. **User Permissions View** - View user permissions
5. **Permission Chip Component** - Shared component

**Estimated Time:** 2-3 weeks

---

### Phase 5: Advanced Features (Lower Priority)
**Priority:** Lower

1. **Session Management View** - Manage sessions
2. **User List View** - User management (Super Admin)
3. **Empty State Component** - Better UX
4. **Loading Skeleton Component** - Better UX
5. **Data Table Component** - Reusable table
6. **Search Bar Component** - Advanced search

**Estimated Time:** 2 weeks

---

### Phase 6: Polish & Enhancement (Nice to Have)
**Priority:** Nice to Have

1. **Settings Layout Component** - Consistent layouts
2. **Modal Layout Component** - Consistent modals
3. **List View Layout Component** - Consistent lists
4. Advanced animations and transitions
5. Accessibility improvements
6. Mobile responsive enhancements
7. Keyboard shortcut system

**Estimated Time:** 1-2 weeks

---

## Component Dependencies

### Dependency Graph

```
Core Components (Phase 1)
    â†"
User/Team Components (Phase 2) â† Shared Components
    â†"
Organization Components (Phase 3) â† Shared Components
    â†"
RBAC Components (Phase 4) â† Shared Components
    â†"
Advanced Components (Phase 5) â† All Previous
    â†"
Layout Components (Phase 6) â† All Previous
```

---

## Shared Components Priority

**Must Implement First:**
1. User Avatar Component
2. Organization Logo Component
3. Status Badge Component
4. Confirmation Dialog Component

**Implement Second:**
5. User Selector Component
6. Role Badge Component
7. Team Badge Component
8. Permission Chip Component

**Implement Later:**
9. Empty State Component
10. Loading Skeleton Component
11. Data Table Component
12. Search Bar Component

---

## Design System Considerations

### Color Scheme
- **Primary:** Organization/brand colors
- **Success:** Green (active, verified)
- **Warning:** Yellow (pending, expiring)
- **Danger:** Red (inactive, deleted, destructive actions)
- **Info:** Blue (information, help)
- **Neutral:** Gray (default, disabled)

### Typography
- **Headers:** Large, bold fonts for view titles
- **Body:** Readable font size (14-16px)
- **Labels:** Smaller, uppercase for form labels
- **Monospace:** For codes, slugs, IDs

### Spacing
- Consistent spacing scale (4px, 8px, 16px, 24px, 32px)
- Generous padding in cards and modals
- Clear visual separation between sections

### Icons
- Consistent icon set (Lucide React recommended)
- Icons for common actions (edit, delete, add, etc.)
- Status icons (checkmark, warning, error)
- Navigation icons

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader support
- Color contrast compliance (WCAG AA)

---

## Testing Considerations

### Component Testing
- Unit tests for each component
- Storybook stories for visual testing
- Accessibility testing
- Responsive design testing

### Integration Testing
- Authentication flow testing
- Organization switching testing
- Team management workflow testing
- Permission checking testing

### E2E Testing
- Login to dashboard flow
- Create organization flow
- Invite and add member flow
- Create and manage team flow
- Role and permission assignment flow

---

## Summary

**Total Views:** 20
**Total Shared Components:** 15
**Total Layout Components:** 3
**Total Components:** 38

**Implementation Timeline:**
- **Phase 1 (Core):** 2-3 weeks
- **Phase 2 (Users/Teams):** 2-3 weeks
- **Phase 3 (Organizations):** 2 weeks
- **Phase 4 (RBAC):** 2-3 weeks
- **Phase 5 (Advanced):** 2 weeks
- **Phase 6 (Polish):** 1-2 weeks

**Total Estimated Time:** 11-15 weeks for full implementation

This comprehensive list provides a complete roadmap for implementing all necessary views and components for the Collaboration & Organization modules, prioritized by importance and dependency relationships.
