import assert from "node:assert/strict";
import { createTestContext } from "./helpers/test-base.js";

const t = createTestContext();

async function main() {
  t.resetDb();
  const env = t.setupEnv({ SKIP_EMAIL_VERIFICATION: "true" });
  const server = t.app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const { token } = await t.registerAndLogin(base, {
      name: "QA", email: "qa@example.com", password: "Password123!",
    });

    const created = await t.req(base, "/api/v1/projects", { method: "POST", token, body: { name: "P", url: "https://example.com" } });
    const pid = created.json.id;

    let out = await t.req(base, `/api/v1/projects/${pid}/quality-gates`, { method: "PATCH", token, body: { minPassRate: 95 } });
    assert.equal(out.res.status, 200);
    assert.equal(out.json.qualityGates.minPassRate, 95);

    out = await t.req(base, `/api/v1/projects/${pid}/quality-gates`, { method: "GET", token });
    assert.equal(out.res.status, 200);
    assert.equal(out.json.qualityGates.minPassRate, 95);
  } finally {
    env.restore();
    await new Promise(r => server.close(r));
  }
}

main().then(() => console.log("quality-gates.test.js passed")).catch((e) => { console.error(e); process.exit(1); });
