# Sentri E2E (Playwright)

## Scope

**UI-first.** Every flow a real user touches via the browser is automated through `--project=ui-chromium` (Playwright `page` fixture, real DOM, role-based selectors). API-only specs are the **fallback** — allowed only when the flow has no UI surface, the UI isn't shipped yet, or the UI flow is prohibitively flaky/slow. See [`COVERAGE.md`](./COVERAGE.md) § UI-first policy for the full rule, and the per-row matrix for what's currently UI-driven vs. API-only.

Today the suite covers:
- **UI smoke** — login route renders + invalid-credentials error state (`ui-smoke.spec.mjs`)
- **API auth lifecycle** (registration, verification, login negative path) — fallback while UI verify-email + login-success specs are written
- **API full functional flow** (project + test CRUD + approval) — fallback while ProjectDetail / Tests page UI specs are written
- **API negative validations + session security** (CSRF, logout revocation) — appropriate as API-only (no user-facing UI for header tampering)
- **Functional-area endpoint contracts** (crawl, generate, recorder, run-all, AI fix, AI chat) — fallback while corresponding modal/page UI specs are written

> For **manual** end-to-end validation (Golden E2E happy path + per-feature happy paths and negatives), see [`QA.md`](../../QA.md) at the repo root. The Playwright suite below is the automated complement — both should pass before release.

## Run
From repo root:

```bash
npx --prefix backend playwright test -c tests/e2e/playwright.config.mjs
node tests/e2e/generate-report.mjs
```

UI-only run:

```bash
RUN_UI_E2E=true npm run e2e:test -- --project=ui-chromium
```

## Environment
- `E2E_BACKEND_URL` (default `http://127.0.0.1:3001`)
- `E2E_FRONTEND_URL` (default `http://127.0.0.1:4173`)

If frontend is unavailable, UI specs will auto-skip and API specs still run.

## CI
- `.github/workflows/ci.yml` now includes a dedicated **UI E2E — Playwright smoke (Chromium)** job.
- The job provisions Chromium, boots backend/frontend, and runs `ui-chromium` project with `RUN_UI_E2E=true`.

## Coverage & Backlog

What's automated vs. still manual lives in [`COVERAGE.md`](./COVERAGE.md) — single source of truth, mirrors `QA.md`'s Golden E2E Happy Path (51 steps) and per-feature flows. Read it before adding a new spec; pick the top **Backlog** item; flip the matching row from 🟥 / 🟨 to ✅ in the same PR. The backfill queue itself is tracked as `MNT-012 — E2E coverage backfill` in `ROADMAP.md`.
