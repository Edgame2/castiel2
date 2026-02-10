# Castiel – Sales opportunities mockup

Standalone Next.js UI mockup for stakeholders. No backend; all data is static (see `src/data/mock.ts`).

## Features

- **Opportunities list (20 items):** Table and card view. Fields: name, amount, stage, close date, risk score, win probability, early-warning flag.
- **Opportunity detail:** Tabs for Overview, Risk, Recommendations.
- **Risk tab:** Gauge, trajectory chart, velocity chart, similar deals, risk drivers with **chain of thought** inside the explainability block (step-by-step and timeline, collapsible).
- **Recommendations tab:** Cards with details; per-recommendation **chain of thought** (step-by-step and timeline, collapsible); mock actions: Accept / Ignore / Irrelevant.

## Prerequisites

**Node.js and npm** are required. If you see `npm: command not found` or `pnpm: command not found`:

- **Ubuntu/Debian:** Install Node.js 20+ (includes npm):
  ```bash
  sudo apt update && sudo apt install -y nodejs npm
  ```
  Or use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`.
- **macOS:** `brew install node` or use nvm.
- **Windows:** Install from [nodejs.org](https://nodejs.org/) (LTS).

## Run

**If you have pnpm** (from repo root after `pnpm install`):

```bash
pnpm dev:mockup
```

**With npm** (from mockup folder):

```bash
cd mockup && npm install && npm run dev
```

From repo root you can also run `npm run dev:mockup` (uses npm if pnpm is not available; run `cd mockup && npm install` once first).

**Build for production:**

```bash
pnpm build:mockup   # or: cd mockup && npm run build
```

App runs at **http://localhost:3001** (port 3001 to avoid clashing with main UI on 3000).

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- shadcn-style components: Button, Card, Tabs, Accordion, Badge, Table
- Recharts (gauge, bar chart)
- Mock data only; no API calls

## Requirements

See `mockup-requirement.md` in this folder.
