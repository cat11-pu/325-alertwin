import assert from "node:assert";
import { alertOf, bumpSuppressed } from "../alerts.js";
import { step, close } from "../alertrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, window: 10,
  state: { alerts: [], last: [], suppressed: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "alert", key: "a", at: 5 }],
  tick_error_code: "E_DUP_TICK", key_error_code: "E_BAD_KEY",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("alertOf returns a number", () => {
  assert.strictEqual(typeof alertOf([["z", 3]], "z"), "number");
});

check("bumpSuppressed returns rows", () => {
  assert.ok(Array.isArray(bumpSuppressed([], "z")));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
