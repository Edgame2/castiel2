# Refactoring Feature Inventory

This document tracks all features to ensure nothing is lost during the microservices refactoring.

## Purpose

- Document all API endpoints
- Document all UI components
- Document all IPC handlers
- Document all database models
- Create feature mapping: Current Location → Target Service
- Create test checklist for each feature

## Status

**Created:** Phase 0.3
**Last Updated:** [Date]

## API Endpoints Inventory

### Planning Service
- [ ] `/api/plans` - All plan CRUD operations
- [ ] `/api/projects` - Project management
- [ ] `/api/tasks` - Task management
- [ ] `/api/roadmaps` - Roadmap management
- [ ] `/api/issues` - Issue tracking
- [ ] `/api/releases` - Release management
- [ ] `/api/architecture` - Architecture designs
- [ ] `/api/dependencies` - Dependency management
- [ ] `/api/incidents` - Incident management
- [ ] `/api/environments` - Environment management
- [ ] `/api/debt` - Technical debt tracking
- [ ] `/api/reviews` - Code reviews
- [ ] `/api/modules` - Module management

### AI Service
- [ ] `/api/agents` - Agent management
- [ ] `/api/models` - Model management
- [ ] `/api/completions` - LLM completions

### Other Services
- [ ] Document remaining endpoints...

## UI Components Inventory

### Planning Module
- [ ] PlanGenerator component
- [ ] PlanViewer component
- [ ] ProjectList component
- [ ] TaskBoard component
- [ ] RoadmapView component
- [ ] IssueTracker component
- [ ] ReleaseManager component
- [ ] ArchitectureViewer component
- [ ] DependencyGraph component
- [ ] IncidentDashboard component
- [ ] EnvironmentConfig component
- [ ] DebtTracker component
- [ ] ReviewInterface component
- [ ] ModuleExplorer component

### Other Modules
- [ ] Document remaining components...

## IPC Handlers Inventory

### Planning Handlers
- [ ] `plan:generate` - Generate plan
- [ ] `plan:get` - Get plan
- [ ] `plan:update` - Update plan
- [ ] `plan:delete` - Delete plan
- [ ] `plan:execute` - Execute plan
- [ ] `plan:refine` - Refine plan
- [ ] `plan:validate` - Validate plan
- [ ] `plan:status` - Get plan status
- [ ] `plan:steps` - Get plan steps

### Other Handlers
- [ ] Document remaining handlers...

## Database Models Inventory

### Core Models (No Prefix)
- [x] User
- [x] Organization
- [x] Session
- [x] Account

### Planning Models (plan_*, project_*, task_*, etc.)
- [x] plan_plans
- [x] plan_steps
- [x] project_projects
- [x] project_tasks
- [x] project_roadmaps
- [x] project_milestones
- [x] project_issues
- [x] project_releases
- [x] architecture_designs
- [x] project_dependencies
- [x] project_incidents
- [x] project_environments
- [x] project_debt
- [x] project_reviews
- [x] project_modules

### Other Service Models
- [x] ai_models
- [x] ai_completions
- [x] emb_documents
- [x] prompt_prompts
- [x] usage_events
- [x] metric_entries
- [x] secret_secrets
- [x] notification_notifications
- [x] execution_executions
- [x] mcp_servers
- [x] kb_entries
- [x] agent_agents
- [x] dashboard_dashboards
- [x] calendar_events
- [x] messaging_messages
- [x] log_logs

## Feature Mapping

### Current Location → Target Service

| Current Location | Feature | Target Service | Status |
|-----------------|---------|---------------|--------|
| `server/src/routes/plans.ts` | Plan CRUD | Planning Service | Pending |
| `server/src/routes/projects.ts` | Project CRUD | Planning Service | Pending |
| `server/src/routes/tasks.ts` | Task CRUD | Planning Service | Pending |
| `src/core/planning/` | Planning logic | Planning Service | Pending |
| `src/core/execution/` | Execution engine | Execution Service | Pending |
| `server/src/routes/agents.ts` | Agent management | AI Service | Pending |
| `server/src/routes/prompts.ts` | Prompt management | Prompt Management Service | Pending |
| `server/src/routes/embeddings.ts` | Embedding operations | Embeddings Service | Pending |

## Test Checklist

### Planning Service
- [ ] Plan generation works
- [ ] Plan CRUD operations work
- [ ] Plan execution triggers Execution Service
- [ ] Project management works
- [ ] Task management works
- [ ] Roadmap management works
- [ ] Issue tracking works
- [ ] Release management works
- [ ] Architecture designs work
- [ ] Dependency management works
- [ ] Incident management works
- [ ] Environment management works
- [ ] Debt tracking works
- [ ] Code reviews work
- [ ] Module management works

### Other Services
- [ ] Document test checklists...

## Notes

- This inventory will be updated as features are migrated
- Each feature should be tested after migration
- Any breaking changes should be documented
