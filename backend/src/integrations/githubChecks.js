/**
 * @module integrations/githubChecks
 * @description GitHub App Check Run client with cached installation tokens (INT-002).
 */

import crypto from "node:crypto";

const CHECK_NAME = process.env.GITHUB_CHECK_NAME || "Sentri QA";
const API_BASE = process.env.GITHUB_API_BASE || "https://api.github.com";
const TOKEN_REFRESH_SKEW_MS = 60_000;
const tokenCache = new Map();

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function getPrivateKey() {
  const key = process.env.GITHUB_APP_PRIVATE_KEY || "";
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function createAppJwt(now = Math.floor(Date.now() / 1000)) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = getPrivateKey();
  if (!appId || !privateKey) throw new Error("GitHub App credentials are not configured");
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

async function githubFetch(path, { method = "GET", token, body, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${API_BASE}${path}`, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "sentri-github-checks",
      "X-GitHub-Api-Version": "2022-11-28",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Clear cached installation tokens. Intended for tests.
 * @returns {void}
 */
export function clearInstallationTokenCache() {
  tokenCache.clear();
}

/**
 * Return a cached GitHub App installation token, refreshing before expiry.
 *
 * @param {string|number} installationId
 * @param {Object} [options]
 * @param {Function} [options.fetchImpl]
 * @returns {Promise<string>}
 */
export async function getInstallationToken(installationId, { fetchImpl = fetch } = {}) {
  if (!installationId) throw new Error("GitHub installationId is required");
  const cacheKey = String(installationId);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs - TOKEN_REFRESH_SKEW_MS > Date.now()) return cached.token;

  const jwt = createAppJwt();
  const data = await githubFetch(`/app/installations/${encodeURIComponent(cacheKey)}/access_tokens`, {
    method: "POST",
    token: jwt,
    fetchImpl,
  });
  const expiresAtMs = Date.parse(data.expires_at || "");
  tokenCache.set(cacheKey, {
    token: data.token,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 50 * 60_000,
  });
  return data.token;
}

function parseRepo(repo) {
  const [owner, name] = String(repo || "").split("/");
  if (!owner || !name) throw new Error("GitHub repo must be in owner/name format");
  return { owner, name };
}

/**
 * Create a queued GitHub Check Run.
 *
 * @param {string} runId
 * @param {Object} args
 * @param {string} args.repo
 * @param {string} args.sha
 * @param {string|number} args.installationId
 * @param {Object} [options]
 * @returns {Promise<Object>} GitHub check-run payload.
 */
export async function createPending(runId, { repo, sha, installationId }, options = {}) {
  const { owner, name } = parseRepo(repo);
  const token = await getInstallationToken(installationId, options);
  return githubFetch(`/repos/${owner}/${name}/check-runs`, {
    method: "POST",
    token,
    fetchImpl: options.fetchImpl || fetch,
    body: {
      name: CHECK_NAME,
      head_sha: sha,
      status: "queued",
      external_id: runId,
      details_url: buildRunUrl(runId),
    },
  });
}

/**
 * Mark an existing GitHub Check Run in progress.
 *
 * @param {string|number} checkRunId
 * @param {Object} args
 * @param {string} args.repo
 * @param {string|number} args.installationId
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function markInProgress(checkRunId, { repo, installationId }, options = {}) {
  const { owner, name } = parseRepo(repo);
  const token = await getInstallationToken(installationId, options);
  return githubFetch(`/repos/${owner}/${name}/check-runs/${encodeURIComponent(checkRunId)}`, {
    method: "PATCH",
    token,
    fetchImpl: options.fetchImpl || fetch,
    body: { status: "in_progress", started_at: new Date().toISOString() },
  });
}

/**
 * Conclude an existing GitHub Check Run.
 *
 * @param {string|number} checkRunId
 * @param {Object} args
 * @param {string} args.repo
 * @param {string|number} args.installationId
 * @param {"success"|"failure"|"neutral"} args.conclusion
 * @param {string} args.summaryMd
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function conclude(checkRunId, { repo, installationId, conclusion, summaryMd }, options = {}) {
  const { owner, name } = parseRepo(repo);
  const token = await getInstallationToken(installationId, options);
  return githubFetch(`/repos/${owner}/${name}/check-runs/${encodeURIComponent(checkRunId)}`, {
    method: "PATCH",
    token,
    fetchImpl: options.fetchImpl || fetch,
    body: {
      status: "completed",
      conclusion,
      completed_at: new Date().toISOString(),
      output: { title: "Sentri QA results", summary: summaryMd || "Sentri run completed." },
    },
  });
}

/**
 * Build an absolute Run Detail URL for GitHub's details link.
 *
 * @param {string} runId
 * @returns {string|undefined}
 */
export function buildRunUrl(runId) {
  const base = process.env.APP_URL || process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "";
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/runs/${encodeURIComponent(runId)}`;
}
