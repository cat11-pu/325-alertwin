// alertrun.js：按处理预算处理并留账
import { alertOf, bumpSuppressed } from "./alerts.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    tick: spec.tick_error_code || "E_DUP_TICK",
    key: spec.key_error_code || "E_BAD_KEY",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function validateEvent(event, c) {
  if (!event || typeof event !== "object" || event.kind !== "alert"
      || typeof event.at !== "number" || !Number.isFinite(event.at)) {
    fail(c.event, "事件结构不合法");
  }
  if (typeof event.key !== "string" || event.key.length === 0) {
    fail(c.key, "键名必须是非空字符串");
  }
}

function copyState(state) {
  state = state || {};
  return {
    alerts: (state.alerts || []).map(function (row) { return [row[0], row[1]]; }),
    last: (state.last || []).map(function (row) { return [row[0], row[1]]; }),
    suppressed: (state.suppressed || []).map(function (row) { return [row[0], row[1]]; }),
    ledger: (state.ledger || []).map(function (event) { return Object.assign({}, event); }),
    applied: (state.applied || []).slice()
  };
}

function setLast(last, key, at) {
  const rows = last.map(function (row) { return [row[0], row[1]]; });
  for (const row of rows) {
    if (row[0] === key) { row[1] = at; return rows; }
  }
  rows.push([key, at]);
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
  return rows;
}

function alreadyApplied(state, event) {
  return event.id !== undefined && state.applied.indexOf(event.id) !== -1;
}

function applyEvent(state, event, spec, c) {
  const lastAt = alertOf(state.last, event.key);
  if (event.at <= lastAt) fail(c.tick, "时刻不往前走");
  if (lastAt === -1 || event.at - lastAt > spec.window) {
    state.alerts.push([event.key, event.at]);
  } else {
    state.suppressed = bumpSuppressed(state.suppressed, event.key);
  }
  state.last = setLast(state.last, event.key, event.at);
  if (event.id !== undefined) state.applied.push(event.id);
}

export function step(spec) {
  const c = codes(spec);
  const events = spec.events || [];
  const state = copyState(spec.state);
  // 先校验，与预算无关：入队事件全部过一遍结构与键名检查
  events.forEach(function (event) { validateEvent(event, c); });
  let budget = typeof spec.budget === "number" ? spec.budget : 0;
  const queue = state.ledger.concat(events);
  const pending = [];
  let served = 0;
  for (const event of queue) {
    if (alreadyApplied(state, event)) continue;
    if (budget > 0) {
      budget -= 1;
      applyEvent(state, event, spec, c);
      served += 1;
    } else {
      pending.push(event);
    }
  }
  state.ledger = pending;
  return {
    state: state,
    served: served,
    ledger_before: pending.length,
    ledger: pending.map(function (event) { return [event.kind, event.key, event.at]; }),
    judged: served,
    judged_bound: queue.length
  };
}

export function close(spec) {
  const c = codes(spec);
  const state = copyState(spec.state);
  const queue = state.ledger;
  let catchup = 0;
  for (const event of queue) {
    validateEvent(event, c);
    if (alreadyApplied(state, event)) continue;
    applyEvent(state, event, spec, c);
    catchup += 1;
  }
  state.ledger = [];
  return { state: state, catchup: catchup };
}
