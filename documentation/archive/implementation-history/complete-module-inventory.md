# Complete Module Inventory
## Pages, UI Components, and API Endpoints

**Generated:** January 19, 2026  
**Project:** Coder IDE

---

## Table of Contents

1. [UI Pages & Views](#ui-pages--views)
2. [UI Components](#ui-components)
3. [API Endpoints](#api-endpoints)
4. [Module Summary](#module-summary)

---

## UI Pages & Views

### Main Application Views

#### Activity Bar Views
**Location:** `src/renderer/components/ActivityBar/`, `src/renderer/components/views/`

| View | Component | Keyboard Shortcut | Description |
|------|-----------|-------------------|-------------|
| **Explorer** | `FileExplorer` | `Ctrl/Cmd + Shift + E` | File system navigation |
| **Search** | `SearchPanel` | `Ctrl/Cmd + Shift + F` | Global search |
| **Source Control** | `SourceControlPanel` | `Ctrl/Cmd + Shift + G` | Git integration |
| **Debug** | `DebugPanel` | `Ctrl/Cmd + Shift + D` | Debug interface |
| **Extensions** | `ExtensionsPanel` | `Ctrl/Cmd + Shift + X` | Extension management |
| **Chat** | `AIChatPanel` | - | AI chat interface |
| **Plans** | `PlansPanel` | - | Planning view |
| **Project** | `ProjectManagementPanel` | - | Project management |
| **Productivity** | `ProductivityModulesPanel` | - | Productivity features |
| **Settings** | `SettingsPanel` | `Ctrl/Cmd + ,` | Settings editor |

### Editor Components
**Location:** `src/renderer/components/editor/`

| Component | Description |
|-----------|-------------|
| **MonacoEditor** | Main code editor |
| **EditorTabs** | Tab management |
| **EditorGroup** | Split editor groups |
| **Minimap** | Code minimap |
| **IntelliSense** | Code completion overlay |
| **HoverWidget** | Hover information |

### Project Management Views
**Location:** `src/renderer/components/`

| View | Description |
|------|-------------|
| **ProjectSelector** | Project selection dropdown |
| **TaskManagementView** | Task list and management |
| **RoadmapView** | Roadmap visualization |
| **ModuleExplorer** | Module detection and organization |
| **EnvironmentManager** | Environment configuration |

### Productivity Views
**Location:** `src/renderer/components/`

| View | Description |
|------|-------------|
| **CalendarView** | Calendar integration |
| **MessagingPanel** | Team messaging |
| **KnowledgeBaseView** | Knowledge base browser |
| **CodeReviewPanel** | Code review interface |
| **IncidentDashboard** | Incident management |
| **LearningResourcesView** | Learning resources |
| **ArchitectureView** | Architecture visualization |
| **ReleaseManagementView** | Release planning |

### Collaboration Views
**Location:** `src/renderer/components/`

| View | Description |
|------|-------------|
| **TeamManagementView** | Team hierarchy and members |
| **UserProfileView** | User profile editor |
| **OrganizationSettingsView** | Organization settings |
| **PermissionsView** | Role and permission management |

---

## UI Components

### Form Components
**Location:** `src/renderer/components/ui/`

| Component | Variants | Description |
|-----------|----------|-------------|
| **Button** | default, destructive, outline, secondary, ghost, link | Interactive button |
| **Input** | text, email, password, number | Text input field |
| **Textarea** | - | Multi-line text input |
| **Checkbox** | - | Checkbox input |
| **Radio Group** | - | Radio button group |
| **Switch** | - | Toggle switch |
| **Select** | single, multiple | Dropdown select |
| **Form** | - | Form with validation |

### Layout Components
**Location:** `src/renderer/components/ui/`

| Component | Sub-components | Description |
|-----------|----------------|-------------|
| **Card** | CardHeader, CardTitle, CardDescription, CardContent, CardFooter | Container component |
| **Separator** | horizontal, vertical | Visual separator |
| **Scroll Area** | - | Custom scrollable container |
| **Resizable** | - | Resizable panels |
| **Accordion** | AccordionItem, AccordionTrigger, AccordionContent | Collapsible sections |

### Navigation Components
**Location:** `src/renderer/components/ui/`

| Component | Sub-components | Description |
|-----------|----------------|-------------|
| **Tabs** | TabsList, TabsTrigger, TabsContent | Tab navigation |
| **Breadcrumb** | BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator | Breadcrumb navigation |
| **Navigation Menu** | NavigationMenuItem, NavigationMenuTrigger | Complex navigation |
| **Menubar** | MenubarMenu, MenubarTrigger, MenubarContent | Menu bar |

### Overlay Components
**Location:** `src/renderer/components/ui/`

| Component | Sub-components | Description |
|-----------|----------------|-------------|
| **Dialog** | DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter | Modal dialog |
| **Popover** | PopoverTrigger, PopoverContent | Popover component |
| **Tooltip** | TooltipTrigger, TooltipContent | Tooltip |
| **Alert** | AlertTitle, AlertDescription | Alert/notification |
| **Dropdown Menu** | DropdownMenuItem, DropdownMenuTrigger | Dropdown menu |

### Data Display Components
**Location:** `src/renderer/components/ui/`

| Component | Variants | Description |
|-----------|----------|-------------|
| **Badge** | default, secondary, destructive, outline | Badge/label |
| **Avatar** | - | User avatar |
| **Progress** | - | Progress bar |
| **Skeleton** | - | Loading skeleton |
| **Table** | Table, TableHeader, TableBody, TableRow, TableCell | Data table |

### Specialized Components
**Location:** `src/renderer/components/ui/`

| Component | Description |
|-----------|-------------|
| **Command** | Command palette interface |
| **Calendar** | Date picker calendar |
| **Sonner** | Toast notifications |
| **Context Menu** | Right-click context menu |

---

## API Endpoints

### Base URL
All API endpoints use the `/api` prefix.

### Authentication Endpoints
**Base Path:** `/api/auth`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/google` | No | Initiate Google OAuth |
| GET | `/google/callback` | No | OAuth callback handler |
| GET | `/me` | Yes | Get current user |
| POST | `/logout` | Yes | Logout (revoke session) |
| POST | `/change-password` | Yes | Change password |
| GET | `/providers` | Yes | Get linked providers |
| POST | `/link-google` | Yes | Link Google account |
| POST | `/unlink-provider` | Yes | Unlink provider |
| POST | `/switch-organization` | Yes | Switch organization context |

### User Management Endpoints
**Base Path:** `/api/users`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| PUT | `/me` | Yes | - | Update own profile |
| GET | `/me/sessions` | Yes | - | List own sessions |
| DELETE | `/me/sessions/:sessionId` | Yes | - | Revoke session |
| POST | `/me/sessions/revoke-all-others` | Yes | - | Revoke all other sessions |
| GET | `/me/organizations` | Yes | - | List user organizations |
| POST | `/me/deactivate` | Yes | - | Deactivate own account |
| POST | `/:userId/deactivate` | Yes | Super Admin | Deactivate user |
| POST | `/:userId/reactivate` | Yes | Super Admin | Reactivate user |
| DELETE | `/:userId` | Yes | Super Admin | Delete user |
| GET | `/:userId/permissions` | Yes | Self/Admin | Get user permissions |

### Team Management Endpoints
**Base Path:** `/api/teams`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List user's teams |
| POST | `/` | Yes | `teams.team.create` | Create team |
| GET | `/:id` | Yes | Member | Get team details |
| PUT | `/:id` | Yes | Creator/PM | Update team |
| DELETE | `/:id` | Yes | Creator/PM | Delete team |
| POST | `/:id/members` | Yes | Creator/PM | Add member |
| DELETE | `/:id/members/:userId` | Yes | Creator/PM | Remove member |

### Organization Endpoints
**Base Path:** `/api/organizations`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List user organizations |
| POST | `/` | Yes | - | Create organization |
| GET | `/:id` | Yes | Member | Get organization |
| PUT | `/:id` | Yes | Owner/Admin | Update organization |
| DELETE | `/:id` | Yes | Owner/Admin | Deactivate organization |
| GET | `/:id/settings` | Yes | Member | Get settings |
| PUT | `/:id/settings` | Yes | Owner/Admin | Update settings |
| GET | `/:id/memberships` | Yes | Member | List memberships |
| POST | `/:id/memberships` | Yes | Owner/Admin | Create membership |
| PUT | `/:id/memberships/:id` | Yes | Owner/Admin | Update membership |
| DELETE | `/:id/memberships/:id` | Yes | Owner/Admin | Delete membership |

### Project Management Endpoints
**Base Path:** `/api/projects`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | `projects.project.read.all` | List projects |
| POST | `/` | Yes | `projects.project.create` | Create project |
| GET | `/:id` | Yes | `projects.project.read.all` | Get project |
| PUT | `/:id` | Yes | `projects.project.update.all` | Update project |
| DELETE | `/:id` | Yes | `projects.project.delete.all` | Delete project |
| GET | `/:id/tasks` | Yes | - | Get project tasks |
| GET | `/:id/modules` | Yes | - | Get project modules |
| GET | `/:id/profile` | Yes | - | Get application profile |
| PUT | `/:id/profile` | Yes | - | Update application profile |

### Task Management Endpoints
**Base Path:** `/api/tasks`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | `tasks.task.read.all` | List tasks |
| POST | `/` | Yes | `tasks.task.create` | Create task |
| GET | `/:id` | Yes | `tasks.task.read.all` | Get task |
| PUT | `/:id` | Yes | `tasks.task.update.all` | Update task |
| DELETE | `/:id` | Yes | `tasks.task.delete.all` | Delete task |
| PUT | `/:id/status` | Yes | - | Update task status |
| PUT | `/:id/assign` | Yes | - | Assign task |
| POST | `/:id/subtasks` | Yes | - | Create subtask |

### Roadmap Management Endpoints
**Base Path:** `/api/roadmaps`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | `roadmaps.roadmap.read.all` | List roadmaps |
| POST | `/` | Yes | `roadmaps.roadmap.create` | Create roadmap |
| GET | `/:id` | Yes | `roadmaps.roadmap.read.all` | Get roadmap |
| PUT | `/:id` | Yes | `roadmaps.roadmap.update.all` | Update roadmap |
| DELETE | `/:id` | Yes | `roadmaps.roadmap.delete.all` | Delete roadmap |
| POST | `/:id/milestones` | Yes | - | Create milestone |
| POST | `/milestones/:id/epics` | Yes | - | Create epic |
| POST | `/epics/:id/stories` | Yes | - | Create story |

### Module Detection Endpoints
**Base Path:** `/api/modules`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List modules |
| POST | `/detect` | Yes | - | Detect modules |
| GET | `/:id` | Yes | - | Get module |
| PUT | `/:id` | Yes | - | Update module |
| DELETE | `/:id` | Yes | - | Delete module |
| POST | `/:id/submodules` | Yes | - | Create submodule |

### Environment Management Endpoints
**Base Path:** `/api/environments`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List environments |
| POST | `/` | Yes | - | Create environment |
| GET | `/:id` | Yes | - | Get environment |
| PUT | `/:id` | Yes | - | Update environment |
| DELETE | `/:id` | Yes | - | Delete environment |
| POST | `/:id/sync` | Yes | - | Sync environment |

### Calendar Endpoints
**Base Path:** `/api/calendar`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/events` | Yes | - | List calendar events |
| POST | `/events` | Yes | - | Create event |
| GET | `/events/:id` | Yes | - | Get event |
| PUT | `/events/:id` | Yes | - | Update event |
| DELETE | `/events/:id` | Yes | - | Delete event |
| GET | `/availability` | Yes | - | Get availability |

### Messaging Endpoints
**Base Path:** `/api/messaging`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/channels` | Yes | - | List channels |
| POST | `/channels` | Yes | - | Create channel |
| GET | `/channels/:id/messages` | Yes | - | Get messages |
| POST | `/channels/:id/messages` | Yes | - | Send message |
| PUT | `/messages/:id` | Yes | - | Update message |
| DELETE | `/messages/:id` | Yes | - | Delete message |

### Knowledge Base Endpoints
**Base Path:** `/api/knowledge`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List knowledge entries |
| POST | `/` | Yes | - | Create entry |
| GET | `/:id` | Yes | - | Get entry |
| PUT | `/:id` | Yes | - | Update entry |
| DELETE | `/:id` | Yes | - | Delete entry |
| GET | `/search` | Yes | - | Search knowledge base |

### Code Review Endpoints
**Base Path:** `/api/reviews`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List code reviews |
| POST | `/` | Yes | - | Create review |
| GET | `/:id` | Yes | - | Get review |
| PUT | `/:id` | Yes | - | Update review |
| POST | `/:id/comments` | Yes | - | Add comment |
| PUT | `/:id/approve` | Yes | - | Approve review |
| PUT | `/:id/reject` | Yes | - | Reject review |

### Incident Management Endpoints
**Base Path:** `/api/incidents`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List incidents |
| POST | `/` | Yes | - | Create incident |
| GET | `/:id` | Yes | - | Get incident |
| PUT | `/:id` | Yes | - | Update incident |
| PUT | `/:id/resolve` | Yes | - | Resolve incident |
| POST | `/:id/comments` | Yes | - | Add comment |

### Learning Resources Endpoints
**Base Path:** `/api/learning`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List learning resources |
| POST | `/` | Yes | - | Create resource |
| GET | `/:id` | Yes | - | Get resource |
| PUT | `/:id` | Yes | - | Update resource |
| DELETE | `/:id` | Yes | - | Delete resource |
| POST | `/:id/progress` | Yes | - | Update progress |

### Architecture Endpoints
**Base Path:** `/api/architecture`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/diagrams` | Yes | - | List architecture diagrams |
| POST | `/diagrams` | Yes | - | Create diagram |
| GET | `/diagrams/:id` | Yes | - | Get diagram |
| PUT | `/diagrams/:id` | Yes | - | Update diagram |
| DELETE | `/diagrams/:id` | Yes | - | Delete diagram |
| POST | `/analyze` | Yes | - | Analyze architecture |

### Release Management Endpoints
**Base Path:** `/api/releases`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List releases |
| POST | `/` | Yes | - | Create release |
| GET | `/:id` | Yes | - | Get release |
| PUT | `/:id` | Yes | - | Update release |
| POST | `/:id/deploy` | Yes | - | Deploy release |
| GET | `/:id/changelog` | Yes | - | Get changelog |

### Dependency Management Endpoints
**Base Path:** `/api/dependencies`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List dependencies |
| POST | `/scan` | Yes | - | Scan dependencies |
| GET | `/:id` | Yes | - | Get dependency |
| PUT | `/:id/update` | Yes | - | Update dependency |
| GET | `/vulnerabilities` | Yes | - | List vulnerabilities |

### Technical Debt Endpoints
**Base Path:** `/api/debt`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List technical debt items |
| POST | `/` | Yes | - | Create debt item |
| GET | `/:id` | Yes | - | Get debt item |
| PUT | `/:id` | Yes | - | Update debt item |
| PUT | `/:id/resolve` | Yes | - | Resolve debt item |

### Pair Programming Endpoints
**Base Path:** `/api/pairing`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/sessions` | Yes | - | List pairing sessions |
| POST | `/sessions` | Yes | - | Create session |
| GET | `/sessions/:id` | Yes | - | Get session |
| PUT | `/sessions/:id/join` | Yes | - | Join session |
| PUT | `/sessions/:id/leave` | Yes | - | Leave session |

### Capacity Planning Endpoints
**Base Path:** `/api/capacity`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | Get capacity data |
| POST | `/forecast` | Yes | - | Generate forecast |
| GET | `/utilization` | Yes | - | Get utilization |
| POST | `/allocate` | Yes | - | Allocate resources |

### Pattern Library Endpoints
**Base Path:** `/api/patterns`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List patterns |
| POST | `/` | Yes | - | Create pattern |
| GET | `/:id` | Yes | - | Get pattern |
| PUT | `/:id` | Yes | - | Update pattern |
| DELETE | `/:id` | Yes | - | Delete pattern |

### Compliance Endpoints
**Base Path:** `/api/compliance`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/checks` | Yes | - | List compliance checks |
| POST | `/checks` | Yes | - | Create check |
| GET | `/checks/:id` | Yes | - | Get check |
| POST | `/checks/:id/run` | Yes | - | Run check |
| GET | `/reports` | Yes | - | List compliance reports |

### Innovation & Experiments Endpoints
**Base Path:** `/api/innovation`, `/api/experiments`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List items |
| POST | `/` | Yes | - | Create item |
| GET | `/:id` | Yes | - | Get item |
| PUT | `/:id` | Yes | - | Update item |
| DELETE | `/:id` | Yes | - | Delete item |

### Workflow Endpoints
**Base Path:** `/api/workflows`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List workflows |
| POST | `/` | Yes | - | Create workflow |
| GET | `/:id` | Yes | - | Get workflow |
| PUT | `/:id` | Yes | - | Update workflow |
| POST | `/:id/execute` | Yes | - | Execute workflow |

### Agent Endpoints
**Base Path:** `/api/agents`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List agents |
| POST | `/:type/execute` | Yes | - | Execute agent |
| GET | `/:id/status` | Yes | - | Get agent status |
| POST | `/:id/cancel` | Yes | - | Cancel agent execution |

### MCP Server Endpoints
**Base Path:** `/api/mcp`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/servers` | Yes | - | List MCP servers |
| POST | `/servers` | Yes | - | Register server |
| GET | `/servers/:id` | Yes | - | Get server |
| PUT | `/servers/:id` | Yes | - | Update server |
| DELETE | `/servers/:id` | Yes | - | Delete server |

### System Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/health` | No | - | Health check |
| GET | `/api/metrics` | Yes | Admin | System metrics |
| GET | `/api/logs` | Yes | Admin | System logs |
| POST | `/api/feedback` | Yes | - | Submit feedback |
| GET | `/api/prompts` | Yes | - | List prompt templates |
| GET | `/api/dashboards` | Yes | - | List dashboards |
| GET | `/api/observability` | Yes | - | Observability data |
| GET | `/api/benchmarks` | Yes | - | Performance benchmarks |

---

## Module Summary

### Total Counts

**UI Components:**
- **Main Views:** 10 activity bar views
- **Editor Components:** 6 components
- **Project Management Views:** 5 views
- **Productivity Views:** 8 views
- **Collaboration Views:** 4 views
- **Form Components:** 8 components
- **Layout Components:** 5 components
- **Navigation Components:** 4 components
- **Overlay Components:** 5 components
- **Data Display Components:** 4 components
- **Specialized Components:** 3 components

**Total UI Components:** 60+ components

**API Endpoints:**
- **Authentication:** 9 endpoints
- **User Management:** 10 endpoints
- **Team Management:** 7 endpoints
- **Organization Management:** 11 endpoints
- **Project Management:** 8 endpoints
- **Task Management:** 8 endpoints
- **Roadmap Management:** 8 endpoints
- **Module Detection:** 6 endpoints
- **Environment Management:** 6 endpoints
- **Calendar:** 6 endpoints
- **Messaging:** 6 endpoints
- **Knowledge Base:** 6 endpoints
- **Code Review:** 7 endpoints
- **Incident Management:** 6 endpoints
- **Learning Resources:** 6 endpoints
- **Architecture:** 6 endpoints
- **Release Management:** 6 endpoints
- **Dependency Management:** 5 endpoints
- **Technical Debt:** 5 endpoints
- **Pair Programming:** 5 endpoints
- **Capacity Planning:** 4 endpoints
- **Pattern Library:** 5 endpoints
- **Compliance:** 5 endpoints
- **Innovation/Experiments:** 5 endpoints each
- **Workflows:** 5 endpoints
- **Agents:** 4 endpoints
- **MCP Servers:** 5 endpoints
- **System:** 8 endpoints

**Total API Endpoints:** 180+ endpoints

### Module Organization

**Frontend Modules:** 18+
- Platform & Infrastructure: 4
- Editor & UI: 5
- Project Management: 5
- Collaboration: 4

**Backend Modules:** 4
- API Server
- Database
- Services (40+ service classes)
- Middleware

**Feature Modules:** 20+
- AI & Intelligence: 6
- Productivity & Workflow: 14+

**Total Modules:** 39+

---

## Standard Route Pattern

All CRUD endpoints follow this standard pattern:

```typescript
GET    /api/{resource}           // List all
POST   /api/{resource}           // Create new
GET    /api/{resource}/:id       // Get by ID
PUT    /api/{resource}/:id       // Update by ID
DELETE /api/{resource}/:id       // Delete by ID
```

Additional resource-specific endpoints may include:
- `/search` - Search resources
- `/:id/status` - Update status
- `/:id/members` - Manage members
- `/:id/comments` - Manage comments
- `/:id/execute` - Execute actions

---

## Authentication & Authorization

All protected endpoints require:
- **JWT Token:** In `Authorization: Bearer <token>` header or `accessToken` cookie
- **Permission Check:** Via RBAC middleware
- **Valid Session:** User must have active session

Permission format: `{module}.{resource}.{action}.{scope}`
- Example: `projects.project.read.all`
- Scopes: `own`, `team`, `organization`, `all`

---

## Error Response Format

All endpoints use standardized error responses:

```json
{
  "error": "Error message",
  "message": "Detailed explanation",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

---

## Notes

1. All endpoints prefixed with `/api`
2. All timestamps in ISO 8601 format
3. All IDs are CUID strings
4. Pagination available on list endpoints via query params: `?page=1&limit=20`
5. Filtering available via query params: `?status=active&type=feature`
6. Sorting available via query params: `?sortBy=createdAt&order=desc`
7. WebSocket support for real-time features (messaging, collaboration)
8. File upload support with multipart/form-data
9. Rate limiting applied to all endpoints (configurable)
10. Request/response compression enabled
