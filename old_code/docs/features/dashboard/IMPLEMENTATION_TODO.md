# 📋 Dashboard System - Implementation TODO

> Track progress for the Dashboard System implementation.

---

## Phase 1: Core Foundation

### Backend

- [ ] **ShardType Definitions**
  - [ ] Create `c_dashboard` ShardType
  - [ ] Create `c_dashboardWidget` ShardType
  - [ ] Create `c_userGroup` ShardType
  - [ ] Add seed data for ShardTypes

- [ ] **Dashboard Repository**
  - [ ] `dashboard.repository.ts` - CRUD operations
  - [ ] Cosmos DB indexing for dashboard queries
  - [ ] Dashboard-Widget relationship handling

- [ ] **Dashboard Service**
  - [ ] `dashboard.service.ts` - Business logic
  - [ ] Dashboard merge logic (system + tenant + user)
  - [ ] Permission resolution
  - [ ] Widget data filtering

- [ ] **Dashboard Controller**
  - [ ] `dashboard.controller.ts` - HTTP handlers
  - [ ] Input validation schemas
  - [ ] Error handling

- [ ] **Dashboard Routes**
  - [ ] `dashboard.routes.ts`
  - [ ] `/api/dashboards` CRUD
  - [ ] `/api/dashboards/:id/widgets` Widget management
  - [ ] `/api/dashboards/merged` Merged view

- [ ] **Widget Data Service**
  - [ ] `widget-data.service.ts`
  - [ ] Predefined query implementations
  - [ ] Custom query executor
  - [ ] Data transformation pipeline

### Frontend

- [ ] **Dashboard List Page**
  - [ ] `app/(protected)/dashboards/page.tsx`
  - [ ] List user's dashboards
  - [ ] Show inherited dashboards
  - [ ] Create new dashboard button

- [ ] **Dashboard View Page**
  - [ ] `app/(protected)/dashboards/[id]/page.tsx`
  - [ ] Grid layout rendering
  - [ ] Widget rendering engine
  - [ ] Refresh controls

- [ ] **Dashboard Editor**
  - [ ] `app/(protected)/dashboards/[id]/edit/page.tsx`
  - [ ] Drag-and-drop grid
  - [ ] Widget palette
  - [ ] Settings panel

- [ ] **Widget Components**
  - [ ] `components/dashboard/widgets/counter.tsx`
  - [ ] `components/dashboard/widgets/table.tsx`
  - [ ] `components/dashboard/widgets/list.tsx`
  - [ ] Widget wrapper component

- [ ] **Grid Layout**
  - [ ] Install react-grid-layout
  - [ ] Grid configuration
  - [ ] Responsive breakpoints

---

## Phase 2: Feature Management & Limits

### Backend

- [ ] **Feature Flag Service**
  - [ ] `dashboard-feature.service.ts`
  - [ ] Global config storage
  - [ ] Tenant override storage
  - [ ] Feature check methods

- [ ] **Feature Flag Types**
  - [ ] `dashboard-feature.types.ts`
  - [ ] `DashboardFeatureFlags` interface
  - [ ] `TenantDashboardConfig` interface

- [ ] **Admin Controller**
  - [ ] `dashboard-admin.controller.ts`
  - [ ] Global config endpoints
  - [ ] Tenant config endpoints

- [ ] **Admin Routes**
  - [ ] `/api/admin/dashboard-config`
  - [ ] `/api/admin/tenants/:tenantId/dashboard-config`

- [ ] **Limit Enforcement**
  - [ ] Check limits before dashboard creation
  - [ ] Check limits before widget creation
  - [ ] Return appropriate errors

### Frontend

- [ ] **Super Admin Dashboard Config Page**
  - [ ] `app/(protected)/admin/dashboard-config/page.tsx`
  - [ ] Global feature toggles
  - [ ] Global limits configuration

- [ ] **Tenant Config Override Page**
  - [ ] `app/(protected)/admin/tenants/[id]/dashboard-config/page.tsx`
  - [ ] Per-tenant overrides
  - [ ] Reset to defaults button

---

## Phase 3: Permissions & Groups

### Backend

- [ ] **Group Repository**
  - [ ] `group.repository.ts`
  - [ ] CRUD operations
  - [ ] Membership management

- [ ] **Group Service**
  - [ ] `group.service.ts`
  - [ ] Create/update/delete groups
  - [ ] Member management
  - [ ] Group membership check

- [ ] **Group Controller**
  - [ ] `group.controller.ts`
  - [ ] Group CRUD endpoints
  - [ ] Membership endpoints

- [ ] **Group Routes**
  - [ ] `/api/groups` CRUD
  - [ ] `/api/groups/:id/members`

- [ ] **Permission Service Updates**
  - [ ] Add group permission resolution
  - [ ] Combine user + role + group permissions
  - [ ] Update dashboard permission check

### Frontend

- [ ] **Group Management Page**
  - [ ] `app/(protected)/admin/groups/page.tsx`
  - [ ] List groups
  - [ ] Create group modal
  - [ ] Member management

- [ ] **Dashboard Permissions UI**
  - [ ] Add group selector to permissions
  - [ ] Show group permissions in list
  - [ ] Group badge on shared dashboards

---

## Phase 4: SSO Group Integration

### Backend

- [ ] **SSO Group Service**
  - [ ] `sso-group.service.ts`
  - [ ] Parse group claims
  - [ ] Map external to internal groups
  - [ ] Sync group membership

- [ ] **SSO Group Types**
  - [ ] `sso-group.types.ts`
  - [ ] `SSOGroupMappingConfig` interface
  - [ ] `SSOGroupMapping` interface

- [ ] **SSO Group Controller**
  - [ ] `sso-group.controller.ts`
  - [ ] Mapping config endpoints
  - [ ] Sync endpoints

- [ ] **SSO Group Routes**
  - [ ] `/api/tenant/sso/group-mapping`
  - [ ] `/api/tenant/sso/group-mapping/sync`
  - [ ] `/api/tenant/sso/group-mapping/test`

- [ ] **Login Hook**
  - [ ] Extract groups from token
  - [ ] Sync groups on login
  - [ ] Update user's group membership

### Frontend

- [ ] **SSO Group Mapping Page**
  - [ ] `app/(protected)/admin/sso/groups/page.tsx`
  - [ ] Claim configuration
  - [ ] Mapping rules
  - [ ] Test token input

- [ ] **Group Source Indicator**
  - [ ] SSO badge on groups
  - [ ] Last sync timestamp
  - [ ] Sync button

---

## Phase 5: Context & Filters

### Backend

- [ ] **Dashboard Context Types**
  - [ ] `dashboard-context.types.ts`
  - [ ] `DashboardContext` interface
  - [ ] `DashboardFilters` interface

- [ ] **Fiscal Year Service**
  - [ ] `fiscal-year.service.ts`
  - [ ] Tenant config storage
  - [ ] Date preset calculations
  - [ ] Fiscal quarter/year methods

- [ ] **Fiscal Year Types**
  - [ ] `fiscal-year.types.ts`
  - [ ] `TenantFiscalYearConfig` interface
  - [ ] `DatePreset` type

- [ ] **Fiscal Year Controller**
  - [ ] `fiscal-year.controller.ts`
  - [ ] Get/update config endpoints

- [ ] **Fiscal Year Routes**
  - [ ] `/api/tenant/fiscal-year`

- [ ] **Widget Data Service Updates**
  - [ ] Accept context in queries
  - [ ] Apply date filters
  - [ ] Calculate fiscal periods

### Frontend

- [ ] **Fiscal Year Config Page**
  - [ ] `app/(protected)/admin/tenant/fiscal-year/page.tsx`
  - [ ] Month/day picker
  - [ ] Preview fiscal periods

- [ ] **Dashboard Filter Bar**
  - [ ] `components/dashboard/filter-bar.tsx`
  - [ ] Date range picker
  - [ ] Preset selector (with fiscal options)
  - [ ] Custom filter inputs

- [ ] **Context Selector**
  - [ ] Shard picker for context
  - [ ] URL sync for context
  - [ ] Context indicator

---

## Phase 6: Templates & Versioning

### Backend

- [ ] **Template Service**
  - [ ] Template CRUD
  - [ ] Template instantiation
  - [ ] Template categories

- [ ] **Version Service**
  - [ ] Version snapshot on changes
  - [ ] Version storage
  - [ ] Rollback implementation
  - [ ] Version cleanup job

- [ ] **Template Routes**
  - [ ] `/api/dashboard-templates` CRUD
  - [ ] `/api/dashboard-templates/:id/instantiate`

- [ ] **Version Routes**
  - [ ] `/api/dashboards/:id/versions`
  - [ ] `/api/dashboards/:id/versions/:v/rollback`

### Frontend

- [ ] **Template Gallery**
  - [ ] `app/(protected)/dashboards/templates/page.tsx`
  - [ ] Category filtering
  - [ ] Template preview
  - [ ] Instantiate button

- [ ] **Version History**
  - [ ] Version list panel
  - [ ] Version comparison view
  - [ ] Rollback confirmation

---

## Phase 7: Advanced Widgets

### Backend

- [ ] **Chart Data Service**
  - [ ] Time series aggregation
  - [ ] Group by support
  - [ ] Multiple series

- [ ] **Custom Query Builder**
  - [ ] Query validation
  - [ ] Permission-aware execution
  - [ ] Result transformation

- [ ] **WebSocket Integration**
  - [ ] Widget data subscription
  - [ ] Real-time updates
  - [ ] Connection management

### Frontend

- [ ] **Chart Widgets**
  - [ ] Install charting library (Recharts)
  - [ ] Line chart component
  - [ ] Bar chart component
  - [ ] Pie chart component

- [ ] **Custom Query Builder UI**
  - [ ] Field selector
  - [ ] Filter builder
  - [ ] Aggregation config
  - [ ] Preview

- [ ] **Real-time Updates**
  - [ ] WebSocket connection
  - [ ] Widget refresh on update
  - [ ] Connection status indicator

---

## Phase 8: Polish & Mobile

### Frontend

- [ ] **Responsive Layout**
  - [ ] Tablet breakpoint handling
  - [ ] Mobile breakpoint handling
  - [ ] Touch-friendly drag/drop

- [ ] **Mobile View**
  - [ ] Single column layout
  - [ ] Collapsible widgets
  - [ ] Swipe gestures

- [ ] **UX Improvements**
  - [ ] Loading skeletons
  - [ ] Empty states
  - [ ] Error boundaries
  - [ ] Keyboard shortcuts

- [ ] **Import/Export**
  - [ ] Export dashboard JSON
  - [ ] Import dashboard
  - [ ] Share via link

---

## Technical Debt & Nice-to-Haves

- [ ] Widget caching strategy
- [ ] Dashboard analytics (usage tracking)
- [ ] A/B testing for dashboard layouts
- [ ] Dashboard scheduling (email reports)
- [ ] Widget marketplace concept
- [ ] AI-suggested widgets

---

## Dependencies

| Package | Purpose | Install Command |
|---------|---------|-----------------|
| `react-grid-layout` | Drag-drop grid | `pnpm add react-grid-layout @types/react-grid-layout --filter=@castiel/web` |
| `recharts` | Charts | `pnpm add recharts --filter=@castiel/web` |

---

## Files to Create

### Backend (`apps/api/src/`)

```
types/
├── dashboard.types.ts
├── dashboard-feature.types.ts
├── dashboard-context.types.ts
├── widget.types.ts
├── group.types.ts
├── sso-group.types.ts
├── fiscal-year.types.ts

repositories/
├── dashboard.repository.ts
├── group.repository.ts

services/
├── dashboard.service.ts
├── dashboard-feature.service.ts
├── widget-data.service.ts
├── dashboard-template.service.ts
├── dashboard-version.service.ts
├── group.service.ts
├── sso-group.service.ts
├── fiscal-year.service.ts

controllers/
├── dashboard.controller.ts
├── dashboard-admin.controller.ts
├── dashboard-template.controller.ts
├── group.controller.ts
├── sso-group.controller.ts
├── fiscal-year.controller.ts

routes/
├── dashboard.routes.ts
├── dashboard-admin.routes.ts
├── dashboard-template.routes.ts
├── group.routes.ts
├── sso-group.routes.ts
├── fiscal-year.routes.ts

schemas/
├── dashboard.schemas.ts
├── widget.schemas.ts
├── group.schemas.ts
├── sso-group.schemas.ts
├── fiscal-year.schemas.ts

seed/
├── dashboard-shard-types.seed.ts
├── default-templates.seed.ts
```

### Frontend (`apps/web/src/`)

```
app/(protected)/
├── dashboards/
│   ├── page.tsx
│   ├── [id]/
│   │   ├── page.tsx
│   │   └── edit/
│   │       └── page.tsx
│   ├── new/
│   │   └── page.tsx
│   └── templates/
│       └── page.tsx
├── admin/
│   ├── dashboard-config/
│   │   └── page.tsx
│   ├── groups/
│   │   └── page.tsx
│   ├── sso/
│   │   └── groups/
│   │       └── page.tsx
│   └── tenant/
│       └── fiscal-year/
│           └── page.tsx

components/dashboard/
├── dashboard-grid.tsx
├── dashboard-toolbar.tsx
├── dashboard-filter-bar.tsx
├── widget-palette.tsx
├── widget-wrapper.tsx
├── context-selector.tsx
├── widgets/
│   ├── counter-widget.tsx
│   ├── chart-widget.tsx
│   ├── table-widget.tsx
│   ├── list-widget.tsx
│   ├── shard-activity-widget.tsx
│   └── ...

components/groups/
├── group-list.tsx
├── group-form.tsx
├── group-members.tsx
├── sso-mapping-form.tsx

hooks/
├── use-dashboard.ts
├── use-widgets.ts
├── use-widget-data.ts
├── use-groups.ts
├── use-fiscal-year.ts

lib/api/
├── dashboards.ts
├── widgets.ts
├── groups.ts
├── sso-groups.ts
├── fiscal-year.ts
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Core Foundation | 2-3 weeks | None |
| Phase 2: Feature Management | 1 week | Phase 1 |
| Phase 3: Permissions & Groups | 1-2 weeks | Phase 1 |
| Phase 4: SSO Integration | 1-2 weeks | Phase 3 |
| Phase 5: Context & Filters | 1-2 weeks | Phase 1 |
| Phase 6: Templates & Versioning | 1-2 weeks | Phase 1 |
| Phase 7: Advanced Widgets | 2-3 weeks | Phase 1, 5 |
| Phase 8: Polish | 1-2 weeks | Phase 7 |

**Total: 10-17 weeks**

---

## Success Metrics

- [ ] Super Admin can enable/disable dashboards globally
- [ ] Super Admin can configure per-tenant limits
- [ ] Users can create and customize dashboards
- [ ] Group permissions work correctly
- [ ] SSO groups sync automatically
- [ ] Fiscal year presets calculate correctly
- [ ] Dashboard context filters widgets properly
- [ ] Widgets display real-time data
- [ ] Mobile-responsive layout works
- [ ] Dashboard loads in < 2 seconds
- [ ] Widget refresh is smooth (no flicker)

---

**Last Updated**: November 30, 2025
