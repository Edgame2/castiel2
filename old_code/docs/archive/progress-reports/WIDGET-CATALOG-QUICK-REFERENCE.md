# Widget Catalog - Quick Reference

## What Was Built

A complete widget catalog management system that allows:
- **SuperAdmins** to create, edit, and delete widget types system-wide
- **TenantAdmins** to customize widget visibility and role-based access for their tenant
- **Users** to see and use widgets based on their role and tenant settings

---

## File Locations

### Backend
| File | Purpose |
|------|---------|
| `apps/api/src/types/widget-catalog.types.ts` | Type definitions |
| `apps/api/src/services/widget-catalog.service.ts` | Business logic |
| `apps/api/src/repositories/widget-catalog.repository.ts` | Database access |
| `apps/api/src/routes/widget-catalog.routes.ts` | API endpoints |
| `apps/api/src/schemas/widget-catalog.schemas.ts` | Validation schemas |
| `apps/api/src/services/widget-migration.service.ts` | Migration utility |

### Frontend
| File | Purpose |
|------|---------|
| `apps/web/src/types/widget-catalog.ts` | TypeScript types |
| `apps/web/src/lib/api/widgets.ts` | API client |
| `apps/web/src/hooks/use-widget-catalog.ts` | React Query hooks |
| `apps/web/src/app/(protected)/admin/widgets/` | SuperAdmin pages |
| `apps/web/src/app/(protected)/tenant/[tenantId]/widget-access/` | TenantAdmin pages |
| `apps/web/src/components/admin/widget-catalog/` | SuperAdmin components |
| `apps/web/src/components/tenant/widget-access/` | TenantAdmin components |

---

## API Endpoints

### SuperAdmin Endpoints
```
POST   /api/v1/admin/widget-catalog                    Create widget
GET    /api/v1/admin/widget-catalog                    List widgets
GET    /api/v1/admin/widget-catalog/:id                Get widget
PATCH  /api/v1/admin/widget-catalog/:id                Update widget
DELETE /api/v1/admin/widget-catalog/:id                Delete widget
```

### TenantAdmin Endpoints
```
GET    /api/v1/admin/tenants/:tenantId/widget-access           Get config
PUT    /api/v1/admin/tenants/:tenantId/widget-access           Update config
PATCH  /api/v1/admin/tenants/:tenantId/widget-access/:widgetId Update widget access
DELETE /api/v1/admin/tenants/:tenantId/widget-access/:widgetId Delete override
```

### User Endpoint
```
GET    /api/v1/widget-catalog                          Get available widgets
```

---

## Key Components

### SuperAdmin Features
- ✅ Create widget types with full configuration
- ✅ Edit display name, description, visibility, status
- ✅ Set default and featured widgets
- ✅ Delete widget types
- ✅ Search and filter by status/category
- ✅ Pagination support

### TenantAdmin Features
- ✅ View all widgets with current status
- ✅ Toggle visibility per widget
- ✅ Mark widgets as featured
- ✅ View configuration summary
- ✅ Bulk management capabilities
- ✅ Cannot modify base widget configs

### User Features
- ✅ See only visible widgets for their tenant/role
- ✅ See featured widgets highlighted
- ✅ Filter and search
- ✅ Use widgets in dashboards

---

## Permission Model

### SuperAdmin (requireGlobalAdmin)
- Full CRUD on widget catalog entries
- Can modify all fields
- Access to all system operations

### TenantAdmin (requireTenantAdmin)
- View all widgets
- Toggle visibility/featured status
- Configure role-based access
- **Cannot modify widget configuration**
- **Cannot create new widget types**

### Regular User (requireAuth)
- Read-only access
- See only permitted widgets
- Based on role and tenant settings

---

## Database Containers

Three Cosmos DB containers needed:
1. `widgetCatalog` - System widget definitions
2. `tenantWidgetOverrides` - Tenant-specific customizations
3. `tenantWidgetConfigs` - Tenant settings and limits

---

## How It Works

### Creating a Widget (SuperAdmin)
1. Go to `/admin/widgets` → "Create Widget"
2. Fill in widget details (name, type, size, visibility)
3. Submit → Widget added to system catalog
4. All tenants can now see it (unless hidden)

### Customizing Visibility (TenantAdmin)
1. Go to `/tenant/[tenantId]/widget-access`
2. Toggle visibility for widgets
3. Mark widgets as featured for your tenant
4. Changes apply immediately to tenant users

### Using a Widget (User)
1. Widget appears in dashboard widget picker
2. Only if:
   - Not hidden by tenant
   - Visibility level matches user's role
   - User's role is in allowed_roles (if specified)

---

## Development Workflow

### To Register Routes
Add to main API router:
```typescript
import { widgetCatalogRoutes } from './routes/widget-catalog.routes.js';
app.register(widgetCatalogRoutes);
```

### To Integrate with Dashboards
Task 7 covers updating dashboard service to:
1. Fetch widget config from catalog
2. Apply tenant overrides
3. Filter by user permissions

### Testing
```bash
# Test endpoints
curl -H "Authorization: Bearer {token}" \
  http://localhost:3001/api/v1/admin/widget-catalog

# Create test widget
POST /api/v1/admin/widget-catalog
{
  "widgetType": "counter",
  "name": "test-widget",
  "displayName": "Test Widget",
  "description": "A test widget",
  "category": "Test",
  "defaultSize": {"width": 4, "height": 3},
  "defaultConfig": {},
  "visibilityLevel": "all"
}
```

---

## Design Principles

1. **Immutable Base Configs** - Only SuperAdmin can change widget base config
2. **TenantAdmin Customization** - Tenants control visibility/roles only
3. **Role-Based Access** - API guards prevent unauthorized operations
4. **Optimistic Concurrency** - Version checking prevents conflicts
5. **Tenant Isolation** - Data properly partitioned per tenant

---

## Dependencies Used

- **Backend:** Fastify, Zod, Azure Cosmos DB
- **Frontend:** React, Next.js, React Query, React Hook Form, shadcn/ui

---

## What's Next

**Task 7 (Pending):** Update dashboard service to fetch widget configs from catalog and apply tenant overrides

**Phase 2 (Future):**
- Widget templates
- Role-specific defaults
- Audit logging
- Widget analytics
- Batch operations

---

## Troubleshooting

### Widget Not Appearing
- Check visibility level in widget config
- Check if hidden by tenant
- Check user's role is in allowed_roles

### Cannot Edit Widget
- Ensure you're SuperAdmin (requireGlobalAdmin)
- Check browser console for auth errors

### Visibility Toggle Not Working
- Ensure you're TenantAdmin for that tenant
- Check browser network tab for API errors
- Verify version is current (might be cached)

---

## Documentation Files

- `WIDGET-CATALOG-IMPLEMENTATION.md` - Full implementation details
- This file - Quick reference and getting started
- Code comments - Inline documentation in each file

---

For more details, see `WIDGET-CATALOG-IMPLEMENTATION.md`
