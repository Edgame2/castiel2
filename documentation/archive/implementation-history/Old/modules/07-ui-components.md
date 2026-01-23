# UI Components Module

**Category:** Editor & UI  
**Location:** `src/renderer/components/ui/`  
**Last Updated:** 2025-01-27

---

## Overview

The UI Components Module provides a comprehensive, reusable component library based on Shadcn UI and Radix UI primitives. It implements a design system with consistent styling, accessibility, and theming support.

## Purpose

- Reusable UI component library
- Design system implementation
- Accessibility support (WCAG compliant)
- Theming support
- Consistent styling across application
- Type-safe component APIs

---

## Key Components

### 1. Form Components

#### Button (`button.tsx`)

**Purpose:** Interactive button component

**Variants:**
- `default` - Primary button
- `destructive` - Destructive action button
- `outline` - Outlined button
- `secondary` - Secondary button
- `ghost` - Ghost button (no background)
- `link` - Link-style button

**Sizes:**
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon-only button

**Usage:**
```typescript
<Button variant="default" size="default">
  Click me
</Button>
```

#### Input (`input.tsx`)

**Purpose:** Text input component

**Features:**
- Type-safe props
- Accessibility support
- Theming support
- Validation states

**Usage:**
```typescript
<Input
  type="text"
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

#### Textarea (`textarea.tsx`)

**Purpose:** Multi-line text input

**Features:**
- Auto-resize (optional)
- Character count
- Validation states

#### Form (`form.tsx`)

**Purpose:** Form component with validation

**Features:**
- React Hook Form integration
- Zod validation
- Error handling
- Field management

**Usage:**
```typescript
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### 2. Layout Components

#### Card (`card.tsx`)

**Purpose:** Container component for content

**Sub-components:**
- `CardHeader` - Card header
- `CardTitle` - Card title
- `CardDescription` - Card description
- `CardContent` - Card content
- `CardFooter` - Card footer

**Usage:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
  <CardFooter>
    Footer
  </CardFooter>
</Card>
```

#### Separator (`separator.tsx`)

**Purpose:** Visual separator line

**Orientations:**
- Horizontal (default)
- Vertical

#### Scroll Area (`scroll-area.tsx`)

**Purpose:** Custom scrollable container

**Features:**
- Custom scrollbar styling
- Smooth scrolling
- Scroll position tracking

### 3. Navigation Components

#### Tabs (`tabs.tsx`)

**Purpose:** Tab navigation component

**Sub-components:**
- `TabsList` - Tab container
- `TabsTrigger` - Tab button
- `TabsContent` - Tab content

**Usage:**
```typescript
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

#### Breadcrumb (`breadcrumb.tsx`)

**Purpose:** Breadcrumb navigation

**Features:**
- Hierarchical navigation
- Link support
- Separator customization

#### Navigation Menu (`navigation-menu.tsx`)

**Purpose:** Complex navigation menu

**Features:**
- Dropdown menus
- Mega menus
- Keyboard navigation

### 4. Overlay Components

#### Dialog (`dialog.tsx`)

**Purpose:** Modal dialog component

**Sub-components:**
- `DialogTrigger` - Dialog trigger button
- `DialogContent` - Dialog content
- `DialogHeader` - Dialog header
- `DialogTitle` - Dialog title
- `DialogDescription` - Dialog description
- `DialogFooter` - Dialog footer
- `DialogClose` - Close button

**Usage:**
```typescript
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Content
    <DialogFooter>
      <Button>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Popover (`popover.tsx`)

**Purpose:** Popover component

**Features:**
- Position control
- Trigger customization
- Auto-positioning

#### Tooltip (`tooltip.tsx`)

**Purpose:** Tooltip component

**Features:**
- Hover trigger
- Position control
- Delay configuration

#### Alert (`alert.tsx`)

**Purpose:** Alert/notification component

**Variants:**
- `default`
- `destructive`
- `warning`
- `info`

**Sub-components:**
- `AlertTitle` - Alert title
- `AlertDescription` - Alert description

### 5. Data Display Components

#### Badge (`badge.tsx`)

**Purpose:** Badge/label component

**Variants:**
- `default`
- `secondary`
- `destructive`
- `outline`

**Usage:**
```typescript
<Badge variant="default">New</Badge>
```

#### Avatar (`avatar.tsx`)

**Purpose:** Avatar component

**Features:**
- Image support
- Fallback initials
- Size variants

#### Progress (`progress.tsx`)

**Purpose:** Progress bar component

**Features:**
- Value display
- Indeterminate state
- Custom styling

#### Skeleton (`skeleton.tsx`)

**Purpose:** Loading skeleton component

**Usage:**
```typescript
<Skeleton className="h-4 w-32" />
```

### 6. Selection Components

#### Checkbox (`checkbox.tsx`)

**Purpose:** Checkbox input

**Features:**
- Controlled/uncontrolled
- Indeterminate state
- Accessibility support

#### Radio Group (`radio-group.tsx`)

**Purpose:** Radio button group

**Features:**
- Single selection
- Controlled/uncontrolled
- Keyboard navigation

#### Switch (`switch.tsx`)

**Purpose:** Toggle switch

**Features:**
- On/off states
- Disabled state
- Accessibility support

#### Select (`select.tsx`)

**Purpose:** Dropdown select component

**Features:**
- Single/multiple selection
- Searchable (optional)
- Custom options
- Keyboard navigation

### 7. Command Component (`command.tsx`)

**Purpose:** Command palette component

**Sub-components:**
- `CommandDialog` - Command dialog
- `CommandInput` - Search input
- `CommandList` - Command list
- `CommandEmpty` - Empty state
- `CommandGroup` - Command group
- `CommandItem` - Command item
- `CommandSeparator` - Separator

**Usage:**
```typescript
<CommandDialog>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Item 1</CommandItem>
      <CommandItem>Item 2</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### 8. Utility Components

#### Accordion (`accordion.tsx`)

**Purpose:** Collapsible content sections

**Features:**
- Single/multiple expansion
- Keyboard navigation
- Smooth animations

#### Resizable (`resizable.tsx`)

**Purpose:** Resizable panels

**Features:**
- Drag to resize
- Minimum/maximum sizes
- Persist sizes

#### Dropdown Menu (`dropdown-menu.tsx`)

**Purpose:** Dropdown menu component

**Features:**
- Context menus
- Sub-menus
- Keyboard navigation
- Separators

#### Menubar (`menubar.tsx`)

**Purpose:** Menu bar component

**Features:**
- Nested menus
- Keyboard shortcuts
- Menu items

#### Sonner (`sonner.tsx`)

**Purpose:** Toast notification component

**Features:**
- Multiple toast positions
- Auto-dismiss
- Action buttons
- Rich content

---

## Design System

### Theming

Components support theming via CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}
```

### Color System

- **Primary** - Primary actions
- **Secondary** - Secondary actions
- **Destructive** - Destructive actions
- **Muted** - Muted content
- **Accent** - Accent colors
- **Background** - Background colors
- **Foreground** - Text colors

### Typography

- Consistent font families
- Font size scale
- Line height scale
- Font weight scale

### Spacing

- Consistent spacing scale
- Padding/margin utilities
- Gap utilities

---

## Accessibility

### ARIA Support

All components include:
- ARIA labels
- ARIA descriptions
- ARIA states
- Keyboard navigation

### Keyboard Navigation

- Tab navigation
- Arrow key navigation
- Enter/Space activation
- Escape to close

### Screen Reader Support

- Semantic HTML
- ARIA attributes
- Focus management
- Live regions

---

## Type Safety

### TypeScript

All components are fully typed:
- Props interfaces
- Variant types
- Event handlers
- Ref types

### Variant Props

Components use `class-variance-authority` for type-safe variants:

```typescript
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
      },
      size: {
        default: "...",
        sm: "...",
      },
    },
  }
);
```

---

## Styling

### Tailwind CSS

Components use Tailwind CSS for styling:
- Utility classes
- Responsive design
- Dark mode support
- Custom utilities

### Class Utilities

`cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/utils';

<div className={cn("base-classes", className, condition && "conditional-class")} />
```

---

## Component Patterns

### Forward Refs

All components forward refs:

```typescript
const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, ...props }, ref) => (
    <element ref={ref} className={cn("...", className)} {...props} />
  )
);
```

### Display Names

All components have display names:

```typescript
Component.displayName = "Component";
```

### Compound Components

Some components use compound component pattern:

```typescript
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

---

## Usage Examples

### Form with Validation

```typescript
const form = useForm({
  resolver: zodResolver(schema),
});

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} type="email" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <Button type="submit">Submit</Button>
</Form>
```

### Dialog with Actions

```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Related Modules

- **Activity Bar & Views Module** - Uses UI components
- **Command & Palette Module** - Uses Command component
- **Monaco Editor Module** - Uses UI components for overlays

---

## Summary

The UI Components Module provides a comprehensive, accessible, and type-safe component library for the Coder IDE. Based on Shadcn UI and Radix UI primitives, it ensures consistent design, accessibility, and theming throughout the application.
