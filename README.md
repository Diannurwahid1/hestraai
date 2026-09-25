# Hestra AI

**Adaptive Nickel Intelligence**

Full-stack research workspace for analysts following Indonesia's nickel ecosystem. The interface is deliberate and fixed; AI acts as the research layer around signals, evidence, company context, investigations, and persistent per-user research memory.

> Data disclosure: Hestra research signals are derived by our deterministic signal engine from Sectors data; they are not native fields provided by Sectors. Investigation evidence is assembled from available Sectors-backed sources by Hestra's research orchestration, with source provenance preserved for each datapoint. Unavailable research facts are marked unresolved.

## Product flow

`Landing page → choose a demo plan → create account → set research profile → guided tour → inspect a signal → Ask Hestra → save the research`

## Screens and routes

- `/` — public landing page
- `/pricing` — illustrative plan selection; no checkout, payment, billing, or entitlement enforcement
- `/login` — register a personal account or sign in
- `/onboarding` — save name, research level, role, language, focus companies, and research goal
- `/dashboard` — KPIs, nickel intelligence feed, coverage universe, market chart
- `/discover` — search/filter the Sectors nickel directory and derived signals
- `/companies/ANTM` — real company report, financial history, operations, valuation, peers, context graph
- `/investigate` — current verified signals and saved investigations
- `/investigate/{signal_id}` — sourced evidence workflow, hypotheses, contradictions
- `/research-memory` — personal thesis, notes, assumptions, and saved signal/investigation records
- `/settings` — account, research profile, AI gateway/model, usage, and logs

The dashboard introduces its controls with a Driver.js tour after onboarding. Users can finish or skip it and replay it from the help button. Profile preferences are stored per user in the backend; the selected level and language guide AI explanations, while the demo plan records interest only.

Design references live in [`references/`](./references). The implementation uses shared components and live interactions rather than embedding screenshots.

## Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS 4, Lucide, Recharts, React Flow, Driver.js
- Backend: Python 3.11+ (3.12 recommended), FastAPI, Pydantic, HTTPX, SQLAlchemy async
- Data: Sectors Financial API v2 behind one reusable server-side client
- Persistence: PostgreSQL/Supabase or SQLite async for local use
- AI: provider-neutral service interface with a configurable OpenAI-compatible model gateway
- Transport: REST for application data and authenticated chat

## Run locally

Backend:

```bash
cd backend
python -m pip install -e ".[dev]"
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Environment variables

Frontend contains only a public backend URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Backend secrets remain server-side:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host/database
SECTORS_API_KEY=your-server-side-key
SECTORS_BASE_URL=https://api.sectors.app
LLM_PROVIDER=unconfigured
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
LLM_EXTRA_HEADERS=
LLM_TIMEOUT_SECONDS=45
```

Never expose Sectors, database, or LLM credentials through `NEXT_PUBLIC_*` variables.

## Sectors integration

`backend/app/services/sectors_client.py` is the only low-level Sectors client. It injects the `Authorization` header, applies timeouts and retries, converts rate-limit/network failures into typed exceptions, and uses a shared per-process in-memory TTL cache with request coalescing, stale-on-error fallback, 60 requests/minute process budget, and four concurrent requests by default. Company reports default to a 1-hour TTL, mining data to 24 hours, commodity history to 1 hour, and daily prices to 5 minutes; each is configurable. Normalized research snapshots and the paginated nickel directory are cached separately. Cached values follow Sectors' own update schedule and are not a live market stream. The current path uses Sectors API v2 endpoints for:

- `GET /v2/company/report/{symbol}/`
- `GET /v2/daily/{symbol}/`
- `GET /v2/mining/companies/`
- `GET /v2/mining/companies/{slug}/`
- `GET /v2/mining/commodities/{commodity_name}/price/`

Presentation components never receive raw Sectors payloads. Services normalize external fields into stable Hestra response envelopes:

```json
{ "data": {}, "meta": { "source": "sectors", "cached": false } }
```

Successful upstream HTTP calls, cache hits, stale fallbacks, status codes, and endpoint paths are now persisted in `sectors_requests`. Set `HESTRA_ADMIN_EMAIL` to an existing account email to view the global 30-day summary at `GET /api/billing/sectors-usage`. The summary reports HTTP calls, **not Sectors credits**: the current verified integration has no confirmed per-endpoint credit charge. Do not set customer Data Unit limits or capacity estimates from HTTP counts without reconciling them against Sectors' actual credit balance/billing statement. In-memory cache is shared only within one backend process; multi-worker deployments require a shared Redis or database cache for cross-worker deduplication.

## Pricing and SumoPod sandbox

The pricing page presents a 7-day trial and proposed Researcher (Rp199k), Analyst (Rp399k), and Team (from Rp1.49m) tiers. Data Unit allowances and tier feature gates are **not enforced** yet while actual Sectors credit burn and downstream data-redistribution rights remain unverified. Every AI plan is BYOK; users configure their own AI provider key in Settings.

Only the SumoPod **sandbox** API is supported. Fill these backend-only variables after obtaining them from SumoPod:

```env
SUMOPOD_BASE_URL=https://api-pay-sandbox.sumopod.com
SUMOPOD_API_KEY=your-sandbox-key
SUMOPOD_WEBHOOK_SECRET=whsec_your-sandbox-signing-secret
# Or use SUMOPOD_WEBHOOK_TOKEN instead of the signing secret.
HESTRA_ADMIN_EMAIL=your-operator-account@example.com
```

Set the SumoPod webhook URL to `<public backend origin>/api/billing/sumopod/webhook` and ensure your reverse proxy routes that path to FastAPI. A signed, matching `payment.completed` event activates a one-time 30-day **sandbox** entitlement; redirecting back from checkout never activates it. The flow does not create automatic renewal or charge real money. The checkout rejects non-sandbox API and payment-link hosts. The sandbox API key has been tested against SumoPod's create-payment endpoint and returned a pending payment link on `pay-sandbox.sumopod.com`; real webhook delivery still requires public deployment and SumoPod webhook configuration.

The operator-only `POST /api/billing/economics` endpoint accepts explicit scenario inputs (`researchers`, `analysts`, `sectors_monthly_cost_idr`, `sectors_monthly_credits`, optional `average_credits_per_user`, `payment_method`) and returns revenue, QRIS fee estimate, remaining amount before hosting/tax/support, and capacity if a per-user credit assumption is supplied. It deliberately never reports an unknown credit burn as fact.

## Deterministic analytics

Percentage changes, margins, peer median, and divergence detection live in `backend/app/analytics/`. The MVP emits three signal types when verified data supports them: operational/financial, peer, and commodity/financial divergence. The ANTM operational/financial example uses revenue growth as a company activity proxy because the connected Sectors mining endpoints do not contain production volume history. The UI states this limitation, and confidence is capped at medium for that proxy. Historical periods are labeled explicitly. The LLM receives compact sourced evidence and never calculates metrics.

## AI orchestration

The orchestrator returns a structured plan containing intent, research depth, selected specialist roles, and whether a mentor flow is required. Senior profiles can trigger deeper peer/contradiction analysis; junior profiles enable guided mentor behavior. The LLM boundary supports `complete`, `structured`, and `stream`, keeping Bynara Router, Qwen, Mistral, DeepSeek, or another OpenAI-compatible provider swappable.

For live AI through Bynara/NaraRouter, set the backend env to an OpenAI-compatible gateway URL:

```env
LLM_PROVIDER=bynara
LLM_API_KEY=your-bynara-router-key
LLM_BASE_URL=https://router.bynara.id/v1
LLM_MODEL=agnes-3-flash
LLM_EXTRA_HEADERS={"X-Router-Project":"hestra-ai"}
```

`LLM_EXTRA_HEADERS` is optional and should stay empty unless the router requires extra project, app, or routing headers. If the AI gateway is unavailable, sourced evidence remains visible and the explanation is marked unavailable.

The Settings screen includes an AI Model section. Each user can enter an OpenAI-compatible base URL, API key, and model name, then load `/models` and pick from the returned list. Settings, usage, and request logs are persisted by the backend database. An unconfigured/unavailable gateway returns an error, never a fabricated AI answer.

## Chat and context

“Ask Hestra” attaches one compact, typed context object—not an entire page. The frontend saves attachments via `/api/context/attach`; chat uses `/api/chat` and persists per-user conversation history. Research Memory is per-user database CRUD, and captured signals retain provenance. No production route silently falls back to mock facts.

Chat explanations render as safe Markdown. Evidence cards and charts are assembled deterministically from the same verified Sectors-backed context and stored with the answer for history reloads; the model cannot provide their numbers. Missing source data produces an unresolved state instead of a chart or invented metric.

## Quality checks

```bash
cd frontend && npm run build && npm run lint
cd backend && python -m pytest
```
