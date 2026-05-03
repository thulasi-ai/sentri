import assert from "node:assert/strict";
import * as healingRepo from "../src/database/repositories/healingRepo.js";

healingRepo.set("TC-999::click::Submit", { strategyIndex: 1, succeededAt: new Date().toISOString(), failCount: 2 });
const d = healingRepo.getByTestId("TC-999");
assert.ok(d["click::Submit"]);
console.log("healing-summary.test passed");
