# 🚀 Dashboard System - Quick Reference

## One-Command Setup

```bash
# Run this to set up everything:
./scripts/dashboard-quick-start.sh
```

## Manual Setup (if needed)

```bash
# 1. Seed shard types (includes dashboard types)
pnpm --filter @castiel/api seed-types

# 2. Seed widget catalog
pnpm --filter @castiel/api seed-widgets

# 3. Run tests
./scripts/test-dashboard-system.sh
```

## Key Features

### ✅ Dashboard CRUD
- Create, Read, Update, Delete dashboards
- Duplicate dashboards
- Set default dashboard
- Permission management

### ✅ Widget Management
- **Drag from catalog** → Drop on dashboard
- **Drag within dashboard** → Reorder widgets
- **Resize with handle** → Drag bottom-right corner
- Delete widgets

### ✅ Widget Catalog
- 11 pre-configured widget types
- Categories: metrics, analytics, financial, data, geo, advanced
- Draggable templates

## User Workflows

### Create Dashboard
```
/dashboards → Create Dashboard → Enter details → Create
```

### Add Widget (Drag & Drop)
```
Dashboard → Edit → Add Widget → Drag template → Drop on canvas
```

### Add Widget (Click)
```
Dashboard → Edit → Add Widget → Click template → Configure → Add
```

### Resize Widget
```
Dashboard → Edit → Hover widget → Drag resize handle (bottom-right)
```

### Reorder Widgets
```
Dashboard → Edit → Hover widget → Drag grip handle (top-left)
```

## API Endpoints

### Dashboards
- `GET /api/v1/dashboards` - List dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards/:id` - Get dashboard
- `PUT /api/v1/dashboards/:id` - Update dashboard
- `DELETE /api/v1/dashboards/:id` - Delete dashboard
- `POST /api/v1/dashboards/:id/duplicate` - Duplicate

### Widgets
- `GET /api/v1/dashboards/:id/widgets` - List widgets
- `POST /api/v1/dashboards/:id/widgets` - Create widget
- `PUT /api/v1/dashboards/:id/widgets/:widgetId` - Update widget
- `DELETE /api/v1/dashboards/:id/widgets/:widgetId` - Delete widget
- `PUT /api/v1/dashboards/:id/widgets/positions` - Batch update positions

### Widget Catalog
- `GET /api/v1/admin/widget-catalog` - List catalog entries
- `POST /api/v1/admin/widget-catalog` - Create entry (SuperAdmin)

## File Locations

### Frontend Components
```
apps/web/src/components/dashboards/
├── widget-library.tsx           # Widget catalog
├── draggable-widget-card.tsx    # Draggable templates
├── sortable-widget.tsx          # Widget with resize
└── ...
```

### Backend Services
```
apps/api/src/
├── services/dashboard.service.ts
├── services/widget-catalog.service.ts
├── repositories/dashboard.repository.ts
├── seed/widget-catalog.seed.ts
└── scripts/seed-widget-catalog.ts
```

### Tests & Scripts
```
scripts/
├── test-dashboard-system.sh      # Integration tests
└── dashboard-quick-start.sh      # One-command setup
```

## Troubleshooting

### Widget catalog empty?
```bash
pnpm --filter @castiel/api seed-widgets
```

### Drag & drop not working?
1. Check browser console
2. Verify DnD context wraps components
3. Ensure `enableDragAndDrop={true}` prop

### Tests failing?
1. API running? `curl http://localhost:3001/health`
2. Database initialized? `pnpm --filter @castiel/api init-db`
3. Types seeded? `pnpm --filter @castiel/api seed-types`

## Performance Tips

- Drag operations use GPU-accelerated CSS transforms
- Resize uses throttled mouse events
- Grid calculations are optimized
- Batch position updates reduce API calls

## Next Steps

1. ✅ Run quick start script
2. ✅ Verify tests pass
3. ✅ Create a test dashboard
4. ✅ Try drag & drop
5. ✅ Test resize functionality
6. 📝 Customize widget types (optional)
7. 📝 Add custom data sources (optional)

## Documentation

- **Full Implementation Guide:** `DASHBOARD-IMPLEMENTATION-COMPLETE.md`
- **API Reference:** `docs/api/dashboards.md`
- **Architecture:** `docs/ARCHITECTURE.md`

---

**Status:** ✅ All features implemented and tested  
**Version:** 1.0.0  
**Date:** December 9, 2025
