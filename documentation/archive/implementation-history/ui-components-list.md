# UI Components Module
## Shadcn/Radix UI Component Library

---

## OVERVIEW

**Location:** `src/renderer/components/ui/`  
**Purpose:** Comprehensive, reusable UI component library based on Shadcn UI and Radix UI primitives  
**Base:** Shadcn UI + Radix UI + Tailwind CSS

---

## COMPONENT CATEGORIES

### 1. FORM COMPONENTS (10 components)

#### Button
**File:** `button.tsx`

**Variants:**
- `default` - Primary button
- `destructive` - Destructive action (red)
- `outline` - Outlined button
- `secondary` - Secondary button
- `ghost` - Ghost button (transparent)
- `link` - Link-style button

**Sizes:**
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon-only button

**Usage:**
```typescript
<Button variant="default" size="lg">Click Me</Button>
```

---

#### Input
**File:** `input.tsx`

**Features:**
- Text input
- Type support (text, email, password, number, etc.)
- Placeholder support
- Disabled state
- Error state
- Full accessibility

**Usage:**
```typescript
<Input 
  type="email" 
  placeholder="Enter email"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

---

#### Textarea
**File:** `textarea.tsx`

**Features:**
- Multi-line text input
- Auto-resize (optional)
- Character count
- Rows configuration
- Validation states

**Usage:**
```typescript
<Textarea 
  placeholder="Enter description"
  rows={4}
/>
```

---

#### Checkbox
**File:** `checkbox.tsx`

**Features:**
- Controlled/uncontrolled
- Indeterminate state
- Disabled state
- Custom styling
- Accessibility support

**Usage:**
```typescript
<Checkbox 
  checked={checked}
  onCheckedChange={setChecked}
/>
```

---

#### Radio Group
**File:** `radio-group.tsx`

**Features:**
- Single selection from group
- Controlled/uncontrolled
- Keyboard navigation
- Custom styling

**Usage:**
```typescript
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="option1" />
  <RadioGroupItem value="option2" />
</RadioGroup>
```

---

#### Switch
**File:** `switch.tsx`

**Features:**
- Toggle switch
- On/off states
- Disabled state
- Accessibility support

**Usage:**
```typescript
<Switch 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

---

#### Select
**File:** `select.tsx`

**Features:**
- Dropdown selection
- Single/multiple selection
- Searchable (optional)
- Custom options
- Keyboard navigation
- Grouping support

**Usage:**
```typescript
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

#### Label
**File:** `label.tsx`

**Features:**
- Form label
- Association with form controls
- Accessibility support

**Usage:**
```typescript
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

---

#### Form
**File:** `form.tsx`

**Features:**
- React Hook Form integration
- Zod validation support
- Error handling
- Field management
- Submit handling

**Sub-components:**
- `Form` - Form wrapper
- `FormField` - Form field wrapper
- `FormItem` - Form item container
- `FormLabel` - Form label
- `FormControl` - Form control wrapper
- `FormDescription` - Field description
- `FormMessage` - Error message

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
          <Input {...field} type="email" />
        </FormControl>
        <FormDescription>Your email address</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

#### Slider
**File:** `slider.tsx`

**Features:**
- Range slider
- Single/multiple values
- Min/max/step
- Accessibility support

**Usage:**
```typescript
<Slider 
  value={[value]}
  onValueChange={([v]) => setValue(v)}
  min={0}
  max={100}
  step={1}
/>
```

---

### 2. LAYOUT COMPONENTS (5 components)

#### Card
**File:** `card.tsx`

**Sub-components:**
- `Card` - Container
- `CardHeader` - Header section
- `CardTitle` - Title
- `CardDescription` - Description
- `CardContent` - Main content
- `CardFooter` - Footer section

**Usage:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

#### Separator
**File:** `separator.tsx`

**Features:**
- Horizontal/vertical separator
- Custom styling
- Spacing control

**Usage:**
```typescript
<Separator orientation="horizontal" />
<Separator orientation="vertical" className="h-20" />
```

---

#### Scroll Area
**File:** `scroll-area.tsx`

**Features:**
- Custom scrollbars
- Smooth scrolling
- Scroll position tracking
- Cross-browser support

**Usage:**
```typescript
<ScrollArea className="h-72">
  <div className="p-4">
    {/* Long content */}
  </div>
</ScrollArea>
```

---

#### Resizable
**File:** `resizable.tsx`

**Sub-components:**
- `ResizablePanelGroup` - Container
- `ResizablePanel` - Individual panel
- `ResizableHandle` - Resize handle

**Features:**
- Drag to resize
- Min/max sizes
- Persist sizes
- Keyboard resize

**Usage:**
```typescript
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50}>
    Panel 1
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={50}>
    Panel 2
  </ResizablePanel>
</ResizablePanelGroup>
```

---

#### Aspect Ratio
**File:** `aspect-ratio.tsx`

**Features:**
- Maintain aspect ratio
- Common ratios (16:9, 4:3, 1:1)
- Custom ratios

**Usage:**
```typescript
<AspectRatio ratio={16 / 9}>
  <img src="..." alt="..." />
</AspectRatio>
```

---

### 3. NAVIGATION COMPONENTS (4 components)

#### Tabs
**File:** `tabs.tsx`

**Sub-components:**
- `Tabs` - Container
- `TabsList` - Tab list
- `TabsTrigger` - Individual tab
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

---

#### Breadcrumb
**File:** `breadcrumb.tsx`

**Sub-components:**
- `Breadcrumb` - Container
- `BreadcrumbList` - List
- `BreadcrumbItem` - Item
- `BreadcrumbLink` - Link
- `BreadcrumbPage` - Current page
- `BreadcrumbSeparator` - Separator

**Usage:**
```typescript
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

#### Navigation Menu
**File:** `navigation-menu.tsx`

**Features:**
- Complex navigation
- Dropdown menus
- Mega menus
- Keyboard navigation

**Sub-components:**
- `NavigationMenu`
- `NavigationMenuList`
- `NavigationMenuItem`
- `NavigationMenuTrigger`
- `NavigationMenuContent`
- `NavigationMenuLink`

---

#### Menubar
**File:** `menubar.tsx`

**Features:**
- Menu bar
- Nested menus
- Keyboard shortcuts
- Radio/checkbox items

**Sub-components:**
- `Menubar`
- `MenubarMenu`
- `MenubarTrigger`
- `MenubarContent`
- `MenubarItem`
- `MenubarSeparator`
- `MenubarCheckboxItem`
- `MenubarRadioGroup`
- `MenubarRadioItem`

---

### 4. OVERLAY COMPONENTS (6 components)

#### Dialog
**File:** `dialog.tsx`

**Sub-components:**
- `Dialog` - Container
- `DialogTrigger` - Trigger button
- `DialogContent` - Content container
- `DialogHeader` - Header section
- `DialogTitle` - Title
- `DialogDescription` - Description
- `DialogFooter` - Footer section
- `DialogClose` - Close button

**Usage:**
```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div>Content</div>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### Alert Dialog
**File:** `alert-dialog.tsx`

**Sub-components:**
- `AlertDialog`
- `AlertDialogTrigger`
- `AlertDialogContent`
- `AlertDialogHeader`
- `AlertDialogTitle`
- `AlertDialogDescription`
- `AlertDialogFooter`
- `AlertDialogAction`
- `AlertDialogCancel`

**Usage:**
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

#### Popover
**File:** `popover.tsx`

**Features:**
- Floating popover
- Position control
- Auto-positioning
- Trigger customization

**Sub-components:**
- `Popover`
- `PopoverTrigger`
- `PopoverContent`

**Usage:**
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open</Button>
  </PopoverTrigger>
  <PopoverContent>
    Popover content
  </PopoverContent>
</Popover>
```

---

#### Tooltip
**File:** `tooltip.tsx`

**Features:**
- Hover tooltips
- Delay configuration
- Position control
- Keyboard activation

**Sub-components:**
- `TooltipProvider`
- `Tooltip`
- `TooltipTrigger`
- `TooltipContent`

**Usage:**
```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      Tooltip text
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

#### Sheet
**File:** `sheet.tsx`

**Features:**
- Side panel/drawer
- Multiple positions (top, right, bottom, left)
- Overlay backdrop
- Close on outside click

**Sub-components:**
- `Sheet`
- `SheetTrigger`
- `SheetContent`
- `SheetHeader`
- `SheetTitle`
- `SheetDescription`
- `SheetFooter`
- `SheetClose`

**Usage:**
```typescript
<Sheet>
  <SheetTrigger asChild>
    <Button>Open</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
      <SheetDescription>Description</SheetDescription>
    </SheetHeader>
    Content
  </SheetContent>
</Sheet>
```

---

#### Drawer
**File:** `drawer.tsx`

**Features:**
- Bottom drawer (mobile-optimized)
- Drag to close
- Snap points

**Sub-components:**
- `Drawer`
- `DrawerTrigger`
- `DrawerContent`
- `DrawerHeader`
- `DrawerTitle`
- `DrawerDescription`
- `DrawerFooter`
- `DrawerClose`

---

### 5. DATA DISPLAY COMPONENTS (9 components)

#### Badge
**File:** `badge.tsx`

**Variants:**
- `default` - Default badge
- `secondary` - Secondary badge
- `destructive` - Destructive badge
- `outline` - Outline badge

**Usage:**
```typescript
<Badge variant="default">New</Badge>
<Badge variant="destructive">Error</Badge>
```

---

#### Avatar
**File:** `avatar.tsx`

**Sub-components:**
- `Avatar` - Container
- `AvatarImage` - Image
- `AvatarFallback` - Fallback (initials)

**Features:**
- Image support
- Fallback initials
- Size variants
- Loading states

**Usage:**
```typescript
<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

---

#### Progress
**File:** `progress.tsx`

**Features:**
- Progress bar
- Value display
- Indeterminate state
- Custom styling

**Usage:**
```typescript
<Progress value={60} />
```

---

#### Skeleton
**File:** `skeleton.tsx`

**Features:**
- Loading placeholder
- Animated shimmer
- Custom sizes

**Usage:**
```typescript
<Skeleton className="h-4 w-32" />
<Skeleton className="h-12 w-12 rounded-full" />
```

---

#### Table
**File:** `table.tsx`

**Sub-components:**
- `Table` - Table container
- `TableHeader` - Header
- `TableBody` - Body
- `TableFooter` - Footer
- `TableRow` - Row
- `TableHead` - Header cell
- `TableCell` - Data cell
- `TableCaption` - Caption

**Usage:**
```typescript
<Table>
  <TableCaption>List of items</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Item 1</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

#### Alert
**File:** `alert.tsx`

**Variants:**
- `default` - Info alert
- `destructive` - Error alert

**Sub-components:**
- `Alert` - Container
- `AlertTitle` - Title
- `AlertDescription` - Description

**Usage:**
```typescript
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong.
  </AlertDescription>
</Alert>
```

---

#### Calendar
**File:** `calendar.tsx`

**Features:**
- Date picker
- Single/range selection
- Month/year navigation
- Disabled dates
- Min/max dates

**Usage:**
```typescript
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

---

#### Hover Card
**File:** `hover-card.tsx`

**Features:**
- Hover-triggered card
- Delay configuration
- Rich content support

**Sub-components:**
- `HoverCard`
- `HoverCardTrigger`
- `HoverCardContent`

**Usage:**
```typescript
<HoverCard>
  <HoverCardTrigger asChild>
    <span>Hover me</span>
  </HoverCardTrigger>
  <HoverCardContent>
    Detailed information
  </HoverCardContent>
</HoverCard>
```

---

#### Carousel
**File:** `carousel.tsx`

**Features:**
- Image/content carousel
- Auto-play
- Navigation arrows
- Pagination dots

**Sub-components:**
- `Carousel`
- `CarouselContent`
- `CarouselItem`
- `CarouselPrevious`
- `CarouselNext`

---

### 6. FEEDBACK COMPONENTS (2 components)

#### Toast (Sonner)
**File:** `sonner.tsx`

**Features:**
- Toast notifications
- Multiple positions
- Auto-dismiss
- Action buttons
- Promise handling
- Rich content

**Usage:**
```typescript
import { toast } from 'sonner';

toast.success('Saved successfully');
toast.error('Failed to save');
toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed to save',
});
```

**Positions:**
- `top-left`, `top-center`, `top-right`
- `bottom-left`, `bottom-center`, `bottom-right`

---

#### Toggle
**File:** `toggle.tsx`

**Features:**
- Toggle button
- On/off states
- Icon support

**Variants:**
- `default`
- `outline`

**Sizes:**
- `default`
- `sm`
- `lg`

---

### 7. MENU COMPONENTS (2 components)

#### Dropdown Menu
**File:** `dropdown-menu.tsx`

**Features:**
- Context menus
- Sub-menus
- Checkbox/radio items
- Keyboard shortcuts
- Separators

**Sub-components:**
- `DropdownMenu`
- `DropdownMenuTrigger`
- `DropdownMenuContent`
- `DropdownMenuItem`
- `DropdownMenuCheckboxItem`
- `DropdownMenuRadioItem`
- `DropdownMenuRadioGroup`
- `DropdownMenuLabel`
- `DropdownMenuSeparator`
- `DropdownMenuShortcut`
- `DropdownMenuGroup`
- `DropdownMenuPortal`
- `DropdownMenuSub`
- `DropdownMenuSubContent`
- `DropdownMenuSubTrigger`

**Usage:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

#### Context Menu
**File:** `context-menu.tsx`

**Features:**
- Right-click menus
- Sub-menus
- Checkbox/radio items
- Keyboard shortcuts

**Sub-components:**
- Same as DropdownMenu but triggered by right-click

**Usage:**
```typescript
<ContextMenu>
  <ContextMenuTrigger>
    Right click me
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Edit</ContextMenuItem>
    <ContextMenuItem>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

### 8. UTILITY COMPONENTS (4 components)

#### Accordion
**File:** `accordion.tsx`

**Features:**
- Collapsible sections
- Single/multiple expansion
- Smooth animations

**Sub-components:**
- `Accordion`
- `AccordionItem`
- `AccordionTrigger`
- `AccordionContent`

**Usage:**
```typescript
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It adheres to the WAI-ARIA design pattern.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

#### Collapsible
**File:** `collapsible.tsx`

**Features:**
- Expandable content
- Controlled/uncontrolled
- Smooth animations

**Sub-components:**
- `Collapsible`
- `CollapsibleTrigger`
- `CollapsibleContent`

---

#### Command
**File:** `command.tsx`

**Features:**
- Command palette
- Fuzzy search
- Keyboard navigation
- Grouping

**Sub-components:**
- `Command`
- `CommandDialog`
- `CommandInput`
- `CommandList`
- `CommandEmpty`
- `CommandGroup`
- `CommandItem`
- `CommandSeparator`
- `CommandShortcut`

---

#### Toggle Group
**File:** `toggle-group.tsx`

**Features:**
- Toggle button group
- Single/multiple selection
- Icon support

**Usage:**
```typescript
<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <ToggleGroupItem value="left">Left</ToggleGroupItem>
  <ToggleGroupItem value="center">Center</ToggleGroupItem>
  <ToggleGroupItem value="right">Right</ToggleGroupItem>
</ToggleGroup>
```

---

## DESIGN SYSTEM

### Theme System

**CSS Variables:**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

### Color System

- **Primary** - Primary actions
- **Secondary** - Secondary actions
- **Destructive** - Destructive/error actions
- **Muted** - Muted/disabled content
- **Accent** - Accent colors
- **Background** - Background colors
- **Foreground** - Text colors
- **Border** - Border colors

### Typography

- Font families: System fonts, custom fonts
- Font sizes: xs, sm, base, lg, xl, 2xl, etc.
- Font weights: normal, medium, semibold, bold
- Line heights: tight, normal, relaxed

### Spacing Scale

- 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96

---

## ACCESSIBILITY

### WCAG Compliance

- ARIA labels and descriptions
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast
- Semantic HTML

### Keyboard Navigation

- Tab order
- Arrow key navigation
- Enter/Space activation
- Escape to close

---

## TYPE SAFETY

All components are fully TypeScript typed with:
- Props interfaces
- Variant types
- Event handlers
- Ref forwarding

**Example:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

---

## NO API ENDPOINTS

The UI Components module has **no API endpoints** - it's a pure frontend component library.

---

## SUMMARY

### Total Components: 50+

**Categories:**
- Form Components: 10
- Layout Components: 5
- Navigation Components: 4
- Overlay Components: 6
- Data Display Components: 9
- Feedback Components: 2
- Menu Components: 2
- Utility Components: 4
- Specialized: 8+

### Base Technologies:
- **Shadcn UI** - Component foundation
- **Radix UI** - Primitive components
- **Tailwind CSS** - Styling
- **class-variance-authority** - Variant management
- **React Hook Form** - Form handling
- **Zod** - Validation

### Features:
- **Accessibility:** WCAG compliant, ARIA support
- **Type Safety:** Full TypeScript support
- **Theming:** CSS variables, dark mode
- **Responsive:** Mobile-first design
- **Animations:** Smooth transitions

### No API Endpoints (frontend only)
