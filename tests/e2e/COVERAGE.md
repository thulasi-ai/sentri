# E2E Automation Coverage

> **Single source of truth for what's automated vs. still manual.** Mirrors `QA.md`'s Golden E2E Happy Path (51 steps, `QA.md:240-340`) and per-feature happy paths. When a step is automated, link the spec; when not, mark `🟥` so the next agent knows where to add coverage.
>
> **For agents:** read the **Backlog** section below first. Pick the top item, write the spec under `tests/e2e/specs/`, flip the row to ✅ in the same PR. Use `tests/e2e/utils/auth.mjs` + `tests/e2e/utils/session.mjs` — never inline auth or CSRF logic in a spec.
>
> **For humans:** when shipping a user-facing feature, add at least one ✅ row here in the same PR (per `REVIEW.md` § Mandatory Test Requirements). The backfill queue itself is tracked as `MNT-012 — E2E coverage backfill` in `ROADMAP.md`.

## UI-first policy

**Default to UI E2E.** Every flow that a real user touches via the browser must be automated through `--project=ui-chromium` (Playwright `page` fixture, real DOM interactions, role-based selectors). API-only specs are the **fallback**, allowed only when:

1. The flow has no UI surface (background jobs, server-to-server webhooks, system endpoints).
2. The UI surface exists but is not yet shipped (track as 🟨 with a "UI pending" note).
3. The UI flow is **prohibitively flaky or slow** to drive through the browser AND the underlying contract is fully covered by the API spec — document the reason inline (e.g. `🟨 (API-only — UI flow is SSE-driven, see notes)`).

When fallback applies, the row's **Status** column carries an `(API-only)` suffix so reviewers can immediately see the UI gap. Backlog items default to UI specs unless they explicitly call out an API-only scope.

## Status legend

- ✅ **Fully automated (UI)** — driven through `page.*` in a `ui-chromium` spec, runs in CI on every PR
- ✅ **(API-only)** — fully automated against the HTTP layer; UI surface either absent or covered by the row above
- 🟨 **Partial** — endpoint contract covered, but UI flow not yet automated; gaps called out in the row
- 🟥 **Not automated** — only manual coverage in `QA.md`
- ⏭️ **Out of scope** — deliberately manual-only (e.g. outbound notifications, Render/Render-disk smoke)

---

## 🚀 Backlog — next 5 to automate

Pick the top item. Each is sized to fit one PR (1–3 specs, ≤ 200 LOC each), **UI by default**. If a UI spec isn't feasible, document the reason in the row and mark `(API-only)` per the UI-first policy above.

1. **Login → Dashboard happy path** (`QA.md` §1 + §17) → extend `tests/e2e/specs/ui-smoke.spec.mjs` (or split into `auth-ui.spec.mjs`): seed a verified user via API, then drive `getByLabel('Email')` + `getByLabel('Password')` + `getByRole('button', { name: /sign in/i })` and assert `/dashboard` loads with the workspace name visible. **UI-only.**
2. **Project — create via UI form** (`QA.md` §3 step 5) → new `tests/e2e/specs/project-create-ui.spec.mjs` driving the `/projects/new` form (name + URL) end-to-end, assert redirect to `/projects/:id` and project visible in the list. **UI-only.**
3. **Tests review — approve / reject + ReviewModal** (`QA.md` §7 step 13–15) → new `tests/e2e/specs/tests-review-ui.spec.mjs`: seed Draft tests via API, then drive the Tests page filter pills + bulk-approve toolbar via `getByRole('button', { name: /approve/i })`. **UI-only.**
4. **Run regression — RunRegressionModal + live RunDetail** (`QA.md` §9 step 20–22) → new `tests/e2e/specs/run-regression-ui.spec.mjs`: open the modal, set `parallelWorkers: 2`, click Run, assert RunDetail SSE log streams in and the per-test status badges update. **UI-only** (SSE is the user surface; consume it via `page` not `request`).
5. **Quality gates — Settings panel save + RunDetail badge** (`QA.md` § Quality Gates) → new `tests/e2e/specs/quality-gates-ui.spec.mjs`: drive ProjectDetail → Settings → Quality Gates form, save `{ minPassRate: 95 }`, trigger a sub-gate run, assert the red `Gates ✗` badge + inline violation panel render on RunDetail. **UI-only.**

Why these five: each closes a UI gap exposed by the current API-only rows in the Golden E2E table. Zero file overlap, so up to 5 agents can ship in parallel.

---

## 🌟 Golden E2E Happy Path coverage (`QA.md:240-340`)

| QA.md ref | Step / flow | Spec | Status |
|---|---|---|---|
| §1 step 1–3 | Auth — register & verify (email link) | `api-auth.spec.mjs` :: *register creates user and login is blocked until verification* | 🟨 (API-only — UI login + verify-email flow not yet automated; partial UI in `ui-smoke.spec.mjs`) |
| §1 step 1–3 | Auth — wrong-password rejection | `ui-smoke.spec.mjs` :: *invalid credentials show an error state* + `api-auth.spec.mjs` :: *login negative path with bad password* | ✅ |
| §2 step 4 | Workspace — invite collaborator | — | 🟥 (UI: Settings → Members) |
| §3 step 5 | Project — create | `full-functional-api.spec.mjs` :: *verify account, login, project+test CRUD happy path* | 🟨 (API-only — UI: `/projects/new` form + redirect to ProjectDetail not yet automated) |
| §4 step 6 | Crawl — link mode | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (API-only — endpoint contract; UI: CrawlProjectModal not driven) |
| §4 step 7 | Crawl — state exploration | — | 🟥 (UI: CrawlProjectModal mode selector) |
| §5 step 8–9 | Generate — AI test draft creation | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (API-only — endpoint contract; UI: GenerateTestModal not driven) |
| §6 step 10–12 | Recorder — start/stop session | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (API-only — start/stop; UI: RecorderModal canvas interaction not automated) |
| §7 step 13–15 | Review — approve / reject test | `functional-areas.spec.mjs` :: *project tests workflow: create, approve/reject/restore, export, run* | 🟨 (API-only — UI: Tests page review buttons + ReviewModal not driven) |
| §8 step 16–19 | Edit — Steps ↔ Source diff/preview | — | 🟥 (UI: TestDetail Steps↔Source toggle + diff modal) |
| §9 step 20–22 | Run — execute regression | — | 🟥 (UI: RunRegressionModal + live RunDetail SSE) |
| §10 step 23–26 | AI Fix — manual flow | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (API-only — apply-fix; UI: TestDetail "Fix with AI" + SSE stream not consumed) |
| §11 step 27–29 | Visual baseline — first run + accept | — | 🟥 (UI: RunDetail Visual tab + "Accept visual changes" button) |
| §12 step 30–34 | Run results / artifacts / reports | — | 🟥 (UI: RunDetail artifact downloads + `/reports` page) |
| §13 step 35 | Notifications — Teams/email/webhook fire | — | ⏭️ (Outbound side-effects out of scope for E2E; mocked at unit level) |
| §14 step 36–38 | Automation — CI/CD trigger token + cron schedule | `full-functional-api.spec.mjs` :: *session security: logout revokes access and missing CSRF blocks mutation* | 🟨 (API-only — CSRF only; UI: `/automation` page TokenManager + ScheduleManager not driven) |
| §15 step 39–41 | Export — Zephyr / TestRail / Playwright ZIP | `functional-areas.spec.mjs` :: *project tests workflow: create, approve/reject/restore, export, run* | 🟨 (API-only — Zephyr/TestRail; UI: ProjectExportMenu dropdown + Playwright ZIP not driven) |
| §16 step 42–44 | AI Chat — multi-turn + export | — | 🟥 (UI: `/chat` page session management + Markdown/JSON export) |
| §17 step 45 | Dashboard — pass-rate / defect breakdown | — | 🟥 (UI: Dashboard widgets + PDF export) |
| §18 step 46–47 | Recycle bin — soft-delete + restore + audit log | — | 🟥 (UI: Settings → Recycle Bin + Audit Log filter) |
| §19 step 48–49 | Account / GDPR — export + delete | — | 🟥 (UI: Settings → Account password-confirmed export + delete) |
| §20 step 50–51 | Permissions — viewer 403, outsider 403 | `full-functional-api.spec.mjs` :: *negative validations for project/test inputs* | 🟨 (API-only — negative path; UI: ProtectedRoute + role-gated buttons not driven) |
 
---

## 🧪 Per-feature flows (`QA.md` § Functional Test Areas)

Per-feature happy paths that aren't part of the Golden journey. Can ship independently.
 
| QA.md section | Flow | Status |
|---|---|---|
| 🔐 Authentication | Forgot / reset password | 🟥 |
| 🔐 Authentication | Login rate-limit (429 after 5–10/15min) | 🟥 |
| 👥 Workspaces | Switch workspace | 🟥 |
| 📁 Projects | Edit project (`PATCH /projects/:id`, ENH-036) | 🟨 |
| 🧪 Tests Page | Bulk approve / reject | 🟨 (API-only) |
| 🎥 Recorder | Captured action vocabulary (click/dblclick/etc.) | 🟥 |
| ▶️ Runs | Cross-browser (Firefox/WebKit) — DIF-002 | ✅ (UI-runner — `.github/workflows/cross-browser.yml` launches each engine) |
| 🪄 AI Fix | SSE stream consumption | 🟥 |
| ⚡ Automation | Trigger token create / list / revoke | 🟥 |
| ⚡ Automation | Schedule fire | 🟥 |
| 🖼️ Visual Testing | Baseline accept + diff | 🟥 |
| 📊 Dashboard | Empty workspace empty states | 🟥 |
| 🤖 AI Chat | Cross-workspace data-leak refusal | 🟥 |
| ⚙️ Settings | AI provider key save + restore | 🟥 |
| 👤 Account / GDPR | Export + delete | 🟥 |
| 📧 Email Verification | Resend + grandfathering | 🟨 |
| ♻️ Recycle Bin | Restore + purge | 🟥 |
| 🧾 Audit Log | `userId` / `userName` per activity | 🟥 |
| 🔔 Notifications | At-least-one-channel validation | 🟥 |
| 🔒 Security | IDOR + cross-workspace 403 | 🟨 |
| 🚦 Quality Gates (AUTO-012) | CRUD + evaluator + trigger response | 🟥 |
| 📑 Reports / PDF | Dashboard PDF export | 🟥 |
| 🆕 New Project page | SSRF block on private URLs | 🟥 |
| 📋 Runs list | Filter by status / project | 🟥 |
| ☑️ Bulk actions | Keyboard shortcuts (`/`, `a`, `r`, `Esc`) | 🟥 (UI-only) |
| 🪟 Modals | Each modal open / close / submit | 🟥 (UI-only) |
| 📤 API imports | OpenAPI / HAR / `METHOD /path` | 🟥 |
| 🚀 Onboarding tour | First-login flow | 🟥 (UI-only) |
| 🎟️ Demo mode | Per-user quotas | 🟥 |
| ⚙️ Settings → Data | Clear runs / activities / healing | 🟥 |
