# Hestra AI Frontend

Next.js application for the Hestra AI research workspace.

The frontend contains the public landing page, pricing/onboarding flow, dashboard, company intelligence views, investigation workflow, Research Memory, settings, and the right-side Hestra chat panel. It does not contain server-side secrets.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide icons
- Recharts
- React Flow
- Driver.js
- Three.js

## Local Setup

```bash
npm ci
copy .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The only required public environment variable is:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Do not put Sectors, SumoPod, database, or AI provider secrets in frontend environment variables.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run record:smoke
npm run record:judging
```

## Local Browser Screen Recording

From `frontend/`, keep `npm run dev` running in one terminal, then run `npm run record:smoke` in another. This records the actual local landing and pricing pages at 1920x1080 and saves a WebM file under `frontend/qa/recordings/`, which is ignored by Git.

For a repeatable judging walkthrough, provide a dedicated Hestra demo account through shell environment variables and run `npm run record:judging`. Do not put the password in this repository or an `.env` file. The script authenticates before recording starts, then records a real dashboard signal, evidence, contradiction section, AI explanation, saved investigation, and Research Memory. It fails if the signal, evidence, or AI response is unavailable; it never substitutes fixture data.

PowerShell example:

```powershell
$env:HESTRA_DEMO_BASE_URL = "https://hestra-ai.diannurwahid.com"
$env:HESTRA_DEMO_API_URL = "https://hestra-ai.diannurwahid.com"
$env:HESTRA_DEMO_EMAIL = "<demo account email>"
$env:HESTRA_DEMO_PASSWORD = "<demo account password>"
npm run record:judging
```

Generated recordings, local voice-over files, and raw captures are ignored by Git.

## Font

The application uses Geist Sans and Geist Mono through `next/font/google`.

## Public Release Notes

- Keep `.env.local` out of Git.
- Review landing/pricing claims before submission.
- Use SumoPod sandbox wording unless production payment support has been reviewed.
- Do not commit judge account credentials.
