// app.js：渲染结果
import { alertOf, bumpSuppressed } from "./alerts.js";
import { step, close } from "./alertrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      alerts: state.alerts, last: state.last, suppressed: state.suppressed,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { alerts: closed.state.alerts.map(function (pair) { return [pair[0], pair[1]]; }),
           suppressed: closed.state.suppressed.map(function (row) { return [row[0], row[1]]; }),
           last: closed.state.last.map(function (row) { return [row[0], row[1]]; }),
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: alertOf([["z", 3]], "z") + bumpSuppressed([], "z").length };
}
