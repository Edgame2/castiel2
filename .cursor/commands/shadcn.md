Goal: Make every page and shared component under ui use shadcn primitives from @/components/ui/ instead of raw HTML form controls and ad‑hoc styled elements. Preserve behavior and layout; unify styling via shadcn only.
Scope:
All files under ui/src/app/ (pages, layouts).
All files under ui/src/components/ except ui/src/components/ui/ (do not change the shadcn primitives themselves).
Replacements (mandatory):
Every <button> → <Button> from @/components/ui/button. Use variant and size (e.g. default, destructive, outline, ghost, link) instead of custom Tailwind for look. Keep type, disabled, onClick, etc.
Every <input> (text, email, password, etc.) → <Input> from @/components/ui/input. Keep type, value, onChange, placeholder, disabled, id, etc. Remove duplicate border/background classes that Input already provides.
Every <textarea> → <Textarea> from @/components/ui/textarea. Same props; drop redundant styling.
Every form <label> (including those used with htmlFor for inputs) → <Label> from @/components/ui/label. Keep htmlFor and accessibility.
Every <select> + <option> → shadcn <Select>, <SelectTrigger>, <SelectContent>, <SelectItem> from @/components/ui/select. Preserve value, onChange, options, and disabled state.
Where a group of elements acts as a card (title + content + actions), use <Card>, <CardHeader>, <CardTitle>, <CardDescription>, <CardContent>, <CardFooter> from @/components/ui/card instead of plain divs with card-like classes.
Where a checkbox is used (including in forms or “remember me” style), use <Checkbox> from @/components/ui/checkbox with <Label>; keep checked state and handlers.
Rules:
Add the correct imports from @/components/ui/<component> in each file. Use only these shadcn components for the elements above; no raw <button>, <input>, <select>, <textarea>, or form <label> in scope.
Prefer shadcn variant/size over custom className for buttons and form controls. Only add className when needed for layout (e.g. className="w-full") or rare overrides.
Preserve all existing behavior: form state, validation, submit handlers, links (use Button asChild with Next.js Link where a button is actually a link), and ARIA/ids for labels.
If a shadcn primitive is missing (e.g. Dialog, Tabs), add it with npx shadcn@latest add <component> first, then use it instead of custom modals/tabs.
Do not change ui/src/components/ui/* or components.json unless adding a new shadcn component.
Process:
List all .tsx files under ui/src/app and ui/src/components (excluding components/ui).
For each file, replace the elements listed above with the corresponding shadcn components, update imports, and remove redundant Tailwind that duplicates shadcn styles.
After edits, ensure no remaining raw <button>, <input>, <select>, <textarea>, or form <label> in those directories (except inside components/ui).
Optionally add or enable an ESLint rule that forbids raw <button>, <input>, <select>, <textarea> in src/app and src/components (excluding src/components/ui) so future code stays on shadcn.
Output: All in-scope pages and components using only shadcn default components for buttons, inputs, selects, textareas, labels, cards, and checkboxes; no behavior regressions; consistent imports from @/components/ui/.