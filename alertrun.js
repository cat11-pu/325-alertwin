// alertrun.js：按处理预算处理并留账
import { alertOf, bumpSuppressed } from "./alerts.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codesOf(spec) {
  return {
    tick: spec.tick_error_code || "E_DUP_TICK",
    key: spec.key_error_code || "E_BAD_KEY",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function validateEvent(event, codes) {
  if (!event || typeof event !== "object" || Array.isArray(event)
      || event.kind !== "alert"
      || typeof event.at !== "number" || !Number.isFinite(event.at)) {
    fail(codes.event, "bad event");
  }
  if (typeof event.key !== "string" || event.key.length === 0) {
    fail(codes.key, "bad key");
  }
}

function markerOf(kind, key, at) {
  return JSON.stringify([kind, key, at]);
}

function cloneState(state) {
  const src = state || {};
  return {
    alerts: (src.alerts || []).map(function (row) { return [row[0], row[1]]; }),
    last: (src.last || []).map(function (row) { return [row[0], row[1]]; }),
    suppressed: (src.suppressed || []).map(function (row) { return [row[0], row[1]]; }),
    ledger: (src.ledger || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    applied: (src.applied || []).slice()
  };
}

function setLast(last, key, at) {
  for (const row of last) {
    if (row[0] === key) { row[1] = at; return; }
  }
  last.push([key, at]);
}

function applyOne(state, kind, key, at, window, codes) {
  const prev = alertOf(state.last, key);
  if (at <= prev) fail(codes.tick, "tick not moving forward");
  if (prev < 0 || at - prev > window) {
    state.alerts.push([key, at]);
  } else {
    state.suppressed = bumpSuppressed(state.suppressed, key);
  }
  setLast(state.last, key, at);
  state.applied.push(markerOf(kind, key, at));
}

export function step(spec) {
  const codes = codesOf(spec);
  const events = Array.isArray(spec.events) ? spec.events : [];
  events.forEach(function (event) { validateEvent(event, codes); });
  const state = cloneState(spec.state);
  const budget = typeof spec.budget === "number" ? spec.budget : 0;
  let served = 0;
  for (const event of events) {
    if (state.applied.indexOf(markerOf(event.kind, event.key, event.at)) >= 0) continue;
    if (served >= budget) {
      state.ledger.push([event.kind, event.key, event.at]);
      continue;
    }
    applyOne(state, event.kind, event.key, event.at, spec.window, codes);
    served += 1;
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return [row[0], row[1], row[2]]; }),
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const codes = codesOf(spec);
  const state = cloneState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const row of pending) {
    if (state.applied.indexOf(markerOf(row[0], row[1], row[2])) >= 0) continue;
    applyOne(state, row[0], row[1], row[2], spec.window, codes);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
