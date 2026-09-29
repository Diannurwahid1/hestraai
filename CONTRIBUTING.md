# Contributing

Thanks for helping improve Hestra AI.

## Local Setup

1. Start the backend:

```bash
cd backend
python -m pip install -e ".[dev]"
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

2. Start the frontend:

```bash
cd frontend
npm ci
copy .env.local.example .env.local
npm run dev
```

## Development Rules

- Do not commit secrets, local databases, generated videos, or `.env` files.
- Keep Sectors calls behind `backend/app/services/sectors_client.py`.
- Do not fabricate research facts. Missing evidence should be returned as unresolved.
- Financial calculations belong in deterministic Python analytics code, not in LLM prompts.
- UI changes should follow the existing Hestra visual system.

## Quality Checks

```bash
cd backend && python -m pytest
cd frontend && npm run lint && npm run build
```

For video showcase changes:

```bash
cd showcase
npm ci
npm run typecheck
```
