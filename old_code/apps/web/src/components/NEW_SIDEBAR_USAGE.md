# New Sidebar Component Usage

The new sidebar component (`app-sidebar.tsx`) has been created based on shadcn's sidebar-07 design.

## Features

- ✅ **Collapsible sidebar** - Can collapse to icon-only view
- ✅ **Tenant switcher** - Shows all user's tenants with role indicators
- ✅ **Grouped navigation** - Organized into logical sections:
  - Main (Dashboard, AI Chat, Shards)
  - Content Management (Shard Types, Dashboards, Search)
  - Administration (Users, Integrations, Audit Logs, etc.)
  - Account (Sessions, Profile, Settings)
  - Super Admin (Tenants, System Admin)
- ✅ **Permission-based** - Automatically hides/shows items based on user roles
- ✅ **User menu** - Profile, Sessions, Settings, and Logout
- ✅ **Active state** - Highlights current page

## How to Use

### 1. Wrap your layout with SidebarProvider

```tsx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.Node }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SidebarTrigger /> {/* Optional: button to toggle sidebar */}
        {children}
      </main>
    </SidebarProvider>
  )
}
```

### 2. Update your protected layout

Replace the old sidebar in `apps/web/src/app/(protected)/layout.tsx`:

```tsx
"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

## Components Created

### 1. `app-sidebar.tsx`
Main sidebar component that:
- Fetches user data from auth context
- Builds navigation based on user roles
- Integrates tenant switcher and user menu

### 2. `tenant-switcher.tsx`
Dropdown to switch between tenants:
- Shows tenant name and user's role
- Fetches tenants from API
- Handles tenant switching
- Shows loading and empty states

### 3. `nav-main.tsx`
Navigation menu with grouped items:
- Organized by sections
- Shows icons
- Highlights active page

### 4. `nav-user.tsx`
User menu dropdown:
- Shows user avatar (with initials fallback)
- Links to Profile, Sessions, Settings
- Logout functionality

## Customization

### Adding New Navigation Items

Edit `app-sidebar.tsx` and add to the appropriate section:

```tsx
{
  title: "My New Section",
  items: [
    {
      title: "New Page",
      url: "/new-page",
      icon: YourIcon,
    },
  ],
}
```

### Changing Tenant Display

Edit `tenant-switcher.tsx` to customize how tenants are displayed.

### Styling

The sidebar uses CSS variables defined in your theme. You can customize:
- `--sidebar-background`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-primary-foreground`
- `--sidebar-accent`
- `--sidebar-accent-foreground`

## Migration from Old Sidebar

The old sidebar (`components/layout/sidebar.tsx`) is still available. To migrate:

1. Update your layout to use `SidebarProvider` and `AppSidebar`
2. Remove references to the old `Sidebar` component
3. Test all navigation flows
4. Once confirmed working, optionally remove old sidebar

## Notes

- The sidebar automatically collapses to icons on smaller screens
- Permission checks happen in real-time based on auth context
- Tenant switching triggers a re-render of the entire app
- User avatar uses initials as fallback (placeholder)
