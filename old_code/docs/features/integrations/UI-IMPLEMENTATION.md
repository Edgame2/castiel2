# Integration UI Implementation

## Overview

This document describes all UI pages and components required for the integration system, including dashboard widgets that must be usable as dashboard widgets.

---

## Table of Contents

1. [Pages](#pages)
2. [Components](#components)
3. [Component Patterns](#component-patterns)
4. [Routing Structure](#routing-structure)
5. [Dashboard Widgets](#dashboard-widgets)

---

## Pages

### Super Admin Pages

#### `/admin/integrations`

**Purpose**: List all integration providers (system-level)

**Features**:
- List all providers with filters (category, status, audience)
- Search providers by name
- View provider details
- Quick actions: Edit, Delete, Change Status, Change Audience

**Components Used**:
- `IntegrationProviderList`
- `IntegrationProviderCard`
- `IntegrationProviderFilters`

#### `/admin/integrations/new`

**Purpose**: Create new integration provider

**Features**:
- Form to create new provider
- Configure capabilities, authentication, entities
- Set initial status and audience

**Components Used**:
- `IntegrationProviderForm`

#### `/admin/integrations/[category]/[id]`

**Purpose**: View/edit integration provider

**Features**:
- View provider details
- Edit provider configuration
- View provider usage (which tenants use it)
- Change status and audience

**Components Used**:
- `IntegrationProviderForm`
- `IntegrationProviderDetails`
- `IntegrationProviderUsage`

#### `/admin/integrations/[category]/[id]/status`

**Purpose**: Manage provider status (active/beta/deprecated/disabled)

**Features**:
- Toggle provider status
- View status history
- See affected tenants

**Components Used**:
- `IntegrationProviderStatusToggle`
- `IntegrationProviderStatusHistory`

#### `/admin/integrations/[category]/[id]/audience`

**Purpose**: Manage audience (system/tenant)

**Features**:
- Change provider audience
- View impact of audience change
- See affected tenants

**Components Used**:
- `IntegrationProviderAudienceSelector`
- `IntegrationProviderAudienceImpact`

---

### Tenant Admin Pages

#### `/integrations`

**Purpose**: List available integrations (catalog) and enabled integrations

**Features**:
- Browse integration catalog (filtered by `audience: 'tenant'`)
- View enabled integration instances
- Search and filter integrations
- Enable new integration instance

**Components Used**:
- `IntegrationCatalog`
- `IntegrationInstanceList`
- `IntegrationInstanceCard`

#### `/integrations/[id]`

**Purpose**: View integration details

**Features**:
- View integration instance details
- Connection status
- Recent sync activity
- Quick actions: Configure, Connect, Test, Disable

**Components Used**:
- `IntegrationInstanceDetails`
- `IntegrationConnectionStatus`
- `IntegrationActivityTimeline`

#### `/integrations/[id]/configure`

**Purpose**: Configure integration instance (name, icon, data access, search settings)

**Features**:
- Edit integration name and description
- Configure data access (allowedShardTypes)
- Configure search settings (enable/disable, entities, filters)
- Configure user-level scoping

**Components Used**:
- `IntegrationInstanceForm`
- `IntegrationDataAccessConfig`
- `IntegrationSearchConfig`
- `IntegrationUserScopingConfig`

#### `/integrations/[id]/connect`

**Purpose**: Connect integration (OAuth/API key/Basic/Custom)

**Features**:
- OAuth flow initiation
- API key entry form
- Basic auth form
- Custom credentials form

**Components Used**:
- `IntegrationConnectionForm`
- `OAuthConnectButton`
- `ApiKeyForm`
- `BasicAuthForm`
- `CustomCredentialsForm`

#### `/integrations/[id]/credentials`

**Purpose**: Update credentials

**Features**:
- View current credential status
- Update OAuth tokens
- Update API keys
- Update basic auth credentials

**Components Used**:
- `IntegrationCredentialsForm`
- `CredentialStatusDisplay`

#### `/integrations/[id]/test`

**Purpose**: Test connection

**Features**:
- Test connection button
- View test results
- View connection status
- Troubleshooting information

**Components Used**:
- `IntegrationConnectionTest`
- `ConnectionTestResults`

#### `/integrations/new`

**Purpose**: Enable new integration instance

**Features**:
- Browse available providers
- Select provider
- Configure initial settings
- Connect integration

**Components Used**:
- `IntegrationCatalog`
- `IntegrationInstanceForm`
- `IntegrationConnectionForm`

---

### User Pages

#### `/integrations/[id]/connect/user`

**Purpose**: Connect user-scoped integration (OAuth flow)

**Features**:
- OAuth flow for user-scoped integrations
- List user's connected integrations
- Disconnect user integration

**Components Used**:
- `UserIntegrationConnect`
- `UserIntegrationList`

#### `/integrations/search`

**Purpose**: Global search across integrations

**Features**:
- Search input
- Filter by integration, entity type
- View search results grouped by integration/entity
- User-scoped results (if applicable)

**Components Used**:
- `IntegrationSearchBar`
- `IntegrationSearchResults`
- `IntegrationSearchFilters`

---

## Components

### Provider Management Components

#### `IntegrationProviderList`

**Purpose**: List providers with filters (category, status, audience)

**Props**:
```typescript
interface IntegrationProviderListProps {
  filters?: {
    category?: IntegrationCategory;
    status?: IntegrationStatus;
    audience?: 'system' | 'tenant';
    search?: string;
  };
  onProviderSelect?: (provider: IntegrationProvider) => void;
}
```

**Features**:
- Filter by category, status, audience
- Search providers
- Pagination
- Sort by name, status, updated date

#### `IntegrationProviderCard`

**Purpose**: Provider card with status, audience, capabilities

**Props**:
```typescript
interface IntegrationProviderCardProps {
  provider: IntegrationProviderDocument;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: IntegrationStatus) => void;
  onAudienceChange?: (audience: 'system' | 'tenant') => void;
}
```

**Features**:
- Display provider name, icon, description
- Show status badge (active/beta/deprecated/disabled)
- Show audience badge (system/tenant)
- Show capabilities
- Quick actions menu

#### `IntegrationProviderForm`

**Purpose**: Create/edit provider form

**Props**:
```typescript
interface IntegrationProviderFormProps {
  provider?: IntegrationProviderDocument; // If editing
  onSubmit: (provider: CreateProviderInput) => Promise<void>;
  onCancel?: () => void;
}
```

**Features**:
- Form fields for all provider properties
- Validation
- Entity configuration
- Authentication configuration
- Capabilities selection

#### `IntegrationProviderStatusToggle`

**Purpose**: Toggle provider status (super admin)

**Props**:
```typescript
interface IntegrationProviderStatusToggleProps {
  provider: IntegrationProviderDocument;
  onStatusChange: (status: IntegrationStatus) => Promise<void>;
}
```

**Features**:
- Dropdown to select status (active/beta/deprecated/disabled)
- Confirmation dialog for status changes
- Show affected tenants

#### `IntegrationProviderAudienceSelector`

**Purpose**: Select audience (system/tenant)

**Props**:
```typescript
interface IntegrationProviderAudienceSelectorProps {
  provider: IntegrationProviderDocument;
  onAudienceChange: (audience: 'system' | 'tenant') => Promise<void>;
}
```

**Features**:
- Radio buttons or dropdown for audience selection
- Show impact of audience change
- Confirmation dialog

---

### Tenant Integration Components

#### `IntegrationCatalog`

**Purpose**: Browse available integrations

**Props**:
```typescript
interface IntegrationCatalogProps {
  onIntegrationSelect?: (provider: IntegrationProviderDocument) => void;
  filters?: {
    category?: IntegrationCategory;
    search?: string;
  };
}
```

**Features**:
- Display available providers (filtered by `audience: 'tenant'` and `status: 'active'`)
- Category filters
- Search
- Provider cards with "Enable" button

#### `IntegrationInstanceList`

**Purpose**: List enabled integration instances per tenant

**Props**:
```typescript
interface IntegrationInstanceListProps {
  filters?: {
    status?: TenantIntegrationStatus;
    providerName?: string;
    search?: string;
  };
  onInstanceSelect?: (instance: IntegrationDocument) => void;
}
```

**Features**:
- List all tenant's integration instances
- Filter by status, provider, search
- Show connection status
- Quick actions

#### `IntegrationInstanceCard`

**Purpose**: Instance card with status, connection info

**Props**:
```typescript
interface IntegrationInstanceCardProps {
  instance: IntegrationDocument;
  onConfigure?: () => void;
  onConnect?: () => void;
  onTest?: () => void;
  onDisable?: () => void;
}
```

**Features**:
- Display instance name, icon, provider
- Show connection status badge
- Show last sync time
- Quick actions menu

#### `IntegrationInstanceForm`

**Purpose**: Configure instance (name, icon, data access, search)

**Props**:
```typescript
interface IntegrationInstanceFormProps {
  instance: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onSubmit: (config: UpdateIntegrationInput) => Promise<void>;
  onCancel?: () => void;
}
```

**Features**:
- Edit instance name and description
- Configure data access (allowedShardTypes)
- Configure search settings
- Configure user scoping

#### `IntegrationConnectionForm`

**Purpose**: Connect integration (OAuth/API key/Basic/Custom)

**Props**:
```typescript
interface IntegrationConnectionFormProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onConnect: (connectionData: ConnectionData) => Promise<void>;
  onCancel?: () => void;
}
```

**Features**:
- Detect auth type from provider
- Show appropriate form (OAuth/API key/Basic/Custom)
- OAuth flow initiation
- Credential input forms

#### `IntegrationCredentialsForm`

**Purpose**: Update credentials

**Props**:
```typescript
interface IntegrationCredentialsFormProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onUpdate: (credentials: CredentialUpdate) => Promise<void>;
}
```

**Features**:
- Show current credential status
- Update OAuth tokens (re-authorize)
- Update API keys
- Update basic auth
- Test credentials after update

#### `IntegrationConnectionTest`

**Purpose**: Test connection button/component

**Props**:
```typescript
interface IntegrationConnectionTestProps {
  integration: IntegrationDocument;
  onTest: () => Promise<ConnectionTestResult>;
}
```

**Features**:
- Test button
- Loading state during test
- Display test results
- Show error messages
- Retry button

#### `IntegrationStatusToggle`

**Purpose**: Activate/disable integration

**Props**:
```typescript
interface IntegrationStatusToggleProps {
  integration: IntegrationDocument;
  onStatusChange: (status: 'connected' | 'disabled') => Promise<void>;
}
```

**Features**:
- Toggle switch or button
- Confirmation dialog
- Show impact of disabling

#### `IntegrationDataAccessConfig`

**Purpose**: Configure allowedShardTypes

**Props**:
```typescript
interface IntegrationDataAccessConfigProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  availableShardTypes: ShardType[];
  onUpdate: (allowedShardTypes: string[]) => Promise<void>;
}
```

**Features**:
- Multi-select for shard types
- Show which shard types are supported by provider
- Select/deselect all
- Preview of affected data

#### `IntegrationSearchConfig`

**Purpose**: Configure search settings (enable/disable, entities, filters)

**Props**:
```typescript
interface IntegrationSearchConfigProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onUpdate: (config: SearchConfig) => Promise<void>;
}
```

**Features**:
- Toggle search enabled/disabled
- Select searchable entities (subset of provider's entities)
- Configure search filters (date range, entity types, custom filters)
- Preview search configuration

#### `IntegrationUserScopingConfig`

**Purpose**: Configure user-level scoping

**Props**:
```typescript
interface IntegrationUserScopingConfigProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onUpdate: (config: UserScopingConfig) => Promise<void>;
}
```

**Features**:
- Toggle user scoping enabled/disabled
- Configure sync user scoping
- Show provider's requiresUserScoping setting
- Explain user scoping behavior

---

### User Integration Components

#### `UserIntegrationConnect`

**Purpose**: Connect user-scoped integration

**Props**:
```typescript
interface UserIntegrationConnectProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onConnect: () => Promise<void>;
}
```

**Features**:
- OAuth flow initiation for user
- Show connection status
- Disconnect button

#### `UserIntegrationList`

**Purpose**: List user's connected integrations

**Props**:
```typescript
interface UserIntegrationListProps {
  userId: string;
  onDisconnect?: (integrationId: string) => Promise<void>;
}
```

**Features**:
- List user's connected integrations
- Show connection status
- Disconnect button

---

### Search Components

#### `IntegrationSearchBar`

**Purpose**: Global search input

**Props**:
```typescript
interface IntegrationSearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => Promise<void>;
  placeholder?: string;
}
```

**Features**:
- Search input with autocomplete
- Filter dropdowns
- Search button
- Clear button

#### `IntegrationSearchResults`

**Purpose**: Display search results grouped by integration/entity

**Props**:
```typescript
interface IntegrationSearchResultsProps {
  results: IntegrationSearchResult[];
  onResultClick?: (result: SearchResultItem) => void;
}
```

**Features**:
- Group results by integration
- Group results by entity type
- Show relevance scores
- Highlight matching text
- Pagination

#### `IntegrationSearchFilters`

**Purpose**: Filter search results

**Props**:
```typescript
interface IntegrationSearchFiltersProps {
  integrations: IntegrationDocument[];
  onFilterChange: (filters: SearchFilters) => void;
}
```

**Features**:
- Filter by integration
- Filter by entity type
- Date range filter
- Custom filters

---

## Dashboard Widgets

All widget components must be usable as dashboard widgets. They must extend the `BaseWidget` interface and support widget configuration.

### Widget Interface

```typescript
interface BaseWidget {
  id: string;
  type: WidgetType;
  name: string;
  description?: string;
  icon?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  dataSource: WidgetDataSource;
  refreshInterval: number; // seconds
  permissions: WidgetPermissions;
  config: WidgetConfig;
}
```

### Integration Widget Components

#### `IntegrationStatusWidget`

**Purpose**: Show integration status (connected/pending/error/disabled)

**Widget Type**: `INTEGRATION_STATUS`

**Props**:
```typescript
interface IntegrationStatusWidgetProps {
  widget: Widget;
  integrationIds?: string[]; // If not provided, show all integrations
  onRefresh?: () => void;
}
```

**Features**:
- Display integration status cards
- Color-coded status (green=connected, yellow=pending, red=error, gray=disabled)
- Click to view integration details
- Auto-refresh based on widget refresh interval
- Configurable: which integrations to show

**Widget Configuration**:
```typescript
{
  integrationIds: string[]; // Optional: filter specific integrations
  showCount: boolean; // Show count of each status
  compactView: boolean; // Compact card view
}
```

#### `IntegrationActivityWidget`

**Purpose**: Show recent integration activity/syncs

**Widget Type**: `INTEGRATION_ACTIVITY`

**Props**:
```typescript
interface IntegrationActivityWidgetProps {
  widget: Widget;
  integrationId?: string; // If not provided, show all integrations
  onRefresh?: () => void;
}
```

**Features**:
- Timeline of recent sync activities
- Show sync status (success/failed)
- Show sync statistics (records processed)
- Click to view sync details
- Auto-refresh

**Widget Configuration**:
```typescript
{
  integrationId?: string; // Optional: filter specific integration
  timeRange: '1h' | '24h' | '7d' | '30d';
  maxItems: number; // Max items to display
}
```

#### `IntegrationSearchWidget`

**Purpose**: Quick search widget for dashboard

**Widget Type**: `INTEGRATION_SEARCH`

**Props**:
```typescript
interface IntegrationSearchWidgetProps {
  widget: Widget;
  onSearch?: (query: string) => void;
}
```

**Features**:
- Search input
- Quick search results
- Link to full search page
- Recent searches

**Widget Configuration**:
```typescript
{
  defaultIntegrations?: string[]; // Default integrations to search
  maxResults: number; // Max results to show in widget
}
```

#### `IntegrationDataWidget`

**Purpose**: Display integration data (configurable per integration)

**Widget Type**: `INTEGRATION_DATA`

**Props**:
```typescript
interface IntegrationDataWidgetProps {
  widget: Widget;
  integrationId: string;
  entity?: string; // Entity to display (e.g., "Account", "Contact")
  onRefresh?: () => void;
}
```

**Features**:
- Display data from integration
- Configurable entity type
- Configurable display format (table, list, chart)
- Auto-refresh
- User-scoped data (if integration is user-scoped)

**Widget Configuration**:
```typescript
{
  integrationId: string; // Required
  entity: string; // Entity to display
  displayFormat: 'table' | 'list' | 'chart';
  fields: string[]; // Fields to display
  filters?: Record<string, any>; // Filters to apply
  limit: number; // Max items to display
}
```

### Widget Requirements

All widget components must:

1. **Extend BaseWidget interface**: Implement required widget properties
2. **Support widget configuration**: Accept `config` prop and use it
3. **Be draggable/resizable**: Work with dashboard grid system
4. **Support real-time updates**: Auto-refresh based on `refreshInterval`
5. **Handle loading/error states**: Show loading spinner and error messages
6. **Support i18n**: Use `useTranslation` hook for all text
7. **Respect permissions**: Check user permissions before displaying data

### Widget Implementation Example

```typescript
'use client';

import { useWidgetData, useRefreshWidgetData } from '@/hooks/use-dashboards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { Widget } from '@/types/dashboard';

interface IntegrationStatusWidgetProps {
  widget: Widget;
}

export function IntegrationStatusWidget({ widget }: IntegrationStatusWidgetProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useWidgetData(widget.id);
  const refresh = useRefreshWidgetData(widget.id);
  
  const integrationIds = widget.config.integrationIds;
  
  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }
  
  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-500">{t('errors.widgetLoadFailed')}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.integrations.map(integration => (
            <div key={integration.id} className="flex items-center justify-between">
              <span>{integration.name}</span>
              <Badge variant={getStatusVariant(integration.status)}>
                {integration.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Component Patterns

### Use Existing UI Component Library

All components should use the existing UI component library:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// ... etc
```

### Follow Existing Widget Patterns

For dashboard widgets, follow existing widget patterns:

```typescript
// See apps/web/src/components/dashboards/widgets/* for examples
import { RecentShardsWidget } from '@/components/dashboards/widgets/recent-shards-widget';
import { MyTasksWidget } from '@/components/dashboards/widgets/my-tasks-widget';
```

### Use Existing Hooks

Use existing hooks for data fetching:

```typescript
import { useIntegrations } from '@/hooks/use-integrations';
import { useTenantIntegrations } from '@/hooks/use-integrations';
import { useDashboards } from '@/hooks/use-dashboards';
```

### Error Handling and Loading States

All components must handle loading and error states:

```typescript
const { data, isLoading, error } = useIntegrations();

if (isLoading) {
  return <Skeleton />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

return <ComponentContent data={data} />;
```

### i18n Support

All components must support internationalization:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('integrations');

return <h1>{t('integrations.title')}</h1>;
```

---

## Routing Structure

### Protected Routes

All integration routes require authentication:

```typescript
// apps/web/src/app/(protected)/integrations/page.tsx
// apps/web/src/app/(protected)/admin/integrations/page.tsx
```

### Role-Based Access

Routes are protected by role:

- **Super Admin**: `/admin/integrations/*`
- **Tenant Admin**: `/integrations/*`
- **User**: `/integrations/[id]/connect/user`, `/integrations/search`

### Dynamic Routes

Integration instances use dynamic routes:

- `/integrations/[id]` - Integration instance ID
- `/admin/integrations/[category]/[id]` - Provider category and ID

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [API Implementation](./API-IMPLEMENTATION.md) - API endpoints
- [Dashboard Widgets](../dashboard/widgets.md) - Widget system documentation

---

**Last Updated**: January 2025  
**Version**: 1.0.0







