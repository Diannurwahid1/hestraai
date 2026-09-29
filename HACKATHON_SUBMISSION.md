# Hackathon Submission Notes

## Project

Hestra AI is an adaptive research workspace for Indonesia's nickel market. It combines Sectors-backed market/company data, deterministic signal generation, AI-assisted investigation, and persistent research memory.

## What Is Real

- Company, peer, commodity, and mining inputs are requested through the backend Sectors integration.
- Research signals are calculated by Hestra's deterministic Python signal engine.
- Evidence cards preserve source provenance and unresolved states.
- AI explanation uses compact evidence bundles and does not calculate financial metrics.
- Users configure their own AI provider key through Settings.

## What Is Sandbox or Demo

- Pricing tiers are a business hypothesis until Sectors credit burn and data redistribution rights are confirmed.
- SumoPod integration is sandbox-only.
- Public registration is open so judges can create an isolated account and complete onboarding.
- Rendered judging videos are generated artifacts, not source-of-truth product data.

## Judge Workflow

1. Open the landing page.
2. Choose a demo pricing plan.
3. Create an account from the public registration screen.
4. Complete the research-profile onboarding.
5. Open Dashboard and inspect a derived signal.
6. Click View Evidence or Investigate.
7. Ask Hestra to explain the evidence, contradiction, and unresolved questions.
8. Save the investigation to Research Memory.

## Public Demo Safety

Use sandbox credentials only. Do not expose server-side `.env` values. Rotate any API key that appeared in chat, terminal output, browser screenshots, or recordings.
