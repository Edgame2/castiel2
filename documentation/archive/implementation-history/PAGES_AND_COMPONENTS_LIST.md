# Pages and Components List

This document provides a comprehensive list of all pages and components in the Coder project.

**Generated:** $(date)

---

## 📄 Pages / Views

Pages are the main views that users navigate to. They are typically full-screen or major sections of the application.

### Authentication & Project Selection
1. **LoginView** (`src/renderer/components/LoginView.tsx`)
   - Google OAuth authentication page
   - First page shown when user is not authenticated

2. **ProjectSelector** (`src/renderer/components/ProjectSelector.tsx`)
   - Project selection interface
   - Shown when user is authenticated but no project is selected

3. **ProjectCreateDialog** (`src/renderer/components/ProjectCreateDialog.tsx`)
   - Dialog for creating new projects

### Main Application Layout
4. **MainLayout** (`src/renderer/components/MainLayout.tsx`)
   - Main application container
   - Contains all primary views and navigation

### Dashboard Pages (accessed via MainLayout project tabs)
5. **WidgetDashboard** (`src/renderer/components/dashboard/WidgetDashboard.tsx`)
   - Main dashboard with customizable widgets
   - Default dashboard view when opening a project
   - Supports widget-based customization

6. **PersonalizedDashboard** (`src/renderer/components/PersonalizedDashboard.tsx`)
   - Personalized user dashboard with recommendations
   - User-specific task recommendations and analytics

7. **ProgressDashboard** (`src/renderer/components/ProgressDashboard.tsx`)
   - Progress tracking dashboard
   - Project progress visualization and metrics

### Project Management Views (accessed via MainLayout project tabs)
8. **TaskManagementView** (`src/renderer/components/TaskManagementView.tsx`)
   - Task list and management interface

9. **TaskReattributionView** (`src/renderer/components/TaskReattributionView.tsx`)
   - Task re-attribution interface

10. **RoadmapView** (`src/renderer/components/RoadmapView.tsx`)
   - Roadmap visualization and management

11. **ModuleView** (`src/renderer/components/ModuleView.tsx`)
    - Module detection and management

12. **IssueAnticipationPanel** (`src/renderer/components/IssueAnticipationPanel.tsx`)
    - Issue detection and management

13. **ArchitectureEditor** (`src/renderer/components/ArchitectureEditor.tsx`)
    - Architecture overview and editing

14. **ApplicationContextEditor** (`src/renderer/components/ApplicationContextEditor.tsx`)
    - Application context editing

15. **TeamManagementView** (`src/renderer/components/TeamManagementView.tsx`)
    - Team management interface

16. **ProjectAccessManager** (`src/renderer/components/ProjectAccessManager.tsx`)
    - Project access control management

17. **EnvironmentManagerView** (`src/renderer/components/EnvironmentManagerView.tsx`)
    - Environment management

18. **RoleManagerView** (`src/renderer/components/RoleManagerView.tsx`)
    - Role and permission management

19. **UserManagementView** (`src/renderer/components/UserManagementView.tsx`)
    - User management interface

20. **InvitationManagementView** (`src/renderer/components/InvitationManagementView.tsx`)
    - Invitation management

21. **AuditLogViewer** (`src/renderer/components/AuditLogViewer.tsx`)
    - Audit log viewing interface

22. **LogIntegrationManager** (`src/renderer/components/LogIntegrationManager.tsx`)
    - Log integration management

23. **MetricsIntegrationManager** (`src/renderer/components/MetricsIntegrationManager.tsx`)
    - Metrics integration management

24. **TaskRecommendationReview** (`src/renderer/components/TaskRecommendationReview.tsx`)
    - Task recommendation review interface

25. **FeedbackManagementView** (`src/renderer/components/FeedbackManagementView.tsx`)
    - Feedback management interface

26. **MCPServerManager** (`src/renderer/components/MCPServerManager.tsx`)
    - MCP server management

27. **PromptManager** (`src/renderer/components/PromptManager.tsx`)
    - Prompt management interface

28. **CalendarView** (`src/renderer/components/CalendarView.tsx`)
    - Calendar interface

29. **MessagingView** (`src/renderer/components/MessagingView.tsx`)
    - Messaging interface

30. **KnowledgeBaseView** (`src/renderer/components/KnowledgeBaseView.tsx`)
    - Knowledge base interface

31. **CodeReviewView** (`src/renderer/components/CodeReviewView.tsx`)
    - Code review interface

32. **AICodeReviewPanel** (`src/renderer/components/AICodeReviewPanel.tsx`)
    - AI-powered code review panel

33. **DependencyTrackingView** (`src/renderer/components/DependencyTrackingView.tsx`)
    - Dependency tracking interface

34. **ReleaseManagementView** (`src/renderer/components/ReleaseManagementView.tsx`)
    - Release management interface

35. **TechnicalDebtView** (`src/renderer/components/TechnicalDebtView.tsx`)
    - Technical debt tracking interface

36. **IncidentRCAView** (`src/renderer/components/IncidentRCAView.tsx`)
    - Incident and root cause analysis interface

37. **CapacityPlanningView** (`src/renderer/components/CapacityPlanningView.tsx`)
    - Capacity planning interface

38. **PairingView** (`src/renderer/components/PairingView.tsx`)
    - Pairing interface

39. **CollaborativeArchitectureView** (`src/renderer/components/CollaborativeArchitectureView.tsx`)
    - Collaborative architecture design interface

40. **ObservabilityView** (`src/renderer/components/ObservabilityView.tsx`)
    - Observability interface

41. **ContinuousLearningView** (`src/renderer/components/ContinuousLearningView.tsx`)
    - Continuous learning interface

42. **PatternLibraryView** (`src/renderer/components/PatternLibraryView.tsx`)
    - Pattern library interface

43. **ExperimentationView** (`src/renderer/components/ExperimentationView.tsx`)
    - Experimentation interface

44. **ComplianceView** (`src/renderer/components/ComplianceView.tsx`)
    - Compliance interface

45. **InnovationView** (`src/renderer/components/InnovationView.tsx`)
    - Innovation management interface

46. **AgentSystemView** (`src/renderer/components/AgentSystemView.tsx`)
    - Agent system interface

47. **WorkflowOrchestrationView** (`src/renderer/components/WorkflowOrchestrationView.tsx`)
    - Workflow orchestration interface

48. **UserProfileEditor** (`src/renderer/components/UserProfileEditor.tsx`)
    - User profile editing interface

### Planning & Execution Views (accessed via MainLayout plans tab)
49. **PlanView** (`src/renderer/components/PlanView.tsx`)
    - Plan visualization and management

50. **ExecutionStatus** (`src/renderer/components/ExecutionStatus.tsx`)
    - Execution status tracking

51. **ExplanationUI** (`src/renderer/components/ExplanationUI.tsx`)
    - Explanation interface

52. **TestView** (`src/renderer/components/TestView.tsx`)
    - Test interface

### Activity Bar Views (accessed via MainLayout activity bar)
53. **FileExplorer** (`src/renderer/components/FileExplorer.tsx`)
    - File explorer sidebar

54. **SearchPanel** (`src/renderer/components/SearchPanel.tsx`)
    - Search panel

55. **SourceControlPanel** (`src/renderer/components/SourceControlPanel.tsx`)
    - Source control panel

56. **DebugPanel** (`src/renderer/components/DebugPanel.tsx`)
    - Debug panel

57. **ExtensionsPanel** (`src/renderer/components/ExtensionsPanel.tsx`)
    - Extensions panel

58. **ChatPanel** (`src/renderer/components/ChatPanel.tsx`)
    - Chat panel for AI interactions

59. **SettingsPanel** (`src/renderer/components/SettingsPanel.tsx`)
    - Settings panel

### Bottom Panel Views
60. **TerminalPanel** (`src/renderer/components/TerminalPanel.tsx`)
    - Terminal panel

61. **ProblemsPanel** (`src/renderer/components/ProblemsPanel.tsx`)
    - Problems panel

62. **OutputPanel** (`src/renderer/components/OutputPanel.tsx`)
    - Output panel

---

## 🧩 Components

Components are reusable UI elements used throughout the application.

### Layout Components
1. **ActivityBar** (`src/renderer/components/ActivityBar.tsx`)
   - Activity bar navigation component

2. **ActivityBarItem** (`src/renderer/components/ActivityBarItem.tsx`)
   - Individual activity bar item

3. **MenuBar** (`src/renderer/components/MenuBar.tsx`)
   - Main menu bar

4. **StatusBar** (`src/renderer/components/StatusBar.tsx`)
   - Status bar component

5. **StatusBarItem** (`src/renderer/components/StatusBarItem.tsx`)
   - Individual status bar item

6. **SecondarySidebar** (`src/renderer/components/SecondarySidebar.tsx`)
   - Secondary sidebar component

7. **EditorTabs** (`src/renderer/components/EditorTabs.tsx`)
   - Editor tab navigation

8. **Breadcrumbs** (`src/renderer/components/Breadcrumbs.tsx`)
   - Breadcrumb navigation

### Editor Components
9. **Editor** (`src/renderer/components/Editor.tsx`)
   - Main code editor (Monaco-based)

10. **DiffView** (`src/renderer/components/DiffView.tsx`)
    - Diff view component

11. **PlanEditor** (`src/renderer/components/PlanEditor.tsx`)
    - Plan editor component

12. **PlanGraphView** (`src/renderer/components/PlanGraphView.tsx`)
    - Plan graph visualization

13. **PlanExplanationView** (`src/renderer/components/PlanExplanationView.tsx`)
    - Plan explanation view

14. **ExecutionControlPanel** (`src/renderer/components/ExecutionControlPanel.tsx`)
    - Execution control panel

15. **StreamingDisplay** (`src/renderer/components/StreamingDisplay.tsx`)
    - Streaming display component

### File Management Components
16. **FileExplorerHeader** (`src/renderer/components/FileExplorerHeader.tsx`)
    - File explorer header

17. **FileTree** (`src/renderer/components/FileTree.tsx`)
    - File tree component

18. **FileTreeItem** (`src/renderer/components/FileTreeItem.tsx`)
    - Individual file tree item

19. **NewFileDialog** (`src/renderer/components/NewFileDialog.tsx`)
    - New file creation dialog

### Navigation & Search Components
20. **CommandPalette** (`src/renderer/components/CommandPalette.tsx`)
    - Command palette for quick actions

21. **QuickOpen** (`src/renderer/components/QuickOpen.tsx`)
    - Quick open file dialog

22. **GoToSymbol** (`src/renderer/components/GoToSymbol.tsx`)
    - Go to symbol dialog

23. **GoToLine** (`src/renderer/components/GoToLine.tsx`)
    - Go to line dialog

### Dialog & Modal Components
24. **ConfirmationDialog** (`src/renderer/components/ConfirmationDialog.tsx`)
    - Confirmation dialog component

25. **UnsavedChangesDialog** (`src/renderer/components/UnsavedChangesDialog.tsx`)
    - Unsaved changes warning dialog

26. **EscalationDialog** (`src/renderer/components/EscalationDialog.tsx`)
    - Escalation dialog

27. **EscalationManager** (`src/renderer/components/EscalationManager.tsx`)
    - Escalation management component

### UI Utility Components
28. **EmptyState** (`src/renderer/components/EmptyState.tsx`)
    - Empty state display component

29. **ErrorDisplay** (`src/renderer/components/ErrorDisplay.tsx`)
    - Error display component

30. **ErrorBoundary** (`src/renderer/components/ErrorBoundary.tsx`)
    - React error boundary component

31. **LoadingSpinner** (`src/renderer/components/LoadingSpinner.tsx`)
    - Loading spinner component

### Theme & Configuration Components
32. **ThemeProvider** (`src/renderer/components/ThemeProvider.tsx`)
    - Theme provider component

33. **ThemeToggle** (`src/renderer/components/ThemeToggle.tsx`)
    - Theme toggle component

34. **ConfigForm** (`src/renderer/components/ConfigForm.tsx`)
    - Configuration form component

35. **ModelConfiguration** (`src/renderer/components/ModelConfiguration.tsx`)
    - Model configuration component

### Dashboard Components
36. **WidgetConfigDialog** (`src/renderer/components/dashboard/WidgetConfigDialog.tsx`)
    - Widget configuration dialog

37. **WidgetCatalog** (`src/renderer/components/widgets/WidgetCatalog.tsx`)
    - Widget catalog component

38. **WidgetRenderer** (`src/renderer/components/widgets/WidgetRenderer.tsx`)
    - Widget renderer component

### Management & Integration Components
39. **OrganizationSwitcher** (`src/renderer/components/OrganizationSwitcher.tsx`)
    - Organization switcher component

40. **RequirePermission** (`src/renderer/components/RequirePermission.tsx`)
    - Permission requirement wrapper

41. **RoleManagementView** (`src/renderer/components/RoleManagementView.tsx`)
    - Role management view (alternative to RoleManagerView)

42. **LogViewer** (`src/renderer/components/LogViewer.tsx`)
    - Log viewer component

43. **MetricsViewer** (`src/renderer/components/MetricsViewer.tsx`)
    - Metrics viewer component

44. **FeedbackApiKeyManager** (`src/renderer/components/FeedbackApiKeyManager.tsx`)
    - Feedback API key manager

### shadcn/ui Components (UI Library)
Located in `src/renderer/components/ui/`:

45. **accordion.tsx** - Accordion component
46. **alert.tsx** - Alert component
47. **avatar.tsx** - Avatar component
48. **badge.tsx** - Badge component
49. **breadcrumb.tsx** - Breadcrumb component
50. **button.tsx** - Button component
51. **card.tsx** - Card component (with CardHeader, CardTitle, CardContent, CardDescription, CardFooter)
52. **checkbox.tsx** - Checkbox component
53. **command.tsx** - Command component
54. **dialog.tsx** - Dialog component (with DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
55. **dropdown-menu.tsx** - Dropdown menu component
56. **form.tsx** - Form component (with react-hook-form integration)
57. **input.tsx** - Input component
58. **label.tsx** - Label component
59. **menubar.tsx** - Menubar component
60. **navigation-menu.tsx** - Navigation menu component
61. **popover.tsx** - Popover component
62. **progress.tsx** - Progress component
63. **radio-group.tsx** - Radio group component
64. **resizable.tsx** - Resizable panel component
65. **scroll-area.tsx** - Scroll area component
66. **select.tsx** - Select component
67. **separator.tsx** - Separator component
68. **skeleton.tsx** - Skeleton loading component
69. **sonner.tsx** - Toast/notification component
70. **switch.tsx** - Switch component
71. **tabs.tsx** - Tabs component
72. **textarea.tsx** - Textarea component
73. **tooltip.tsx** - Tooltip component

---

## 📊 Summary Statistics

- **Total Pages/Views:** 62
  - **Dashboard Pages:** 3 (WidgetDashboard, PersonalizedDashboard, ProgressDashboard)
  - **Project Management Views:** 44
  - **Planning & Execution Views:** 4
  - **Activity Bar Views:** 8
  - **Bottom Panel Views:** 3
- **Total Components:** 73
- **shadcn/ui Components:** 29
- **Custom Components:** 44
- **Total React Components:** 135

---

## 📁 Component Organization

### Directory Structure
```
src/renderer/components/
├── ui/                    # shadcn/ui components (29 files)
├── dashboard/            # Dashboard-related components (2 files)
│   ├── WidgetDashboard.tsx
│   └── WidgetConfigDialog.tsx
├── widgets/              # Widget components (2 files)
│   ├── WidgetCatalog.tsx
│   └── WidgetRenderer.tsx
└── [other components]    # Main application components (102 files)
```

### Component Categories

1. **Layout & Navigation** (8 components)
   - ActivityBar, MenuBar, StatusBar, Breadcrumbs, etc.

2. **Editor & Code** (6 components)
   - Editor, DiffView, PlanEditor, etc.

3. **File Management** (4 components)
   - FileExplorer, FileTree, NewFileDialog, etc.

4. **Dialogs & Modals** (4 components)
   - ConfirmationDialog, UnsavedChangesDialog, etc.

5. **UI Utilities** (4 components)
   - EmptyState, ErrorDisplay, LoadingSpinner, etc.

6. **Management Views** (40+ components)
   - All the main application views for managing projects, tasks, teams, etc.

7. **shadcn/ui Library** (29 components)
   - Reusable UI primitives following shadcn/ui patterns

---

## 🔗 Navigation Flow

### Authentication Flow
```
LoginView → ProjectSelector → MainLayout
```

### MainLayout Structure
```
MainLayout
├── Activity Bar Views
│   ├── FileExplorer
│   ├── SearchPanel
│   ├── SourceControlPanel
│   ├── DebugPanel
│   ├── ExtensionsPanel
│   ├── ChatPanel
│   ├── Plans (PlanView, ExecutionStatus, ExplanationUI, TestView)
│   ├── Project (Dashboard + 44 project management views)
│   │   ├── Dashboard Pages (WidgetDashboard, PersonalizedDashboard, ProgressDashboard)
│   │   └── Management Views (Tasks, Roadmap, Teams, etc.)
│   └── SettingsPanel
├── Editor Area
│   ├── EditorTabs
│   ├── Breadcrumbs
│   └── Editor
└── Bottom Panel
    ├── TerminalPanel
    ├── ProblemsPanel
    └── OutputPanel
```

---

## 📝 Notes

- All components are located in `src/renderer/components/`
- Pages are typically full-screen views or major sections
- Components are reusable UI elements
- shadcn/ui components follow the shadcn/ui design system
- Most views are accessible via tabs in the MainLayout
- The application uses a tab-based navigation system within MainLayout

---

## 🔍 Component Audit & Quality

A comprehensive audit has been performed on all components. See **COMPONENT_AUDIT_REPORT.md** for:
- Gap analysis and findings
- Best practices violations
- Fix patterns and templates
- Priority recommendations

### Audit Status

- ✅ **WidgetDashboard** - Fully fixed (accessibility, error handling, TypeScript types)
- ⚠️ **Remaining Components** - See audit report for detailed findings

### Common Gaps Identified

1. **TypeScript `any` types** - 410 instances across 73 files
2. **Missing LoadingSpinner** - ~20 components using plain text
3. **Missing ErrorDisplay** - Many components missing error states
4. **Missing ARIA labels** - Icon buttons need accessibility labels
5. **Missing EmptyState** - List views need empty state handling

### Fix Templates Available

The audit report includes complete fix templates for:
- Error handling patterns
- Loading state patterns
- Accessibility improvements
- TypeScript type safety

---

*This document is auto-generated. For the most up-to-date list, refer to the actual component files in the repository.*  
*For quality audit and fixes, see COMPONENT_AUDIT_REPORT.md*
