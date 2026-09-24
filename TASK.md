# TASK — HESTRA AI Full-Stack MVP

> Build a high-fidelity frontend prototype of **Hestra AI**, an adaptive AI research workspace focused on Indonesia's nickel market.
>
> **Current scope:** full-stack hackathon MVP. Frontend uses **Next.js + TypeScript**, while the backend uses **Python + FastAPI**. Build the frontend first with mock data where needed, then connect the same interfaces to the Python backend, Sectors API, research memory, analytics, and AI orchestration. Do not put Sectors API keys or LLM provider keys in the frontend.

---

## 0. Source of Truth

Use the supplied mockups as the primary visual reference:

```text
/references
  01-login.png
  02-dashboard.png
  03-company-detail.png
  04-investigate.png
  05-research-memory.png
```

If exact text/data in a mockup conflicts with this task document, follow this task document for product behavior and follow the mockup for layout/style.

### Core design direction

- Premium B2B fintech / research workstation.
- Dominant colors: **black + white**.
- Accent: **dark electric blue only**.
- Humanoid robot is part of Hestra's brand identity, but it should remain tasteful and secondary to usability.
- Nickel/mining identity should appear through subtle visuals, labels, graphs, mine imagery, nickel references, and market context.
- Do not turn the product into a gaming UI or neon cyberpunk UI.
- Keep surfaces dark, restrained, analytical, credible, and professional.

---

# 1. Product Definition

## Name

**Hestra AI**

## Positioning

**Adaptive Nickel Intelligence**

Hestra is a research workspace for analysts following Indonesia's nickel ecosystem.

The frontend should communicate three key ideas:

1. **Static intelligence dashboard**
   - Dashboard structure is predefined.
   - AI does not generate arbitrary UI.

2. **Persistent AI copilot**
   - AI chat stays visible on the right side of the main authenticated workspace.
   - Dashboard cards/sections can be attached to chat as context.

3. **Adaptive investigation**
   - Later, backend orchestration will change tools/depth based on user profile.
   - For this frontend phase, visually represent the idea through states and UI copy.
   - Do not implement real agent orchestration yet.

---

# 2. MVP Routes

Implement these five primary pages:

```text
/login
/dashboard
/companies/[ticker]
/investigate/[id]
/research-memory
```

Recommended demo ticker:

```text
ANTM
```

Recommended investigation example:

```text
INCO operational-financial-divergence
```

---

# 3. Recommended Stack

## Frontend

Use:

```text
Next.js 15+
TypeScript
Tailwind CSS
shadcn/ui
Lucide React icons
Recharts
React Flow
```

Optional:

```text
Framer Motion
assistant-ui
```

Use Framer Motion only for subtle transitions.

Do not add unnecessary frontend state-management complexity for MVP. Prefer:

- React state
- Context where useful
- URL params/search params
- a tiny store only if clearly needed

## Backend

Use:

```text
Python 3.12+
FastAPI
Pydantic
httpx
SQLAlchemy
PostgreSQL / Supabase
Pandas or Polars
```

For AI orchestration, use **one** of:

```text
LangGraph
or
PydanticAI
```

Model provider should remain swappable. Initial supported options may include:

```text
Qwen
Mistral
DeepSeek
```

Do not hard-wire product logic to one LLM vendor.

## Frontend ↔ Backend communication

Use:

```text
REST for normal application data
SSE for streaming AI responses
```

Avoid WebSocket unless a concrete feature requires bidirectional realtime communication.

### Security rule

The frontend must never directly call:

```text
Sectors API
LLM provider API
database credentials
private backend services
```

All sensitive integrations live in the Python backend.

---

# 4. Project Structure

Use a monorepo-style structure:

```text
hestra-ai/
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ login/
│  │  │  │  └─ page.tsx
│  │  │  ├─ dashboard/
│  │  │  │  └─ page.tsx
│  │  │  ├─ companies/
│  │  │  │  └─ [ticker]/
│  │  │  │     └─ page.tsx
│  │  │  ├─ investigate/
│  │  │  │  └─ [id]/
│  │  │  │     └─ page.tsx
│  │  │  ├─ research-memory/
│  │  │  │  └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  └─ globals.css
│  │  │
│  │  ├─ components/
│  │  │  ├─ shell/
│  │  │  ├─ ai/
│  │  │  ├─ dashboard/
│  │  │  ├─ company/
│  │  │  ├─ investigate/
│  │  │  ├─ memory/
│  │  │  └─ shared/
│  │  │
│  │  ├─ services/
│  │  │  ├─ api-client.ts
│  │  │  ├─ dashboard.ts
│  │  │  ├─ companies.ts
│  │  │  ├─ investigations.ts
│  │  │  ├─ research-memory.ts
│  │  │  └─ ai-chat.ts
│  │  │
│  │  ├─ data/
│  │  │  └─ mock/
│  │  │
│  │  ├─ lib/
│  │  └─ types/
│  ├─ package.json
│  └─ .env.local.example
│
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ api/
│  │  │  ├─ dashboard.py
│  │  │  ├─ companies.py
│  │  │  ├─ signals.py
│  │  │  ├─ investigations.py
│  │  │  ├─ research_memory.py
│  │  │  ├─ context.py
│  │  │  └─ chat.py
│  │  │
│  │  ├─ services/
│  │  │  ├─ sectors_client.py
│  │  │  ├─ company_service.py
│  │  │  ├─ mining_service.py
│  │  │  ├─ commodity_service.py
│  │  │  ├─ market_service.py
│  │  │  ├─ research_memory_service.py
│  │  │  └─ llm_service.py
│  │  │
│  │  ├─ agents/
│  │  │  ├─ orchestrator.py
│  │  │  ├─ financial_agent.py
│  │  │  ├─ mining_agent.py
│  │  │  ├─ commodity_agent.py
│  │  │  ├─ peer_agent.py
│  │  │  ├─ contradiction_agent.py
│  │  │  └─ mentor_agent.py
│  │  │
│  │  ├─ analytics/
│  │  │  ├─ growth.py
│  │  │  ├─ margins.py
│  │  │  ├─ peer_metrics.py
│  │  │  ├─ divergence.py
│  │  │  └─ signals.py
│  │  │
│  │  ├─ schemas/
│  │  │  ├─ common.py
│  │  │  ├─ company.py
│  │  │  ├─ signal.py
│  │  │  ├─ investigation.py
│  │  │  ├─ memory.py
│  │  │  └─ chat.py
│  │  │
│  │  ├─ models/
│  │  ├─ db/
│  │  │  ├─ session.py
│  │  │  └─ repositories/
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  ├─ logging.py
│  │  │  └─ security.py
│  │  └─ utils/
│  ├─ tests/
│  ├─ pyproject.toml
│  └─ .env.example
│
├─ references/
├─ TASK.md
└─ README.md
```

### Backend architecture rule

Keep the backend as a **single FastAPI monolith** for the hackathon.

Do not split it into microservices.

---

# 5. Design Tokens

Do not freely invent colors throughout the app.

Define a restrained token system.

Suggested values:

```css
--bg: #050607;
--bg-elevated: #090b0e;
--surface: #0c1014;
--surface-2: #10161c;

--border: #1d2730;
--border-strong: #2a3947;

--text: #f6f8fb;
--text-secondary: #aab5c0;
--text-muted: #6d7b88;

--electric-blue: #0b5cff;
--electric-blue-strong: #0046d8;
--electric-blue-dark: #002d8f;
--electric-blue-soft: rgba(11, 92, 255, 0.10);

--positive: #30d89b;
--negative: #ff5a5f;
--warning: #ffad3d;
```

### Important palette rule

Primary brand identity is:

```text
BLACK
WHITE
DARK ELECTRIC BLUE
```

Green/red/orange may be used **only as semantic financial states** such as:

- positive
- negative
- warning

Do not use them decoratively.

### Borders

- Thin.
- Low contrast.
- Electric blue glow only on selected/active elements.
- Do not put glows around every card.

### Radius

Recommended:

```text
cards: 12–16px
buttons: 8–12px
inputs: 10–12px
pills: full radius
```

---

# 6. Typography

Use a modern sans serif such as:

```text
Inter
Geist
Manrope
```

Recommended:

```text
Headlines: Geist / 600–700
Body/UI: Inter / 400–600
```

Visual hierarchy:

```text
Page title:       36–48px
Major section:    22–28px
Card title:       15–18px
Body:             13–15px
Metadata:         11–13px
```

Avoid oversized decorative typography inside the authenticated app.

---

# 7. Global Authenticated Layout

Pages 2–5 use the same shell.

Desktop target:

```text
┌───────────────┬─────────────────────────────────┬──────────────────┐
│               │                                 │                  │
│ Sidebar       │ Main Workspace                  │ Hestra AI Chat   │
│ 220–240px     │ flexible                        │ 340–380px        │
│               │                                 │                  │
└───────────────┴─────────────────────────────────┴──────────────────┘
```

## Sidebar

Required:

```text
Hestra logo
Dashboard
Discover
Companies
Investigate
Signals
Research Memory
Settings
```

The active route must be visually obvious through:

- dark blue background
- electric-blue left/edge accent
- brighter icon/text

Robot artwork may occupy the bottom section of the sidebar on large desktop widths.

Do not let artwork reduce navigation usability.

## Chat panel

Persistent on authenticated desktop pages.

Header:

```text
HESTRA AI
small status / subtitle
```

Content:

- user message
- assistant message
- optional attached context
- quick follow-up chips
- composer

At <= 1200px:

- allow chat to collapse to a drawer/panel.

At <= 768px:

- chat should become a full-width overlay/drawer triggered by a visible AI button.

---

# 8. Critical Interaction — "Ask Hestra"

This is a core product behavior.

Any major analytical card should support:

```text
Ask Hestra
```

Examples:

- intelligence feed card
- company metric
- context graph node
- investigation evidence card
- research-memory item

On click:

1. Open/focus the chat panel.
2. Add a context attachment card.
3. Pre-fill or suggest a relevant prompt.
4. Do not automatically send unless explicitly chosen by user.

Example context object:

```ts
type ChatContext = {
  id: string;
  type:
    | "signal"
    | "company"
    | "metric"
    | "chart"
    | "investigation"
    | "thesis";
  title: string;
  subtitle?: string;
  entity?: string;
  payload: Record<string, unknown>;
};
```

Example:

```ts
{
  id: "signal-inco-margin-divergence",
  type: "signal",
  title: "Operational / Financial Divergence",
  subtitle: "Production +18% YoY, EBITDA margin -6.4pp",
  entity: "INCO",
  payload: {
    productionGrowth: 18,
    marginChange: -6.4
  }
}
```

The chat attachment UI should be compact and clearly distinct from a normal chat message.

---

# 9. Context Registry

Create a small frontend context registry now so backend integration later remains clean.

Example:

```ts
export const contextRegistry = {
  "dashboard.signal.vale-output": {
    type: "signal",
    title: "PT Vale ramps Sorowako output ahead of guidance",
    entity: "INCO",
  },
};
```

Do not serialize the entire dashboard into chat.

Chat should only receive the relevant attached context.

---

# 10. Page 1 — Login

Route:

```text
/login
```

Reference:

```text
01-login.png
```

## Layout

Desktop split:

```text
Left ~60%
Hero / robot / brand story

Right ~40%
Login card
```

### Left side

Include:

- glossy black humanoid robot
- subtle nickel ore / Ni reference
- electric-blue arcs/energy lines
- headline:

```text
Intelligence for
Indonesia's Nickel Market
```

- subheadline:

```text
Deeper insights. Smarter decisions.
```

Keep the copy concise.

### Right side

Login card:

```text
Hestra AI
Adaptive Nickel Intelligence

Email
Password

Remember me
Forgot password?

Sign In
```

Social login buttons can be included visually but need not be functional.

### Functionality

For this frontend phase:

- any valid-looking email + non-empty password can enter the dashboard
- or simply provide a clearly marked demo login
- do not build a real auth service yet

Recommended:

```text
Demo account:
demo@hestra.ai
password: demo
```

After sign-in:

```text
/dashboard
```

---

# 11. Page 2 — Dashboard

Route:

```text
/dashboard
```

Reference:

```text
02-dashboard.png
```

## Header

Required headline:

```text
What matters in nickel today?
```

Subtitle:

```text
AI-powered intelligence across Indonesia's nickel market.
```

## KPI row

Four cards:

```text
Nickel Price
Global Inventory
Indonesia Production/Exports
Tracked Companies
```

Use mock values.

## Nickel Intelligence Feed

3 prominent cards:

### Signal 1

```text
OPERATIONAL
PT Vale ramps Sorowako output ahead of guidance
```

### Signal 2

```text
COMMODITY SIGNAL
Nickel prices rebound on Indonesian supply constraints
```

### Signal 3

```text
PEER DIVERGENCE
ANTM valuation / operating divergence versus peers
```

Each card:

- type badge
- timestamp
- title
- short explanation
- entity footer
- Ask Hestra interaction
- link to investigation where relevant

## Coverage Universe

List representative companies:

```text
ANTM
INCO
NCKL
HRUM
```

Columns or row metadata may include:

```text
ticker
category
country
research status
```

## Market Snapshot

Use Recharts.

Show:

```text
Nickel price 1M
```

Time controls can visually support:

```text
1D
1W
1M
3M
1Y
```

For MVP, switching 1M/3M/1Y may use mock datasets.

## Chat behavior

Example initial assistant greeting:

```text
I'm Hestra, your nickel intelligence research partner.
What would you like to investigate?
```

Provide quick prompts:

```text
Latest on ANTM
Compare ANTM vs INCO
What changed this week?
Investigate margin divergence
```

---

# 12. Page 3 — Company Detail

Route example:

```text
/companies/ANTM
```

Reference:

```text
03-company-detail.png
```

## Company Hero

Required:

```text
ANTM
PT Aneka Tambang Tbk
```

Metadata:

```text
IDX: ANTM
Metals & Mining
Indonesia
```

Tags:

```text
Nickel
Ferronickel
Mining
Integrated
```

Hero may include a mine image/background.

## Tabs

Visually include:

```text
Overview
Financials
Operations
Valuation
ESG & Risk
News & Events
```

For MVP:

- Overview must be fully implemented
- other tabs may show polished empty/placeholder states if time is limited

Do not fake broken interactions.

## Overview cards

Required:

```text
Production Trend
Financial Performance
Nickel Exposure
Key Metrics
```

Use Recharts or CSS charts.

## Nickel Context Graph

Use React Flow.

Central node:

```text
ANTM
```

Connected nodes:

```text
Mine / Site
Commodity
Financials
Market
Industry / Peers
```

### Graph behavior

Click node:

- highlight selection
- show small details
- expose "Ask Hestra"

Do not use graph physics/random layout.
Use a predictable fixed layout matching the mockup.

## Peer Comparison

Rows:

```text
ANTM
INCO
NCKL
```

Possible columns:

```text
Market Cap
EV/EBITDA
ROE
Nickel Exposure
```

Values are mock data for now.

---

# 13. Page 4 — Investigate

Route:

```text
/investigate/inco-margin-divergence
```

Reference:

```text
04-investigate.png
```

This page is the most important page for demonstrating the future agentic system.

## Investigation Hero

Example:

```text
Operational / Financial Divergence

Production +18% YoY
EBITDA margin -6.4pp YoY
```

Entity:

```text
PT Vale Indonesia (INCO)
```

Priority badge:

```text
High Priority
```

## Investigation Stepper

Five stages:

```text
1 Understand signal
2 Gather evidence
3 Analyze & correlate
4 Test hypotheses
5 Synthesize findings
```

For frontend demo:

- Step 1 and 2 complete
- Step 3 active
- Step 4 and 5 upcoming

Optional:

Allow clicking through steps to visually change active state.

## Evidence Analysis

Four cards:

```text
Production Volume
EBITDA Margin
Nickel Commodity Price
Peer Comparison
```

Each should have:

- source label
- key metric
- delta
- simple chart/visual
- Ask Hestra action

## Hypothesis panel

Example:

```text
Margin compression appears primarily driven by lower
realized nickel pricing, operating cost pressure,
and product mix.
```

Show:

```text
Confidence: High
```

This confidence is display-only in frontend phase.

## Contradictions & Open Questions

This section is critical.

Show 2 unresolved questions.

Example:

```text
1. Cost increase alone does not fully explain the margin decline.
2. Peer margins declined less — is there a company-specific factor?
```

This makes the UI feel like an investigation rather than a generic chatbot.

## Chat

Attach the active investigation context.

Example user:

```text
Why did INCO's margins weaken despite higher production?
```

Assistant response should reference the attached evidence.

---

# 14. Page 5 — Research Memory

Route:

```text
/research-memory
```

Reference:

```text
05-research-memory.png
```

## Header

```text
Your Research, Remembered
```

Subtitle:

```text
Theses, assumptions, signals and investigations — organized in one place.
```

## Stats row

Cards:

```text
Saved Theses
Investigations
Bookmarked Signals
Companies Covered
```

## Current Thesis

Example:

```text
Indonesia's Nickel Downstream Expansion Drives Multi-Cycle Value
```

Tags:

```text
NICKEL
LONG-TERM
```

Display:

- thesis description
- last updated
- related companies

## Material Changes

Card:

```text
3 material changes since last review
```

Examples:

```text
Nickel prices changed
New HPAL project announced
Policy update
```

## Saved Investigations

List items with:

```text
title
tags
timestamp
```

## Important Assumptions

Example:

```text
Nickel price baseline
Regulation assumptions
EV demand assumptions
HPAL execution assumptions
FX assumption
```

## Company Coverage

Cards for:

```text
ANTM
INCO
NCKL
HRUM
```

## Chat

Initial user message:

```text
What changed since my last review?
```

Assistant response summarizes the 3 material changes.

---

# 15. Mock Data Types

Create typed mock data.

## Company

```ts
export type Company = {
  ticker: string;
  name: string;
  sector: string;
  country: string;
  tags: string[];
  marketCap?: number;
  description?: string;
};
```

## Signal

```ts
export type SignalType =
  | "operational"
  | "commodity"
  | "peer_divergence"
  | "financial"
  | "policy";

export type Signal = {
  id: string;
  type: SignalType;
  ticker?: string;
  title: string;
  summary: string;
  severity?: "low" | "medium" | "high";
  createdAt: string;
  contextId: string;
};
```

## Investigation

```ts
export type Investigation = {
  id: string;
  title: string;
  ticker: string;
  signalId: string;
  stage: 1 | 2 | 3 | 4 | 5;
  evidence: EvidenceItem[];
  hypothesis?: string;
  contradictions: string[];
};
```

## Research Memory

```ts
export type ResearchMemory = {
  currentThesis: Thesis;
  investigations: SavedInvestigation[];
  assumptions: Assumption[];
  materialChanges: MaterialChange[];
};
```

---

# 16. Backend API Contract

The frontend must talk only to the FastAPI backend.

Recommended endpoints:

```text
GET  /api/health

GET  /api/dashboard
GET  /api/signals
GET  /api/companies/{ticker}
GET  /api/companies/{ticker}/peers
GET  /api/companies/{ticker}/context-graph

GET  /api/investigations/{id}
POST /api/investigations

GET  /api/research-memory
POST /api/research-memory
PATCH /api/research-memory/{id}

POST /api/context/attach

POST /api/chat
GET  /api/chat/stream
```

For chat, prefer a single request that starts an SSE stream.

Example request:

```json
{
  "message": "Why did INCO margins weaken?",
  "context_id": "signal-inco-margin-divergence",
  "user_id": "demo-user"
}
```

Backend flow:

```text
request
↓
load user profile
↓
resolve attached context
↓
classify task
↓
decide research depth
↓
select tools/agents
↓
query Sectors
↓
run deterministic analytics
↓
compress evidence
↓
LLM synthesis
↓
SSE stream to Next.js
```

### API response shape

Prefer stable response envelopes.

Example:

```json
{
  "data": {},
  "meta": {
    "source": "mock | sectors",
    "cached": false
  }
}
```

Do not expose Sectors raw payloads directly to presentation components.

---

# 17. Static Dashboard Rule

This is non-negotiable.

Hestra's AI must **not** dynamically generate arbitrary dashboard layouts.

The frontend owns all layouts/components.

Future AI commands may only do things such as:

```text
ATTACH_CONTEXT
OPEN_COMPANY
OPEN_INVESTIGATION
FOCUS_CARD
OPEN_COMPARISON
SAVE_TO_MEMORY
```

Prepare the frontend for these actions.

Do not implement AI-generated HTML.


---

# 18. Backend Responsibilities

The Python backend owns:

```text
Sectors API integration
API key security
response normalization
caching
derived metrics
signal detection
research memory
user profile
context resolution
agent orchestration
LLM calls
SSE streaming
```

The frontend owns:

```text
layout
components
charts
navigation
interaction state
context attachment UX
rendering streamed AI output
```

Do not move deterministic analytics into the LLM.

## Deterministic analytics

Use Python for:

```text
percentage change
QoQ / YoY growth
margin changes
peer averages
ranking
trend calculations
signal thresholds
divergence detection
normalization
```

Example:

```python
if production_growth > 10 and margin_change_pp < -2:
    signal = "operational_financial_divergence"
```

The LLM may explain or investigate the signal, but it should not invent the calculation.

## Sectors client

Create one reusable client:

```text
backend/app/services/sectors_client.py
```

Responsibilities:

- authentication/header injection
- request retries
- timeout handling
- rate-limit handling
- response normalization
- caching hooks
- logging
- typed errors

Do not scatter `httpx.get()` calls across agents.

## Cache

Cache Sectors responses where reasonable.

For MVP, acceptable options:

```text
PostgreSQL cache table
in-memory TTL cache
Redis only if already available
```

Do not over-engineer caching.

## Database

Use PostgreSQL/Supabase for:

```text
users
analyst profiles
research memory
saved investigations
attached contexts
cached normalized data
```

Market data that can be fetched again does not need to be permanently duplicated unless caching is useful.

---

# 19. Agent Orchestration

The orchestrator is custom product logic.

Recommended:

```text
LangGraph
or
PydanticAI
```

Do not use both unless necessary.

Agent roles:

```text
Orchestrator
Financial Agent
Mining Agent
Commodity Agent
Peer Agent
Contradiction Agent
Mentor Agent
```

### Orchestrator input

```text
user message
user profile
attached context
route/page context
```

### Orchestrator output

Structured data, not prose.

Example:

```json
{
  "intent": "investigate_divergence",
  "depth": "deep",
  "agents": [
    "financial",
    "mining",
    "commodity",
    "peer",
    "contradiction"
  ],
  "need_mentor": false
}
```

### Adaptive behavior

For a junior analyst:

```text
lower autonomy
more guided explanation
mentor agent enabled
fewer parallel research branches
```

For a senior analyst:

```text
higher autonomy
deeper tool use
peer + contradiction analysis
concise evidence-first output
```

Do not personalize only the wording.

Personalize the workflow.

---

# 20. LLM Layer

Create:

```text
backend/app/services/llm_service.py
```

It must provide a provider-neutral interface.

Example:

```python
class LLMService:
    async def complete(...)
    async def stream(...)
    async def structured(...)
```

Initial providers may be:

```text
Qwen
Mistral
DeepSeek
```

Avoid provider-specific logic in agents.

### Token efficiency

Never pass huge raw datasets into the LLM.

Do:

```text
Sectors raw data
↓
Python normalize
↓
Python aggregate/calculate
↓
compact evidence object
↓
LLM
```

Example compact evidence:

```json
{
  "ticker": "INCO",
  "production_yoy": 18.4,
  "ebitda_margin_change_pp": -6.4,
  "nickel_price_yoy": -21.6,
  "peer_margin_avg": 28.6
}
```

---

# 21. Context Registry


---

# 22. Suggested Frontend Action Model

Define:

```ts
type HestraAction =
  | {
      type: "ATTACH_CONTEXT";
      contextId: string;
    }
  | {
      type: "OPEN_COMPANY";
      ticker: string;
    }
  | {
      type: "OPEN_INVESTIGATION";
      investigationId: string;
    }
  | {
      type: "FOCUS_SECTION";
      sectionId: string;
    }
  | {
      type: "SAVE_TO_MEMORY";
      contextId: string;
    };
```

For current MVP, actions can be triggered manually from the UI.

---

# 23. Responsiveness

The visual source is desktop-first, but frontend must not break on smaller screens.

## >= 1440px

Full:

```text
sidebar + workspace + AI panel
```

## 1024–1439px

- sidebar may compact
- AI panel remains but narrower/collapsible

## 768–1023px

- compact sidebar
- AI chat is drawer
- cards reflow to 2 columns

## <768px

- top mobile header
- content single-column
- sidebar is sheet/drawer
- AI chat is full-screen drawer
- no robot artwork consuming major viewport area

---

# 24. Accessibility

Minimum requirements:

- semantic buttons
- visible focus rings
- keyboard navigation
- color must not be sole signal
- tooltips where icons are ambiguous
- chart labels have text equivalents
- all interactive cards use buttons/links correctly
- minimum readable UI font size
- no hover-only core actions

---

# 25. Motion

Allowed:

- page fade/slide: subtle
- selected card glow
- chat panel reveal
- chart draw animation
- graph node selection
- button hover

Do not add:

- looping lightning animation everywhere
- rotating 3D robot
- excessive particle effects
- animated backgrounds that hurt performance

Respect:

```css
prefers-reduced-motion
```

---

# 26. Robot Asset Strategy

The humanoid robot is brand decoration.

For implementation:

- use a provided exported PNG/WebP if available
- do not spend project time recreating a 3D model in WebGL
- compress assets
- load decoratively/lazily
- provide gradient fallback if image unavailable

Robot should appear strongly on:

```text
login
sidebar / brand zone
```

It should **not** dominate every analytical page.

---

# 27. Data Integrity / Copy Rules

This frontend phase uses mock data.

Mark the code clearly:

```text
MOCK DATA — UI PROTOTYPE
```

Do not imply in README that mock numbers are verified live market data.

When real Sectors integration is implemented later:

- data labels must use actual endpoint/source
- derived metrics must be calculated by backend
- AI must not invent values

---

# 28. Components That Must Be Reusable

Do not make five pages as five monolithic files.

At minimum reuse:

```text
AppSidebar
Topbar
HestraChat
ChatContextAttachment
AskHestraButton
MetricCard
StatusBadge
SectionHeader
MiniChart
CompanyBadge
```

The company/investigate/memory screens should share the same visual system.

---

# 29. UX Details

## Loading

Use skeletons, not spinners everywhere.

## Empty states

Create intentional empty states for:

```text
no saved research
no signals
no chat context
no company found
```

## Errors

Create UI state:

```text
Unable to load market data.
Retry
```

## Search

Top search may be frontend-only in phase 1.

It should allow searching mock companies:

```text
ANTM
INCO
NCKL
```

Selecting a result routes to:

```text
/companies/[ticker]
```

---

# 30. Development Order

Implement in this sequence unless there is a strong technical reason not to.

## Phase 1 — Repository + frontend foundation

- [ ] Create monorepo folders `frontend/` and `backend/`
- [ ] Initialize Next.js + TypeScript
- [ ] Configure Tailwind
- [ ] Add shadcn/ui
- [ ] Define design tokens
- [ ] Build shared shell
- [ ] Create frontend types and mock data

## Phase 2 — Frontend pages with mock data

- [ ] `/login`
- [ ] `/dashboard`
- [ ] `/companies/ANTM`
- [ ] `/investigate/inco-margin-divergence`
- [ ] `/research-memory`
- [ ] shared AI panel
- [ ] Ask Hestra context attachment
- [ ] responsive states

Do not wait for backend before completing the visual flow.

## Phase 3 — FastAPI foundation

- [ ] Initialize Python project
- [ ] Add FastAPI + Pydantic + httpx + SQLAlchemy
- [ ] Add config/env handling
- [ ] Add `/api/health`
- [ ] Configure CORS for local frontend
- [ ] Add PostgreSQL/Supabase connection
- [ ] Create initial schemas
- [ ] Create normalized response envelope

## Phase 4 — Sectors integration

- [ ] Implement one `SectorsClient`
- [ ] Probe real nickel-related endpoints
- [ ] Verify ANTM / INCO / NCKL availability
- [ ] Normalize company data
- [ ] Normalize mining data
- [ ] Normalize commodity data
- [ ] Add cache
- [ ] Add explicit source metadata

## Phase 5 — Deterministic analytics

- [ ] growth helpers
- [ ] margin helpers
- [ ] peer calculations
- [ ] divergence rules
- [ ] signal engine
- [ ] unit tests

## Phase 6 — Replace frontend mocks

- [ ] connect dashboard API
- [ ] connect company API
- [ ] connect investigation API
- [ ] connect research-memory API
- [ ] retain graceful mock fallback only for development

## Phase 7 — AI service

- [ ] implement provider-neutral LLM service
- [ ] choose Qwen/Mistral/DeepSeek provider for MVP
- [ ] structured output support
- [ ] SSE streaming
- [ ] compact evidence prompting

## Phase 8 — Adaptive orchestration

- [ ] user profile loader
- [ ] context resolver
- [ ] intent classifier
- [ ] complexity/research-depth selection
- [ ] orchestrator
- [ ] financial tool
- [ ] mining tool
- [ ] commodity tool
- [ ] peer tool
- [ ] contradiction flow
- [ ] mentor flow for junior profile

## Phase 9 — Research Memory

- [ ] save investigation
- [ ] save thesis
- [ ] save assumptions
- [ ] material-change representation
- [ ] connect memory to AI context

## Phase 10 — Integration + polish

- [ ] frontend error handling
- [ ] backend error handling
- [ ] loading/skeleton states
- [ ] streaming UX
- [ ] API timeout/retry behavior
- [ ] responsive QA
- [ ] keyboard/focus QA
- [ ] visual consistency pass
- [ ] performance/image optimization
- [ ] final demo data verification

---

# 31. Definition of Done

Frontend MVP is done when:

### Global

- [ ] 5 target pages exist and are navigable
- [ ] styling is visually consistent with supplied mockups
- [ ] sidebar is shared
- [ ] AI panel is shared
- [ ] responsive behavior works
- [ ] no obvious layout overflow at 1440px, 1024px, 768px, 390px
- [ ] TypeScript passes
- [ ] lint passes
- [ ] no console errors

### Backend

- [ ] FastAPI boots successfully
- [ ] `/api/health` returns success
- [ ] frontend communicates with FastAPI rather than Sectors directly
- [ ] Sectors credentials exist only in backend environment variables
- [ ] one reusable Sectors client exists
- [ ] dashboard/company/investigation endpoints return normalized schemas
- [ ] deterministic analytics have unit tests
- [ ] chat endpoint can stream via SSE
- [ ] LLM provider is replaceable behind a service interface
- [ ] attached context reaches the orchestrator correctly
- [ ] basic research memory persists in PostgreSQL/Supabase
- [ ] backend failures return typed, user-safe errors
- [ ] no secrets committed to git

### Login

- [ ] demo sign-in routes to dashboard
- [ ] robot / brand area is visually strong
- [ ] card is polished and responsive

### Dashboard

- [ ] KPIs displayed
- [ ] intelligence feed displayed
- [ ] chart works
- [ ] company links work
- [ ] signal can be attached to Hestra chat

### Company

- [ ] ANTM example page implemented
- [ ] charts render
- [ ] context graph renders
- [ ] graph node interaction works
- [ ] peer table works
- [ ] sections can attach context to chat

### Investigate

- [ ] 5-stage visual flow exists
- [ ] evidence cards render
- [ ] hypothesis + contradictions render
- [ ] attached investigation context shows in chat

### Research Memory

- [ ] thesis card renders
- [ ] material changes render
- [ ] investigations list renders
- [ ] assumptions render
- [ ] chat summary renders

---

# 32. Do Not Do

Do **not**:

- block UI implementation while waiting for backend integration
- put backend logic inside Next.js route handlers when it belongs in FastAPI
- call Sectors directly from the browser
- put LLM/Sectors secrets in `NEXT_PUBLIC_*`
- introduce microservices for the hackathon
- add real authentication before UI is stable
- connect LLM before chat UX is polished
- generate dashboards dynamically with AI
- build automated stock recommendation / buy-sell functionality
- add unrelated sectors
- add crypto
- add trading execution
- add portfolio management
- overbuild charts
- add dozens of pages
- copy FinRobot branding/UI directly
- copy supplied screenshots pixel-for-pixel without reusable architecture

---

# 33. Product Copy Rules

Use:

```text
research
investigate
evidence
signal
context
coverage
market intelligence
research memory
hypothesis
assumption
```

Avoid leading with:

```text
BUY
SELL
guaranteed
prediction
best stock
profit opportunity
```

Hestra is a **research intelligence tool**, not an execution/trading product.

---

# 34. Temporary Mock Responses for Chat

Until real AI exists, simulate useful responses.

## Dashboard example

User:

```text
What changed in nickel today?
```

Assistant:

```text
Three developments stand out in the current nickel research workspace:
1. Operational momentum at INCO improved.
2. Nickel pricing strengthened over the selected period.
3. ANTM is showing a different financial/market pattern from selected peers.

Attach any signal and I can walk through the evidence.
```

## Company example

User:

```text
How does ANTM compare with peers?
```

Assistant:

```text
Within the current mock dataset, ANTM shows lower nickel concentration than INCO/NCKL but a different valuation and profitability profile. Open Peer Comparison to inspect the metrics side-by-side.
```

## Investigation example

User:

```text
Why did margins weaken?
```

Assistant:

```text
The current investigation points to three candidate drivers:
- weaker realized nickel pricing,
- operating cost pressure,
- product mix.

The evidence does not fully explain the magnitude yet, so two questions remain unresolved.
```

---

# 35. README Requirements

Create a README containing:

```text
Hestra AI
Adaptive Nickel Intelligence

Frontend prototype for Sectors Hackathon
```

Include:

- product summary
- screenshots
- routes
- stack
- how to run
- mock data disclosure
- FastAPI backend architecture
- Sectors API integration
- deterministic analytics architecture
- AI orchestration architecture
- SSE chat streaming
- environment-variable setup

Do not claim features that are not implemented.

---

# 36. Final Product Principle

The core experience should feel like:

```text
SEE A SIGNAL
    ↓
INSPECT THE DATA
    ↓
ASK HESTRA
    ↓
ATTACH CONTEXT
    ↓
INVESTIGATE DEEPER
    ↓
SAVE THE RESEARCH
```

The UI is **static and deliberate**.

AI is the **research layer around the interface**, not a UI generator.

---

# 37. Final Instruction to Coding Agent

Prioritize:

```text
1. Visual fidelity
2. Reusable frontend architecture
3. Clean FastAPI backend boundaries
4. Core interactions
5. Sectors data correctness
6. Adaptive orchestration
7. Responsiveness and reliability
```

Do not optimize for feature count.

A polished implementation of the five mockups with coherent navigation, shared chat context, and reusable components is more valuable than a larger but inconsistent application.

When making an implementation decision, ask:

> Does this make Hestra feel like a serious nickel research workspace with an AI copilot?

If not, do not add it.

---

# 38. Environment Variables

## Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Do not put secrets in frontend environment variables.

## Backend `.env`

Example:

```env
APP_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql+psycopg://...

SECTORS_API_KEY=...
SECTORS_BASE_URL=...

LLM_PROVIDER=qwen
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
```

Use Pydantic Settings or equivalent typed configuration.

---

# 39. Local Development

Expected workflow:

Terminal 1:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Expected URLs:

```text
Frontend  http://localhost:3000
Backend   http://localhost:8000
Docs      http://localhost:8000/docs
```

---

# 40. FastAPI Baseline

`backend/app/main.py` should conceptually resemble:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Hestra AI API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

Keep `main.py` small.

Routers and product logic belong in dedicated modules.

---

# 41. Architecture Summary

```text
                        USER
                          │
                          ▼
                    NEXT.JS UI
                          │
             REST + SSE   │
                          ▼
                      FASTAPI
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   PRODUCT API      ANALYTICS ENGINE    AI ORCHESTRATOR
        │                 │                 │
        │                 │          ┌──────┼──────┐
        │                 │          ▼      ▼      ▼
        │                 │       Mining Financial Peer
        │                 │          Agents / Tools
        │                 │                 │
        └──────────────┬──┴─────────────────┘
                       ▼
                  SECTORS API
                       │
                       ▼
                NORMALIZED DATA
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
      PostgreSQL/Supabase      LLM Provider
      profile + memory         Qwen/Mistral/
                               DeepSeek
```

Core rule:

> Next.js renders the product. FastAPI owns the intelligence.

