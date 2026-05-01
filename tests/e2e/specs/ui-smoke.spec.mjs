import { test, expect } from '../utils/playwright.mjs';
import { isReachable } from '../utils/environment.mjs';
import * as userRepo from '../../../backend/src/database/repositories/userRepo.js';
import * as verificationTokenRepo from '../../../backend/src/database/repositories/verificationTokenRepo.js';
import { loginWithRetry, registerUser } from '../utils/auth.mjs';
import { SessionClient } from '../utils/session.mjs';

test.describe('Sentri UI smoke (login route)', () => {
  test.skip(process.env.RUN_UI_E2E !== 'true', 'Set RUN_UI_E2E=true to run browser UI coverage.');

  test.beforeEach(async ({ page, baseURL }) => {
    const ok = await isReachable(`${baseURL}/login`);
    test.skip(!ok, `Frontend is not reachable at ${baseURL}.`);
  });

  test('login page renders core controls', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i }).first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/artifacts/login-page.png', fullPage: true });
  });

  test('invalid credentials show an error state', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('invalid-user@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('bad-password');
    await page.getByRole('button', { name: /login|sign in/i }).first().click();

    await expect(page.getByText(/invalid|incorrect|failed|error/i).first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/artifacts/login-invalid.png', fullPage: true });
  });

  test('verified user can sign in and land on dashboard with workspace visible', async ({ page, request }) => {
    const api = new SessionClient(request);
    const { email, password } = await registerUser(request);
    const user = userRepo.getByEmail(email);
    const tokenRow = verificationTokenRepo.getUnusedByUserId(user.id);

    const verifyResponse = await api.call('get', `/api/v1/auth/verify?token=${encodeURIComponent(tokenRow.token)}`);
    expect(verifyResponse.status()).toBe(200);

    const loginResponse = await loginWithRetry(request, email, password);
    if (loginResponse.status() === 429) test.skip(true, 'Rate-limited in shared local environment');
    expect(loginResponse.status()).toBe(200);

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|login/i }).first().click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/workspace/i).first()).toBeVisible();
  });
});
