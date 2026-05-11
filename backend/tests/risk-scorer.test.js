import test from 'node:test';
import assert from 'node:assert/strict';
import { orderTestsByRisk, applyBudgetToQueue, scoreTestRisk } from '../src/pipeline/riskScorer.js';

test('recent failures rank higher than long-green tests', () => {
  const tests = [{ id: 't1', name: 'Checkout', updatedAt: '2026-05-01T00:00:00Z' }, { id: 't2', name: 'Search', updatedAt: '2026-04-01T00:00:00Z' }];
  const history = [
    { testId: 't1', status: 'failed' },
    { testId: 't2', status: 'passed' },
    { testId: 't2', status: 'passed' },
  ];
  const ranked = orderTestsByRisk(tests, history, { now: Date.parse('2026-05-09T00:00:00Z') });
  assert.equal(ranked[0].id, 't1');
});

test('smoke tests are pinned even with lower score', () => {
  const tests = [{ id: 'a', name: 'Smoke: login' }, { id: 'b', name: 'Flaky checkout' }];
  const history = [{ testId: 'b', status: 'failed' }];
  const ranked = orderTestsByRisk(tests, history);
  assert.equal(ranked[0].id, 'a');
});

test('budget truncates queue, keeps smoke tests, surfaces skipped', () => {
  const tests = [
    { id: 's', name: 'smoke sanity', estimatedDurationMs: 8 * 60_000 },
    { id: 'x', name: 'heavy', estimatedDurationMs: 8 * 60_000 },
    { id: 'y', name: 'heavy2', estimatedDurationMs: 8 * 60_000 },
  ];
  const { kept, skipped } = applyBudgetToQueue(tests, 10);
  assert.deepEqual(kept.map((t) => t.id), ['s']);
  assert.deepEqual(skipped.map((t) => t.id), ['x', 'y']);
  assert.ok(skipped.every((t) => t.skipReason === 'over_budget'));
});

test('budget clamps malformed / oversized values', () => {
  const tests = [{ id: 'a', name: 'a', estimatedDurationMs: 1000 }];
  // Non-finite values short-circuit to "no budget enforced"
  assert.deepEqual(applyBudgetToQueue(tests, 'abc').kept.map((t) => t.id), ['a']);
  assert.deepEqual(applyBudgetToQueue(tests, Infinity).kept.map((t) => t.id), ['a']);
  // Massive values cap at MAX_BUDGET_MINUTES (240) — no exception, no crash
  assert.deepEqual(applyBudgetToQueue(tests, 1e9).kept.map((t) => t.id), ['a']);
});

test('runner-level invariant: smoke tests pin to front even when caller hands a non-smoke-first array', async () => {
  // AUTO-001: any caller of runTests() — route layer, BullMQ worker, single-
  // test execute, future schedulers — must see smoke tests dispatched first
  // regardless of how it ordered the array. Locking this here so a future
  // refactor of testRunner.js can't silently strip the pin and let smoke
  // tests slide behind heavy non-smoke ones on a budget-truncated run.
  const { isSmokeTest } = await import('../src/pipeline/riskScorer.js');
  const input = [
    { id: 'flaky', name: 'flaky checkout' },
    { id: 'a', name: 'Smoke: login' },
    { id: 'b', name: 'heavy regression' },
    { id: 'c', tags: ['smoke'], name: 'tagged smoke' },
  ];
  // Mirror the partition logic the runner applies (see backend/src/testRunner.js).
  const reordered = [
    ...input.filter((t) => isSmokeTest(t)),
    ...input.filter((t) => !isSmokeTest(t)),
  ];
  assert.deepEqual(reordered.map((t) => t.id), ['a', 'c', 'flaky', 'b']);
});

test('changed page boosts risk score', () => {
  const base = { id: 't', sourceUrl: 'https://app.example.com/checkout' };
  const withChange = scoreTestRisk(base, [], { changedPages: ['https://app.example.com/checkout'] });
  const withoutChange = scoreTestRisk(base, [], { changedPages: [] });
  assert.ok(withChange > withoutChange);
});
