# Frontend Migration Notes

## Status: In Progress

The frontend has been reorganized to a module-first structure. Files have been moved, but import paths throughout the codebase need to be updated.

## New Structure

```
src/renderer/
├── auth/              # Authentication module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── users/             # User Management module (includes Organizations, Teams, RBAC)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── planning/          # Planning module (includes Projects, Tasks, Roadmaps, Issues, Releases, Architecture, Dependencies, Incidents, Environments, Debt, Reviews, Modules)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── dashboard/         # Dashboard module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── calendar/          # Calendar module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── messaging/         # Messaging module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── logging/           # Logging module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── ai/                # AI module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
├── execution/         # Execution module
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── contexts/
│   ├── services/
│   └── types/
└── shared/            # Shared components, hooks, utilities
    ├── components/
    ├── hooks/
    ├── contexts/
    ├── services/
    ├── utils/
    └── types/
```

## Migration Steps Completed

1. ✅ Created module directories
2. ✅ Moved files to new structure using migration script
3. ✅ Created index.ts files for each module
4. ⏳ Updated App.tsx imports (partial)
5. ⏳ Update all import paths throughout codebase
6. ⏳ Update IPC handlers to use new paths
7. ⏳ Test and fix broken imports

## Import Path Updates Needed

### Old → New Paths

**Auth:**
- `./contexts/AuthContext` → `./auth/contexts/AuthContext`
- `./views/auth/LoginView` → `./auth/pages/LoginView`

**Users:**
- `./views/users/*` → `./users/pages/*`
- `./views/organization/*` → `./users/pages/*`
- `./views/teams/*` → `./users/pages/*`
- `./views/rbac/*` → `./users/pages/*`
- `./components/organization/*` → `./users/components/*`
- `./components/teams/*` → `./users/components/*`
- `./components/rbac/*` → `./users/components/*`
- `./contexts/OrganizationContext` → `./users/contexts/OrganizationContext`

**Planning:**
- `./components/planning/*` → `./planning/components/*`
- `./components/projects/*` → `./planning/components/*`
- `./components/tasks/*` → `./planning/components/*`
- `./components/roadmaps/*` → `./planning/components/*`
- `./components/modules/*` → `./planning/components/*`
- `./components/environments/*` → `./planning/components/*`
- `./contexts/ProjectContext` → `./planning/contexts/ProjectContext`
- `./contexts/ReleaseContext` → `./planning/contexts/ReleaseContext`
- `./contexts/DependencyContext` → `./planning/contexts/DependencyContext`
- `./contexts/IncidentContext` → `./planning/contexts/IncidentContext`
- `./contexts/ReviewContext` → `./planning/contexts/ReviewContext`
- `./contexts/TechnicalDebtContext` → `./planning/contexts/TechnicalDebtContext`
- `./contexts/ArchitectureContext` → `./planning/contexts/ArchitectureContext`

**Shared:**
- `./components/common/*` → `./shared/components/*`
- `./components/ui/*` → `./shared/components/ui/*`
- `./components/layouts/*` → `./shared/components/layouts/*`
- `./components/MainLayout` → `./shared/components/MainLayout`
- `./components/Editor` → `./shared/components/Editor`
- `./components/FileExplorer` → `./shared/components/FileExplorer`
- `./hooks/*` → `./shared/hooks/*`
- `./utils/*` → `./shared/utils/*`
- `./contexts/ThemeContext` → `./shared/contexts/ThemeContext`
- `./contexts/ToastContext` → `./shared/contexts/ToastContext`
- `./contexts/EditorContext` → `./shared/contexts/EditorContext`

## Next Steps

1. Use find/replace to update all import paths
2. Run linter to find broken imports
3. Fix any remaining import issues
4. Update IPC handlers in `src/main/ipc/` to use new paths
5. Test application startup
6. Fix runtime errors

## Tools

- Migration script: `scripts/migrate-frontend.sh`
- Use grep to find all imports: `grep -r "from './components" src/renderer`
- Use sed for bulk replacements (be careful!)
