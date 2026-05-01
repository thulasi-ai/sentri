import { test, expect } from '../utils/playwright.mjs';
import { isReachable } from '../utils/environment.mjs';

/**
 * UI E2E coverage for AUTO-012 Quality Gates.
 *
 * Drives the browser through:
 *   1. ProjectDetail → Settings tab → QualityGatesPanel save round-trip
 *   2. Runs list → GateBadge renders for a run with gateResult
 *   3. RunDetail → inline violation panel renders when gateResult.passed === false
 *
 * API calls in `beforeAll` are scaffolding only (register + seed project + run
 * with a failing gateResult) — every ✅ assertion is `expect(page.…)` against
 * the rendered DOM, per `tests/e2e/COVERAGE.md` § UI-only policy.
 */
test.describe('Quality Gates UI (AUTO-012)', () => {
  test.skip(process.env.RUN_UI_E2E !== 'true', 'Set RUN_UI_E2E=true to run browser UI coverage.');

  let projectId;
  let runId;
  let cookieHeader;

  test.beforeAll(async ({ request, baseURL }) => {
    const ok = await isReachable(`${baseURL}/login`);
    if (!ok) return;

    const email = `qa-gates-${Date.now()}@example.com`;
    const password = 'Password123!';

    // Scaffolding: register a verified user + project via API so the UI test
    // can jump straight to the Settings panel.
    await request.post('/api/auth/register', { data: { name: 'QA', email, password } });
    const login = await request.post('/api/auth/login', { data: { email, password } });
    cookieHeader = login.headers()['set-cookie'] || '';

    const project = await request.post('/api/v1/projects', {
      data: { name: 'Gates Project', url: 'https://example.com' },
    });
    if (project.ok()) projectId = (await project.json()).id;

    // Seed a failing run directly so RunDetail has a gateResult to render.
    // (Production flow goes through testRunner; for UI coverage we just need
    // a persisted row with `gateResult.passed === false`.)
    if (projectId) {
      const seed = await request.post(`/api/v1/projects/${projectId}/__seed-run`, {
        data: { gateResult: { passed: false, violations: [{ rule: 'minPassRate', threshold: 95, actual: 90 }] } },
      }).catch(() => null);
      if (seed?.ok()) runId = (await seed.json()).id;
    }
  });

  test('Settings → Quality Gates panel saves and persists', async ({ page, baseURL }) => {
    test.skip(!projectId, 'API scaffolding unavailable.');
    const ok = await isReachable(`${baseURL}/login`);
    test.skip(!ok, 'Frontend not reachable.');

    await page.goto(`/projects/${projectId}`);
    await page.getByRole('tab', { name: /settings/i }).click();

    await expect(page.getByRole('heading', { name: /quality gates/i })).toBeVisible();
    await page.getByLabel(/min pass rate/i).fill('95');
    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByText(/quality gates saved/i)).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: /settings/i }).click();
    await expect(page.getByLabel(/min pass rate/i)).toHaveValue('95');
    await expect(page.getByText(/active/i).first()).toBeVisible();
  });

  test('Runs list shows the GateBadge for failing gates', async ({ page }) => {
    test.skip(!runId, 'Seed run unavailable.');
    await page.goto('/runs');
    await expect(page.getByText(/Gates ✗/).first()).toBeVisible();
  });

  test('RunDetail renders the violation panel', async ({ page }) => {
    test.skip(!runId, 'Seed run unavailable.');
    await page.goto(`/runs/${runId}`);

    await expect(page.getByText(/quality gate failed/i)).toBeVisible();
    await expect(page.getByText(/minPassRate/)).toBeVisible();
    await expect(page.getByText(/threshold.*95/i)).toBeVisible();
  });
});
