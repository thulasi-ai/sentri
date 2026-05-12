import test from "node:test";
import assert from "node:assert/strict";
import { computeImpactedTests, routePrefixesForChangedFiles } from "../src/pipeline/impactAnalysis.js";
import { scoreTestRisk } from "../src/pipeline/riskScorer.js";

const tests = [
  { id: "checkout", name: "Checkout", sourceUrl: "https://app.example.com/checkout/cart" },
  { id: "account", name: "Account", sourceUrl: "https://app.example.com/account" },
  { id: "search", name: "Search", sourceUrl: "https://app.example.com/search" },
];

test("file paths route to matching sourceUrl tests", () => {
  const impact = computeImpactedTests({
    tests,
    changedFiles: ["src/checkout/CartPage.tsx"],
    changedPages: [],
  });
  assert.deepEqual(impact.impactedTestIds, ["checkout"]);
  assert.equal(impact.fallbackReason, null);
  assert.ok(impact.routePrefixes.includes("/checkout"));
});

test("empty changedFiles falls back to current full-suite behaviour", () => {
  const impact = computeImpactedTests({ tests, changedFiles: [], changedPages: [] });
  assert.deepEqual(impact.impactedTestIds, ["checkout", "account", "search"]);
  assert.equal(impact.fallbackReason, "no_changed_files");
});

test("unknown file paths produce an empty no-impact subset", () => {
  const impact = computeImpactedTests({ tests, changedFiles: ["docs/README.md", "backend/src/database/migrations/022.sql"] });
  assert.deepEqual(impact.impactedTestIds, []);
  assert.equal(impact.fallbackReason, "no_impact");
});

test("changedPages merges with file-derived routes", () => {
  const impact = computeImpactedTests({
    tests,
    changedFiles: ["src/checkout/CartPage.tsx"],
    changedPages: ["https://app.example.com/account"],
  });
  assert.deepEqual(impact.impactedTestIds, ["checkout", "account"]);
});

test("route-map override can map component files to custom routes", () => {
  const impact = computeImpactedTests({
    tests,
    changedFiles: ["frontend/src/components/SearchBox.jsx"],
    routeMap: { "frontend/src/components/SearchBox.jsx": ["/search"] },
  });
  assert.deepEqual(impact.impactedTestIds, ["search"]);
  assert.deepEqual(routePrefixesForChangedFiles(["frontend/src/components/SearchBox.jsx"], {
    "frontend/src/components/SearchBox.jsx": "/search",
  }), ["/search"]);
});

test("GitHub PR-files fetch failure is represented as full-suite fallback", () => {
  const impact = computeImpactedTests({ tests, changedFiles: null, changedPages: [] });
  assert.deepEqual(impact.impactedTestIds, ["checkout", "account", "search"]);
  assert.equal(impact.fallbackReason, "no_changed_files");
});

test("changedFiles add a file-affinity risk boost that composes with changedPages", () => {
  const subject = { id: "checkout", sourceUrl: "https://app.example.com/checkout/cart" };
  const base = scoreTestRisk(subject, []);
  const fileBoost = scoreTestRisk(subject, [], { changedFiles: ["src/checkout/CartPage.tsx"] });
  const combined = scoreTestRisk(subject, [], {
    changedFiles: ["src/checkout/CartPage.tsx"],
    changedPages: ["https://app.example.com/checkout"],
  });
  assert.ok(fileBoost > base);
  assert.ok(combined > fileBoost);
});
