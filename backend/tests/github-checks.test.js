import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  findGreenBaseRun,
  getRegressedFailures,
  renderGithubCheckSummary,
  conclusionForRun,
} from '../src/utils/runResultFormatters.js';
import {
  clearInstallationTokenCache,
  createPending,
  conclude,
} from '../src/integrations/githubChecks.js';

const { privateKey: TEST_PRIVATE_KEY } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PRIVATE_KEY = TEST_PRIVATE_KEY.export({ type: 'pkcs1', format: 'pem' });

function makeFetch(calls) {
  return async (url, opts) => {
    calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null });
    if (String(url).includes('/access_tokens')) {
      return { ok: true, json: async () => ({ token: 'inst-token', expires_at: new Date(Date.now() + 3600_000).toISOString() }) };
    }
    return { ok: true, json: async () => ({ id: 123, status: opts.method === 'POST' ? 'queued' : 'completed' }) };
  };
}

test('payload shape creates queued check and uses cached installation token', async () => {
  process.env.GITHUB_APP_ID = '1';
  process.env.GITHUB_APP_PRIVATE_KEY = PRIVATE_KEY;
  clearInstallationTokenCache();
  const calls = [];
  await createPending('RUN-1', { repo: 'acme/app', sha: 'abc', installationId: '99' }, { fetchImpl: makeFetch(calls) });
  await conclude(123, { repo: 'acme/app', installationId: '99', conclusion: 'success', summaryMd: 'ok' }, { fetchImpl: makeFetch(calls) });
  assert.equal(calls.filter((c) => String(c.url).includes('/access_tokens')).length, 1);
  assert.equal(calls[1].body.status, 'queued');
  assert.equal(calls[1].body.head_sha, 'abc');
  assert.equal(calls[2].body.conclusion, 'success');
});

test('regressed diff includes failures that were green on the base run only', () => {
  const run = { results: [
    { testId: 'a', testName: 'A', status: 'failed' },
    { testId: 'b', testName: 'B', status: 'failed' },
  ] };
  const baseRun = { results: [
    { testId: 'a', status: 'passed' },
    { testId: 'b', status: 'failed' },
  ] };
  const diff = getRegressedFailures(run, baseRun);
  assert.equal(diff.fallback, false);
  assert.deepEqual(diff.tests.map((t) => t.testId), ['a']);
});

test('fallback path lists all failing tests when no green base run exists', () => {
  const run = { results: [
    { testId: 'a', status: 'failed' },
    { testId: 'b', status: 'passed' },
  ] };
  const diff = getRegressedFailures(run, null);
  assert.equal(diff.fallback, true);
  assert.deepEqual(diff.tests.map((t) => t.testId), ['a']);
  assert.match(renderGithubCheckSummary({ ...run, passed: 1, failed: 1, total: 2 }), /No green base run/);
});

test('findGreenBaseRun is bounded and matches repo plus base SHA', () => {
  const runs = [
    { type: 'test_run', status: 'completed', failed: 1, githubCheck: { repo: 'acme/app', sha: 'base' }, results: [] },
    { type: 'test_run', status: 'completed', failed: 0, githubCheck: { repo: 'acme/app', sha: 'base' }, results: [{ testId: 'a', status: 'passed' }] },
  ];
  assert.equal(findGreenBaseRun(runs, 'base', 'acme/app'), runs[1]);
  assert.equal(findGreenBaseRun(runs, 'other', 'acme/app'), null);
});

test('summary renders Web Vitals violations separately and conclusion fails', () => {
  const run = {
    passed: 2,
    failed: 0,
    total: 2,
    results: [],
    webVitalsResult: { passed: false, violations: ['LCP exceeded budget'] },
  };
  const md = renderGithubCheckSummary(run, { baseRun: { results: [] }, runUrl: 'https://sentri/runs/RUN-1' });
  assert.match(md, /Web Vitals budget violations/);
  assert.match(md, /LCP exceeded budget/);
  assert.equal(conclusionForRun(run), 'failure');
});

test('GitHub 5xx surfaces to caller so integration hook can log and swallow', async () => {
  process.env.GITHUB_APP_ID = '1';
  process.env.GITHUB_APP_PRIVATE_KEY = PRIVATE_KEY;
  clearInstallationTokenCache();
  await assert.rejects(
    () => createPending('RUN-2', { repo: 'acme/app', sha: 'abc', installationId: '99' }, {
      fetchImpl: async () => ({ ok: false, status: 502, statusText: 'Bad Gateway', text: async () => 'bad' }),
    }),
    /GitHub API 502/,
  );
});
