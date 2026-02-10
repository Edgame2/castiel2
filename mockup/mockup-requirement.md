# Sales Opportunities Mockup – UI Requirement

## 1. Location & stack
- **Location:** Standalone Next.js app under `/mockup` (its own Next.js app, not inside `containers/ui`).
- **UI:** shadcn default components only. Add components as needed (e.g. Tabs, Accordion, Badge, Table).
- **Audience:** Stakeholders – high-fidelity, close to final UI.

## 2. Data & behavior
- **Data:** Static/mock JSON only. No real API calls.
- **Interactions:** Navigation, expand/collapse, and mock actions (e.g. "Accept" / "Ignore" / "Irrelevant" on recommendations) with no backend calls.

## 3. Opportunities
- **List (20 items):** Each row/card shows: name, amount, stage, close date, risk score, win probability, early-warning flag.
- **Views:** Support both (a) list → click → detail page, and (b) multiple opportunity cards on one scrollable page.
- **Detail:** One opportunity per detail page, with tabbed sections (see Navigation).

## 4. Chain of thought (CoT)
- **Where:** Both risk explainability and recommendations.
- **Risk:** CoT appears **inside** the risk explainability block (same block as drivers).
- **Recommendations:** Per-recommendation reasoning (each recommendation card has its own CoT).
- **Shape:** Support step-by-step list (ReasoningStep[]), timeline, and collapsible "reasoning" section.
- **Content:** Label + short paragraph per step.

## 5. Risk analysis
- **Blocks (same as current risk page):** Gauge, trajectory chart, velocity chart, similar deals, explainability with drivers.
- **Explainability:** Include chain-of-thought inside this block (step-by-step / timeline / collapsible, with label + paragraph per step).

## 6. Recommendations
- **Layout:** Cards with details (not simple list).
- **Actions:** Mock feedback buttons: Accept / Ignore / Irrelevant (no backend).
- **Reasoning:** Per-recommendation chain-of-thought (each card has its own reasoning section with label + paragraph per step).

## 7. Navigation & structure
- **Option B:** List page → detail page with **tabs/sections:**
  - **Overview** (opportunity summary)
  - **Risk** (gauge, trajectory, velocity, similar deals, explainability with CoT inside)
  - **Recommendations** (cards with details, Accept/Ignore/Irrelevant, per-recommendation CoT)

## 8. Shadcn
- Use shadcn default styling. Add any shadcn components needed (Tabs, Accordion, Badge, Table, etc.).