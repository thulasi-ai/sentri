# NEXT.md — Current Sprint Target

> **For agents:** Read this file only. Do not read ROADMAP.md unless you need context on items
> beyond the current PR. Everything you need to start work is here.
>
> **For humans:** Update this file when a PR ships. Move the completed item to ROADMAP.md ✅ table,
> promote the next item from the queue below, and rewrite the "Current PR" block.

---

## ▶ Current PR — AUTO-017.3 + PROC-001 (bundled)

**Title:** Web Vitals trend chart + backend-PRs-must-ship-UI convention
**Branch:** `feat/auto-017.3-web-vitals-trend-proc-001`
**Effort:** S (S + XS) | **Priority:** 🔵 Medium
**All dependencies:** AUTO-017.3 needs MET-001 (✅ shipped in PR #14 — `<TrendChart>` + `metric_samples` available); PROC-001 has none

> CAP-004 / MET-001 / PROC-002 ✅ shipped in PR #14 (`<TrendChart>` + `metric_samples` repo + `/healing` dashboard + sprint hand-off scaffold). Both items below are tiny and unrelated in scope, so bundling them into a single PR is cheaper than two separate hand-offs. They touch disjoint files (frontend chart wiring vs. CI workflow + docs) so the diff stays reviewable.

**Do not split this PR.** Codex agents tend to ship the minimum viable slice; this prompt is the explicit instruction to ship both together.

### Scope 1 — AUTO-017.3: Web Vitals trend chart

**UI landing surface (post-PR #6 layout — UI-REFACTOR-001):** Quality Gates / Web Vitals Budgets config no longer lives in `ProjectDetail → Settings` — it was moved exclusively to the Automation page (`/automation`) under the **Quality Gates** top-level tab → per-project accordion → `ProjectQualityCard` → **Web Vitals** inner tab. `QualityGatesPanel` and `WebVitalsBudgetsPanel` both share the new `ConfigurablePanel` abstraction. The trend chart belongs next to the Web Vitals budget-config form inside `ProjectQualityCard`'s Web Vitals tab — do **not** add it to `ProjectDetail.jsx` (no budget config there anymore) or to RunDetail (that's per-run, not per-project trend).

With MET-001 landed (PR #14), add a `<TrendChart metricKey="webVitals.lcp" />` (and one each for CLS / INP / TTFB) inside the Web Vitals tab of `ProjectQualityCard`, backfilled from existing per-run `webVitalsResult`. Threshold lines come from the project's `webVitalsBudgets` so users see violations in context. Pure consumer of MET-001 — no new backend schema beyond a `recordMetric()` callsite in `backend/src/testRunner.js` after `evaluateWebVitalsBudgets()`. Also update the **status chip** logic in `frontend/src/utils/automationStatus.js` (shipped with PR #6) if chip copy needs to reflect trend-chart availability.

**Files:** `backend/src/testRunner.js` (call `recordMetric()` for each Web Vital after the existing `evaluateWebVitalsBudgets()`) · `frontend/src/components/automation/ProjectQualityCard.jsx` (embed `<TrendChart>` inside the Web Vitals inner tab) · `frontend/src/utils/automationStatus.js` + `frontend/tests/automation-status.test.js` (if chip contract changes) · `backend/tests/web-vitals-trend.test.js` (metric-sample ingestion + retrieval)

**Verify before starting:** the component paths above reflect PR #6's changelog. Run `grep -r "WebVitalsBudgetsPanel\|ProjectQualityCard" frontend/src` against the PR's HEAD to confirm the files exist exactly as named before wiring.

### Scope 2 — PROC-001: Require backend PRs to ship UI in the same PR

Docs-only convention change: every new backend route must have its frontend consumer in the same PR (no API-orphan PRs). Update `REVIEW.md`, `AGENT.md`, and the PR template checklist; add a CI check that fails when a PR adds a route to `backend/src/routes/*.js` without touching `frontend/src/api.js` or any `frontend/src/pages/*.jsx`.

**Files:** `REVIEW.md` (new checklist row) · `AGENT.md` (convention section) · `.github/PULL_REQUEST_TEMPLATE.md` (checkbox) · new `.github/workflows/no-orphan-routes.yml` (or extend an existing workflow) · short doc note in `CONTRIBUTING.md`

### PR checklist

- [ ] **Both scopes shipped in one PR — do not split**
- [ ] AUTO-017.3: `<TrendChart>` rendered in Web Vitals tab of `ProjectQualityCard` for LCP / CLS / INP / TTFB with budget threshold lines
- [ ] AUTO-017.3: `recordMetric()` called from `backend/src/testRunner.js` after `evaluateWebVitalsBudgets()` so the table has real data
- [ ] AUTO-017.3: `backend/tests/web-vitals-trend.test.js` covers ingestion + retrieval
- [ ] PROC-001: CI check fails when a PR touches `backend/src/routes/*.js` without `frontend/src/api.js` or any `frontend/src/pages/*.jsx`
- [ ] PROC-001: REVIEW.md, AGENT.md, PR template, CONTRIBUTING.md updated
- [ ] This PR's own NEXT.md / ROADMAP.md / changelog hand-off is performed by `node scripts/promote-sprint-item.mjs --pr <N> --new-item <ID>` (shipped in PR #14). Note: PR #14's own hand-off was done by hand because the script landed in the same PR — verify the script works end-to-end on this PR's hand-off.
- [ ] Add entry to `docs/changelog.md` under `## [Unreleased]`
- [ ] `backend/src/middleware/permissions.json` updated for any new role-gated routes (per REVIEW.md)

---

## ⏭ Queue (next 3 PRs after current)

### 2 · AUTO-003 — Confidence scoring and auto-approval of low-risk tests
**Effort:** M | **Priority:** 🟢 Differentiator | **Dependencies:** none | **Source:** `ROADMAP.md` Phase 4 (AUTO-003)

Every generated test currently requires manual approval (`reviewStatus: 'draft'`). For truly autonomous operation, the system should auto-approve tests above a confidence threshold. A quality score already exists in `backend/src/pipeline/deduplicator.js:226-272` but is never used for approval decisions — expose it as `tests.confidenceScore`, add a per-project `autoApproveThreshold` setting (default: disabled / off), and on generation auto-approve tests above the threshold. Log auto-approvals in the activity trail (`userName: "auto-approver"` so the audit history is honest about how the test got approved). Add a "review auto-approved tests" filter in the Tests page so reviewers can spot-check a sample.

**Files:** `backend/src/pipeline/deduplicator.js` (expose quality score as `confidenceScore` on the test record) · `backend/src/pipeline/testPersistence.js` (auto-approve logic gated on per-project threshold) · `backend/src/database/migrations/` (new `confidenceScore` column on `tests`; new `autoApproveThreshold` column on `projects`) · `backend/src/routes/projects.js` (PATCH `autoApproveThreshold`, registered in `permissions.json`) · `frontend/src/pages/Tests.jsx` (auto-approved filter pill + badge on the test card) · `backend/tests/auto-approval.test.js` (threshold off / threshold on / score-below / score-above / activity-log entry)

**Acceptance criteria:**
- With `autoApproveThreshold: null` (default) every test is still created as a draft — zero behaviour change for existing projects.
- With a threshold set, tests above the score are persisted as `approved` and an activity-log entry is written attributing the approval to the auto-approver pseudo-user.
- The Tests page exposes a "Auto-approved" filter so reviewers can audit the bypass path without trawling activities.

### 3 · AUTO-002 — Change detection / diff-aware crawling
**Effort:** L | **Priority:** 🟢 Differentiator | **Dependencies:** none | **Source:** `ROADMAP.md` Phase 4 (AUTO-002)

Sentri re-crawls the entire site on every run. An autonomous system should detect what changed since the last crawl (new pages, modified DOM, removed elements) and only regenerate tests for affected pages. `backend/src/pipeline/crawlBrowser.js` has no concept of a previous crawl baseline today — this is the difference between "run everything nightly" and "test only what changed," and it's a hard prerequisite for AUTO-004 (test impact analysis from git diff) and the smarter slice of AUTO-001 (risk-based ordering).

After each crawl, store a `crawl_baseline` snapshot per project (page URL → DOM fingerprint hash). On the next crawl, diff against the baseline to identify changed pages. Only run the generation pipeline for changed pages. Emit a `pages_changed` SSE event so the Test Lab live view can show "3 pages changed since last crawl → regenerating only those" instead of a generic progress bar.

**Files:** new `backend/src/pipeline/crawlDiff.js` (DOM fingerprint diff engine — reuse the existing `stateFingerprint.js` hashing, don't invent a new scheme) · `backend/src/pipeline/crawlBrowser.js` (baseline comparison + early-skip for unchanged pages) · `backend/src/database/migrations/` (new `crawl_baselines` table keyed on `(projectId, pageUrl)`) · new `backend/src/database/repositories/crawlBaselineRepo.js` (no raw SQL in the pipeline module per AGENT.md) · `backend/src/routes/runs.js` (expose `changedPages[]` on the run response + SSE event) · `backend/tests/crawl-diff.test.js` (first-crawl baseline creation, unchanged-page skip, changed-page regen, added/removed-page handling, empty-baseline fallback)

**Acceptance criteria:**
- First crawl of a new project behaves identically to today (no baseline to diff against → full crawl + generate).
- Second crawl with no changes emits zero generation calls and completes as `completed_empty` with a `changedPages: []` annotation — no regressed tests, no wasted LLM quota.
- Second crawl with a modified page regenerates tests only for that URL; untouched pages' approved tests survive unchanged.
- Pages removed from the site are surfaced in the run response so reviewers can decide whether to soft-delete their tests.

---

## ✅ Recently completed

| ID | Title | PR |
|----|-------|----|
| CAP-004 + MET-001 + PROC-002 | Self-healing telemetry dashboard (`/healing` page with per-strategy success rate, top-healed selectors, and savings trend) backed by a new `GET /api/v1/healing/summary` route mounted under `requireAuth + workspaceScope` and gated `viewer` in `permissions.json`. Shared time-series metrics: new `metric_samples` migration (016), `metricSamplesRepo`, and a `recordMetric()` helper called from `healingPersistence.js` (resolves projectId via `testRepo.getById` after stripping the `@vN` healing-scope suffix) so the savings trend has real data. Reusable `<TrendChart>` component (`frontend/src/components/shared/TrendChart.jsx`) consumed by the healing dashboard — first integration of MET-001. Sprint hand-off scaffold `scripts/promote-sprint-item.mjs` + `scripts/promote-sprint-item.test.mjs` registered in `backend/tests/run-tests.js` via `../scripts/...` relative path. Tests: `backend/tests/metric-samples.test.js` and `backend/tests/healing-summary.test.js` (empty-data + populated-histogram + 400/404 cases; `workspaceId` omitted to satisfy nullable FK). | #14 |
| CAP-003 | Secret scanner gate on AI-generated Playwright tests. New `backend/src/pipeline/secretScanner.js` runs a `gitleaks`-style scan inside the validate stage (`backend/src/pipeline/testValidator.js`); built-in detectors (AWS access key IDs, JWTs, `Bearer` tokens) plus best-effort `.github/.gitleaks.toml` reuse. Matched tests are rejected, annotated with a redacted finding list (first/last 4 chars only — never plaintext), and the run is flagged via `run.secretScanBlocked = true` in `pipelineOrchestrator.js` so CI consumers can fail the build on regression. Positive + negative fixtures (AWS keys / JWTs / `Bearer` tokens / clean code) in `backend/tests/secret-scanner.test.js`, registered in `backend/tests/run-tests.js`. | #12 |
| UI-REFACTOR-001 | Extract `ConfigurablePanel` abstraction from `QualityGatesPanel` (AUTO-012) + `WebVitalsBudgetsPanel` (AUTO-017) — ~95% structural overlap eliminated. Shipped alongside an Automation page redesign: four top-level WAI-ARIA tabs (**Triggers & Schedules**, **Quality Gates**, **Integrations**, **Snippets**), per-project accordions inside each tab with live status chips (`N tokens` / `Scheduled`, `Gates configured` / `Budgets set`), and a new `frontend/src/utils/automationStatus.js` parser + cache + invalidation bus pinning the backend response shapes (`data.schedule.enabled`, `data.qualityGates`, `data.webVitalsBudgets`) with regression coverage in `frontend/tests/automation-status.test.js`. The legacy ProjectDetail → Settings tab is removed; Quality Gates / Web Vitals Budgets now live exclusively at `/automation`. Frontend-only — no backend, schema, route, or `permissions.json` changes. | #6 |
| UI-REFACTOR-002 | Dedicated **Test Lab** page (`/test-lab`, `/projects/:id/test-lab`) for AI test generation. Three-pane layout (project sidebar | configuration | launch panel) with three tabs: **Crawl & Generate**, **Generate from Requirement**, and **Queue** (cross-project active + recent runs). SSE-driven 8-stage live pipeline with `sessionStorage`-backed persistence so navigating away and back resumes the live view. Tests page "Crawl" / "Generate" quick-action cards now navigate to Test Lab; the legacy `CrawlProjectModal` / `GenerateTestModal` / `TestDials` / `ExploreModePicker` / `CrawlDialsPanel` components are deleted. Sidebar gets a new **Test Lab** entry (`Atom` icon); `Tests` icon swapped to `SquareCheckBig` across sidebar, Dashboard, Projects, Reports, Runs (`TypeBadge`), and the command palette so the test-suite concept reads consistently. `Runs.jsx` `TypeBadge` + type-filter strip now also handle `type: "record"` (recorder sessions previously rendered as plain text via the fallback). New `frontend/src/components/test/TestConfig.jsx` consolidates the dials surface into a sub-tabbed component (Coverage / Discovery / Quality / Advanced) with profile-switch resets that match the legacy `TestDials.applyProfile` semantics. Scoped stylesheet `frontend/src/styles/pages/test-lab.css`. Pure frontend migration — no backend, schema, route, or `permissions.json` changes. | #5 |

*Full completed list → ROADMAP.md § Completed Work*
