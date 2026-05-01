## Coverage & Backlog
 
This section is the **single source of truth for what's automated vs. still manual**. Mirrors `QA.md`'s Golden E2E Happy Path (51 steps, `QA.md:240-340`) and per-feature happy paths. When a step is automated, link the spec; when not, mark `🟥` so the next agent knows where to add coverage.
 
> **For agents:** read the **Backlog** below first. Pick the top item, write the spec under `tests/e2e/specs/`, flip the row to ✅ in the same PR. Use `tests/e2e/utils/auth.mjs` + `tests/e2e/utils/session.mjs` — never inline auth or CSRF logic in a spec.
>
> **For humans:** when shipping a user-facing feature, add at least one ✅ row here in the same PR (per `REVIEW.md` § Mandatory Test Requirements). The backfill queue itself is tracked as `MNT-012 — E2E coverage backfill` in `ROADMAP.md`.
 
### Status legend
 
- ✅ **Fully automated** — happy path covered, runs in CI on every PR
- 🟨 **Partial** — endpoint contract covered; gaps called out in the row
- 🟥 **Not automated** — only manual coverage in `QA.md`
- ⏭️ **Out of scope** — deliberately manual-only (e.g. outbound notifications)
 
### 🚀 Backlog — next 5 to automate
 
Pick the top item. Each is sized to fit one PR (1–3 specs, ≤ 200 LOC each). Replace this list as items ship.
 
1. **Crawl — link mode** (`QA.md` §4 step 6) → new `tests/e2e/specs/crawl.spec.mjs` covering `POST /api/v1/projects/:id/crawl` against `https://www.example.com`; assert run reaches `completed` / `completed_empty` and `pagesFound > 0`.
2. **Generate — AI test from approved crawl** (`QA.md` §5 step 8–9) → extend `crawl.spec.mjs` or split into `generate.spec.mjs`; assert the `tests` table populates with at least 1 Draft entry.
3. **Run regression with parallelism** (`QA.md` §9 step 20–22) → new `tests/e2e/specs/run-regression.spec.mjs` covering `POST /api/v1/projects/:id/run` with `dialsConfig.parallelWorkers: 2`; assert per-test results return.
4. **Visual baseline accept** (`QA.md` §11 step 27–29) → new `tests/e2e/specs/visual-baseline.spec.mjs` covering `POST /tests/:testId/baselines/:stepNumber/accept` round-trip and 403 for viewer.
5. **Quality gates evaluation** (`QA.md` § Quality Gates) → new `tests/e2e/specs/quality-gates.spec.mjs`; configure `{ minPassRate: 95 }`, run a 90%-pass suite, assert `gateResult.passed === false` on the trigger status response.
 
Why these five: highest-value flows currently lacking automated coverage, with zero file overlap so up to 5 agents can ship in parallel without conflicts.
 
### 🌟 Golden E2E Happy Path coverage
 
| QA.md ref | Step / flow | Spec | Status |
|---|---|---|---|
| §1 step 1–3 | Auth — register & verify (email link) | `api-auth.spec.mjs` :: *register creates user and login is blocked until verification* | ✅ |
| §1 step 1–3 | Auth — wrong-password rejection | `api-auth.spec.mjs` :: *login negative path with bad password* | ✅ |
| §2 step 4 | Workspace — invite collaborator | — | 🟥 |
| §3 step 5 | Project — create | `full-functional-api.spec.mjs` :: *verify account, login, project+test CRUD happy path* | ✅ |
| §4 step 6 | Crawl — link mode | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (contract only) |
| §4 step 7 | Crawl — state exploration | — | 🟥 |
| §5 step 8–9 | Generate — AI test draft creation | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (contract only) |
| §6 step 10–12 | Recorder — start/stop session | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (start/stop only) |
| §7 step 13–15 | Review — approve / reject test | `functional-areas.spec.mjs` :: *project tests workflow: create, approve/reject/restore, export, run* | ✅ |
| §8 step 16–19 | Edit — Steps ↔ Source diff/preview | — | 🟥 |
| §9 step 20–22 | Run — execute regression | — | 🟥 |
| §10 step 23–26 | AI Fix — manual flow | `functional-areas.spec.mjs` :: *crawl + generate + recorder + ai-fix/chat endpoint contracts* | 🟨 (apply-fix only) |
| §11 step 27–29 | Visual baseline — first run + accept | — | 🟥 |
| §12 step 30–34 | Run results / artifacts / reports | — | 🟥 |
| §13 step 35 | Notifications — Teams/email/webhook fire | — | ⏭️ (outbound side-effects mocked at unit level) |
| §14 step 36–38 | Automation — CI/CD trigger token + cron schedule | `full-functional-api.spec.mjs` :: *session security: logout revokes access and missing CSRF blocks mutation* | 🟨 (CSRF only) |
| §15 step 39–41 | Export — Zephyr / TestRail / Playwright ZIP | `functional-areas.spec.mjs` :: *project tests workflow: create, approve/reject/restore, export, run* | 🟨 (Zephyr/TestRail only) |
| §16 step 42–44 | AI Chat — multi-turn + export | — | 🟥 |
| §17 step 45 | Dashboard — pass-rate / defect breakdown | — | 🟥 |
| §18 step 46–47 | Recycle bin — soft-delete + restore + audit log | — | 🟥 |
| §19 step 48–49 | Account / GDPR — export + delete | — | 🟥 |
| §20 step 50–51 | Permissions — viewer 403, outsider 403 | `full-functional-api.spec.mjs` :: *negative validations for project/test inputs* | 🟨 (negative path only) |
 
### 🧪 Per-feature flows (`QA.md` § Functional Test Areas)
 
Per-feature happy paths that aren't part of the Golden journey. Can ship independently.
 
| QA.md section | Flow | Status |
|---|---|---|
| 🔐 Authentication | Forgot / reset password | 🟥 |
| 🔐 Authentication | Login rate-limit (429 after 5–10/15min) | 🟥 |
| 👥 Workspaces | Switch workspace | 🟥 |
| 📁 Projects | Edit project (`PATCH /projects/:id`, ENH-036) | 🟨 |
| 🧪 Tests Page | Bulk approve / reject | ✅ |
| 🎥 Recorder | Captured action vocabulary (click/dblclick/etc.) | 🟥 |
| ▶️ Runs | Cross-browser (Firefox/WebKit) — DIF-002 | ✅ (`.github/workflows/cross-browser.yml`) |
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
