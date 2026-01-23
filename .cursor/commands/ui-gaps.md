# Comprehensive UI Implementation Audit

You are a meticulous UI auditor. Perform a complete analysis of this codebase to verify all UI elements are properly implemented and follow shadcn/ui conventions.

## 1. Component Inventory & Coverage

### Identify All Required UI Elements
- [ ] List every page/route in the application
- [ ] List every reusable component referenced in code
- [ ] List every shadcn/ui component used or imported
- [ ] List every custom component built

### Check Implementation Status
For each item above, verify:
- [ ] Is it actually implemented (not just imported/referenced)?
- [ ] Does the file exist in the correct location?
- [ ] Is it exported properly?
- [ ] Is it used/rendered somewhere?

## 2. shadcn/ui Component Standards

### Installation & Configuration
- [ ] Verify `components.json` exists with correct configuration
- [ ] Check all shadcn components are in `/components/ui/` directory
- [ ] Confirm components use the exact shadcn structure (no modifications to base components)
- [ ] Verify Tailwind CSS is configured correctly for shadcn
- [ ] Check `lib/utils.ts` has the `cn()` utility function

### Component Compliance
For each shadcn component used, verify:
- [ ] Uses the official shadcn implementation (not custom variants)
- [ ] Imports are from `@/components/ui/[component-name]`
- [ ] Props match shadcn's API (no missing required props)
- [ ] Variants are used correctly (default, destructive, outline, etc.)
- [ ] Styling uses Tailwind classes, not inline styles
- [ ] No conflicting CSS that overrides shadcn defaults

### Required shadcn Components Checklist
Verify these common components are installed if used:
- [ ] Button
- [ ] Input
- [ ] Label
- [ ] Card (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- [ ] Dialog (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription)
- [ ] Form (requires react-hook-form integration)
- [ ] Select
- [ ] Checkbox
- [ ] RadioGroup
- [ ] Textarea
- [ ] Switch
- [ ] Tabs
- [ ] Toast/Sonner
- [ ] DropdownMenu
- [ ] Sheet
- [ ] Alert
- [ ] Badge
- [ ] Avatar
- [ ] Separator
- [ ] Skeleton
- [ ] Table
- [ ] Tooltip
- [ ] ScrollArea
- [ ] Command
- [ ] Popover
- [ ] Navigation Menu
- [ ] Accordion
- [ ] Alert Dialog
- [ ] Aspect Ratio
- [ ] Calendar
- [ ] Collapsible
- [ ] Context Menu
- [ ] Hover Card
- [ ] Menubar
- [ ] Progress
- [ ] Slider
- [ ] Toggle

## 3. Navigation & Routing Audit

### Pages & Routes
- [ ] List all defined routes (check routing config/files)
- [ ] Verify each route has a corresponding page component
- [ ] Check for 404/error pages
- [ ] Verify protected routes have authentication guards
- [ ] Test all route parameters are handled

### Navigation Elements
- [ ] Main navigation menu (header/navbar)
- [ ] Footer navigation
- [ ] Sidebar navigation (if applicable)
- [ ] Breadcrumbs (if applicable)
- [ ] Mobile navigation menu
- [ ] Back buttons where needed

### Links & Navigation Actions
- [ ] All navigation links point to valid routes
- [ ] External links open in new tabs (where appropriate)
- [ ] Active link states are styled correctly
- [ ] No broken or placeholder links (e.g., "#" or "/todo")
- [ ] All CTAs (Call-to-Actions) are functional

## 4. Form Elements & Validation

### Forms Audit
For each form in the application:
- [ ] Uses react-hook-form or appropriate form library
- [ ] Has proper form validation (client-side)
- [ ] Shows validation errors correctly
- [ ] Has loading states during submission
- [ ] Has success/error feedback after submission
- [ ] All form fields have proper labels
- [ ] Required fields are marked
- [ ] Uses shadcn Form components consistently

### Input Elements
- [ ] All inputs have proper types (text, email, password, number, etc.)
- [ ] Placeholders are helpful and consistent
- [ ] Disabled states work correctly
- [ ] Focus states are visible
- [ ] Error states are styled appropriately

## 5. Interactive Elements

### Buttons
- [ ] All buttons have proper labels (no empty buttons)
- [ ] Loading states show spinners/disabled state
- [ ] Hover states work correctly
- [ ] Disabled buttons are visually distinct
- [ ] Icon buttons have aria-labels
- [ ] Destructive actions use appropriate variants

### Dialogs & Modals
- [ ] Open/close functionality works
- [ ] Have proper close buttons (X icon)
- [ ] Can be closed by clicking overlay (where appropriate)
- [ ] Have proper focus management
- [ ] Have escape key handling
- [ ] Content doesn't overflow

### Dropdowns & Selects
- [ ] All options are populated (no empty dropdowns)
- [ ] Selected values display correctly
- [ ] Keyboard navigation works
- [ ] Multi-select works if implemented
- [ ] Clear/reset options exist where needed

### Tooltips & Popovers
- [ ] Appear on correct trigger (hover/click)
- [ ] Have proper positioning
- [ ] Don't overflow viewport
- [ ] Have readable content
- [ ] Close properly

## 6. Data Display Components

### Tables
- [ ] Headers are defined
- [ ] Data rows render correctly
- [ ] Pagination works (if applicable)
- [ ] Sorting works (if applicable)
- [ ] Filtering works (if applicable)
- [ ] Empty states are handled
- [ ] Loading states show skeletons

### Lists
- [ ] Render all items correctly
- [ ] Have proper keys for React
- [ ] Empty states are handled
- [ ] Infinite scroll/pagination works (if applicable)

### Cards
- [ ] Use proper Card component structure
- [ ] Have all necessary sections (header, content, footer)
- [ ] Images load correctly
- [ ] Actions are functional

## 7. Feedback & Loading States

### Loading Indicators
- [ ] Skeleton screens for initial loads
- [ ] Spinners for actions
- [ ] Progress bars (if applicable)
- [ ] Disabled states during operations
- [ ] Loading text is helpful

### Notifications & Alerts
- [ ] Toast notifications work
- [ ] Success messages appear
- [ ] Error messages are clear
- [ ] Warning messages are distinct
- [ ] Can be dismissed
- [ ] Auto-dismiss timing is appropriate

### Empty States
- [ ] Every list/table has empty state
- [ ] Empty states have helpful messages
- [ ] Empty states suggest actions
- [ ] Images/icons enhance empty states

## 8. Responsive Design

### Layout Checks
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Navigation collapses on mobile
- [ ] Tables scroll or stack on mobile
- [ ] Forms are usable on mobile
- [ ] Modals fit on mobile screens

### Touch Interactions
- [ ] Buttons are large enough for touch (44x44px minimum)
- [ ] Swipe gestures work where implemented
- [ ] No hover-only interactions

## 9. Accessibility (a11y)

### Semantic HTML
- [ ] Proper heading hierarchy (h1, h2, h3...)
- [ ] Buttons are `<button>` elements
- [ ] Links are `<a>` elements
- [ ] Forms use `<form>` elements
- [ ] Lists use `<ul>`/`<ol>` + `<li>`

### ARIA & Labels
- [ ] All interactive elements have labels
- [ ] Icon buttons have aria-labels
- [ ] Form inputs have associated labels
- [ ] ARIA roles are used correctly
- [ ] aria-expanded, aria-hidden used appropriately

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Escape key closes modals/dropdowns
- [ ] Enter/Space activate buttons

### Color Contrast
- [ ] Text meets WCAG AA standards (4.5:1 for normal text)
- [ ] Interactive elements are distinguishable
- [ ] Don't rely on color alone for meaning

## 10. Visual Consistency

### Design System Compliance
- [ ] Consistent spacing (use Tailwind spacing scale)
- [ ] Consistent colors (use theme colors)
- [ ] Consistent typography (font sizes, weights)
- [ ] Consistent border radius
- [ ] Consistent shadows
- [ ] Consistent animation/transitions

### Component Variants
- [ ] Primary, secondary, tertiary styles are consistent
- [ ] Size variants (sm, md, lg) are consistent
- [ ] State variants (hover, active, disabled) are consistent

## 11. Content & Copy

### Text Content
- [ ] No "Lorem ipsum" placeholder text
- [ ] No "[TODO]" or "[PLACEHOLDER]" text
- [ ] Error messages are specific and helpful
- [ ] Success messages are encouraging
- [ ] Microcopy is clear and concise
- [ ] Terminology is consistent throughout

### Images & Icons
- [ ] All images have alt text
- [ ] Icons are consistent (same library/style)
- [ ] Images have proper aspect ratios
- [ ] Loading states for images
- [ ] Fallbacks for broken images

## 12. Theme & Dark Mode

If dark mode is implemented:
- [ ] All components support dark mode
- [ ] shadcn theme variables are used
- [ ] Colors are readable in both modes
- [ ] Images/logos have dark variants
- [ ] Theme toggle works correctly
- [ ] Theme preference persists

## 13. Performance & Best Practices

### Code Quality
- [ ] No console errors in browser
- [ ] No React key warnings
- [ ] No unused imports
- [ ] Components are properly typed (TypeScript)
- [ ] Props are validated

### Bundle Size
- [ ] Only necessary shadcn components are installed
- [ ] No duplicate component implementations
- [ ] Icons are tree-shakeable

## Output Format

Provide your findings in this structure:

### ✅ Implemented Correctly
List components/features that are fully implemented and follow standards

### ⚠️ Issues Found
For each issue:
- **Location**: File path and line number
- **Issue**: Description of the problem
- **Expected**: What it should be
- **Impact**: Severity (Critical/High/Medium/Low)

### ❌ Missing/Not Implemented
List components, pages, or features that are referenced but not implemented

### 🔧 Recommendations
- Quick wins for improvement
- shadcn components that could replace custom implementations
- Accessibility improvements
- Consistency improvements

### 📊 Summary Statistics
- Total pages: X
- Total components: X
- shadcn components used: X
- Issues found: X (breakdown by severity)
- Completion percentage: X%

---

**Instructions:**
1. Scan the entire codebase systematically
2. Check every file in `/components`, `/pages`, `/app`, `/src` directories
3. Cross-reference imports with actual implementations
4. Test navigation paths
5. Verify shadcn component usage against official documentation
6. Provide specific, actionable findings with file paths