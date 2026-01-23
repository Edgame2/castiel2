# UI Update Status - AI Two-Part Architecture

## Current Status: ⚠️ **PARTIAL UPDATE**

### ✅ What Was Updated

#### 1. API Client (`/apps/web/src/lib/api/ai-settings.ts`)

**Added new types:**
- `AIModelCatalog` - Catalog entry (replaces old AIModel for new system)
- `AIConnection` - Connection instance
- `AIConnectionWithCredentials` - With API key from Key Vault
- Kept legacy `AIModel` type for backward compatibility

**Added new API methods:**
```typescript
// AI Models Catalog (Super Admin)
- listModelsCatalog()
- getModelCatalog()
- createModelCatalog()
- updateModelCatalog()
- deleteModelCatalog()
- getModelsForTenants()

// AI Connections - System (Super Admin)
- listSystemConnections()
- createSystemConnection()
- updateSystemConnection()
- deleteSystemConnection()

// AI Connections - Tenant (Tenant Admin)
- listTenantConnections()
- createTenantConnection()
- updateTenantConnection()
- deleteTenantConnection()
- getDefaultConnection()
```

### ⏳ What Still Needs to Be Done

#### 1. **React Hooks** (`/apps/web/src/hooks/use-ai-settings.ts`)

Need to create hooks for the new API methods:

```typescript
// Models Catalog Hooks
export function useAIModelsCatalog(filters?)
export function useCreateModelCatalog()
export function useUpdateModelCatalog()
export function useDeleteModelCatalog()

// Connections Hooks
export function useSystemConnections(filters?)
export function useCreateSystemConnection()
export function useUpdateSystemConnection()
export function useDeleteSystemConnection()

export function useTenantConnections()
export function useCreateTenantConnection()
export function useUpdateTenantConnection()
export function useDeleteTenantConnection()
export function useDefaultConnection(type)
```

#### 2. **Super Admin UI Pages**

Need to update `/apps/web/src/app/(protected)/admin/ai-settings/page.tsx`:

**Current structure:**
- Models tab (combined)
- Configuration tab
- Usage tab

**New structure needed:**
```tsx
<Tabs>
  <TabsTrigger value="catalog">
    📚 Models Catalog
  </TabsTrigger>
  <TabsTrigger value="connections">
    🔌 System Connections
  </TabsTrigger>
  <TabsTrigger value="config">
    ⚙️ Configuration
  </TabsTrigger>
  <TabsTrigger value="usage">
    📊 Usage
  </TabsTrigger>
</Tabs>

// Catalog Tab - List of available models (capabilities)
<TabsContent value="catalog">
  - Table of AI models in catalog
  - Add/Edit/Delete models
  - Fields: name, provider, type, hoster, capabilities
  - No API keys here
</TabsContent>

// Connections Tab - System connections with credentials
<TabsContent value="connections">
  - Table of system connections
  - Create connection (select model, enter API key)
  - API key stored in Key Vault
  - Set as default
  - Edit endpoint/deployment
</TabsContent>
```

#### 3. **Tenant Admin UI Page**

Create new page: `/apps/web/src/app/(protected)/settings/ai/page.tsx`

```tsx
export default function TenantAISettingsPage() {
  // Show available models (where allowTenantConnections = true)
  // Show existing tenant connections
  // Allow creating new connection (BYOK)
  // Allow setting default connection
  // Show which connections are being used
}
```

#### 4. **Forms/Dialogs**

Need to create/update:

**Create Model Dialog (Super Admin):**
- `/apps/web/src/components/ai/create-model-dialog.tsx`
- Form with all AIModelCatalog fields
- No API key field (that's in connections)

**Create Connection Dialog (Super Admin & Tenant):**
- `/apps/web/src/components/ai/create-connection-dialog.tsx`
- Select model from catalog
- Enter name, endpoint, version, deployment name
- **Enter API key** (will be stored in Key Vault)
- Set as default checkbox

**Edit Connection Dialog:**
- Update endpoint, version, deployment
- Option to update API key (re-stores in Key Vault)

## Migration Strategy

### Option 1: Dual Support (Recommended)

Keep both old and new systems working:
- Old routes still work with legacy `AIModel` type
- New routes use `AIModelCatalog` + `AIConnection`
- UI shows new two-part interface
- Gradually migrate users

### Option 2: Big Bang

Replace everything at once:
- Remove old hooks
- Update all UI components
- Migrate existing data
- Breaking change

## UI Component Structure

```
/apps/web/src/
├── app/
│   └── (protected)/
│       ├── admin/
│       │   └── ai-settings/
│       │       ├── page.tsx                    ← Update: New tabs
│       │       ├── catalog/
│       │       │   ├── new/page.tsx            ← Create model
│       │       │   └── [id]/edit/page.tsx      ← Edit model
│       │       └── connections/
│       │           ├── new/page.tsx            ← Create connection
│       │           └── [id]/edit/page.tsx      ← Edit connection
│       └── settings/
│           └── ai/
│               ├── page.tsx                    ← NEW: Tenant BYOK
│               └── connections/
│                   ├── new/page.tsx            ← Tenant create connection
│                   └── [id]/edit/page.tsx      ← Tenant edit connection
├── components/
│   └── ai/
│       ├── models-catalog-table.tsx            ← NEW: Catalog display
│       ├── connections-table.tsx               ← NEW: Connections display
│       ├── create-model-dialog.tsx             ← NEW: Model form
│       ├── edit-model-dialog.tsx               ← NEW: Edit model
│       ├── create-connection-dialog.tsx        ← NEW: Connection form
│       ├── edit-connection-dialog.tsx          ← NEW: Edit connection
│       └── connection-status-badge.tsx         ← NEW: Status indicator
├── hooks/
│   └── use-ai-settings.ts                      ← Update: Add new hooks
└── lib/
    └── api/
        └── ai-settings.ts                       ← ✅ Already updated
```

## Example UI Flows

### Super Admin: Add GPT-4 with System Key

1. **Create Model in Catalog**
   - Navigate to "Models Catalog" tab
   - Click "Add Model"
   - Fill form:
     - Name: "GPT-4 Turbo"
     - Provider: OpenAI
     - Type: LLM
     - Hoster: OpenAI
     - Allow Tenant Connections: ✓
     - Context Window: 128000
     - Capabilities: streaming, functions, JSON
   - Save (no API key yet)

2. **Create System Connection**
   - Navigate to "System Connections" tab
   - Click "Add Connection"
   - Select Model: "GPT-4 Turbo"
   - Name: "System OpenAI GPT-4"
   - Endpoint: `https://api.openai.com/v1`
   - **API Key: sk-system-key** ← Stored in Key Vault
   - Set as Default: ✓
   - Save

### Tenant Admin: BYOK for GPT-4

1. **View Available Models**
   - Navigate to Settings → AI
   - See list of models where `allowTenantConnections = true`
   - See "GPT-4 Turbo" (from catalog)

2. **Create Tenant Connection**
   - Click "Add Your Own Key"
   - Select Model: "GPT-4 Turbo"
   - Name: "Our GPT-4 Connection"
   - Endpoint: `https://api.openai.com/v1`
   - **API Key: sk-tenant-key** ← Stored in Key Vault
   - Set as Default: ✓
   - Save

3. **Use Connection**
   - AI requests automatically use tenant connection
   - Fallback to system connection if tenant has none

## Key Vault Security Display

In the UI, **never show the API key** after it's saved:

```tsx
// Connection display
<div>
  <Label>API Key</Label>
  <div className="flex items-center gap-2">
    <Input 
      value="••••••••••••••••" 
      disabled 
      type="password"
    />
    <Badge variant="outline" className="text-green-600">
      <Lock className="h-3 w-3 mr-1" />
      Stored in Key Vault
    </Badge>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleUpdateKey}
    >
      Update Key
    </Button>
  </div>
  <p className="text-xs text-muted-foreground mt-1">
    Secret ID: {connection.secretId}
  </p>
</div>
```

## Priority Order for Implementation

1. **High Priority:**
   - [ ] Create React hooks for new API endpoints
   - [ ] Update super admin page with two tabs (Catalog + Connections)
   - [ ] Create connection form with API key input

2. **Medium Priority:**
   - [ ] Create tenant AI settings page
   - [ ] Add BYOK flow for tenants
   - [ ] Update existing AI request handlers to use connections

3. **Low Priority:**
   - [ ] Migration script for existing data
   - [ ] Deprecate old endpoints
   - [ ] Remove legacy code

## Testing Checklist

- [ ] Super admin can create models in catalog
- [ ] Super admin can create system connections
- [ ] API keys stored in Key Vault (not in database)
- [ ] Tenant can see available models
- [ ] Tenant can create BYOK connections
- [ ] Tenant connections override system connections
- [ ] Default connections work correctly
- [ ] AI requests use correct connection
- [ ] Key Vault retrieval works at runtime
- [ ] Connection status indicators accurate

## Next Steps

**Immediate:**
1. Create React hooks in `use-ai-settings.ts`
2. Update super admin page to show catalog + connections tabs
3. Create connection form component

**After that:**
4. Create tenant AI settings page
5. Test complete flow from UI → Key Vault → AI request
6. Update documentation

---

## Summary

✅ **Backend: Complete** - Services, routes, Key Vault integration  
⚠️ **Frontend API Client: Updated** - New methods added  
❌ **Frontend UI: Not Updated** - Still shows old system  
❌ **React Hooks: Not Updated** - Need new hooks  

**Estimate:** 4-6 hours to fully update the UI to use the new two-part architecture.

Would you like me to proceed with updating the React hooks and UI components?
