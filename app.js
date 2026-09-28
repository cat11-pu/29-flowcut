// app.js：把事件流跑成剖面台要用的视图（给定，不写）
import { addEdge, round, reset } from "./ops.js";
import { capOk, consOk, roundsOk, cutOk, ledgerOk } from "./audit.js";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function badEvent() {
  const error = new Error("E_BAD_EVENT");
  error.code = "E_BAD_EVENT";
  return error;
}

export function applyEvent(state, event) {
  if (!event || typeof event.kind !== "string") {
    throw badEvent();
  }
  if (event.kind === "edge") {
    return addEdge(state, event.u, event.v, event.cap);
  }
  if (event.kind === "round") {
    return round(state);
  }
  if (event.kind === "reset") {
    return reset(state);
  }
  throw badEvent();
}

export function render(spec) {
  let state = copy(spec.state);
  const steps = [];
  const stepOk = [];
  const stepKind = [];
  const roundSteps = [];
  const events = spec.events || [];
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    let applied = null;
    try {
      applied = applyEvent(state, event);
    } catch (error) {
      applied = null;
    }
    stepOk.push(applied !== null);
    stepKind.push(event && typeof event.kind === "string" ? event.kind : "?");
    if (applied !== null) {
      state = applied;
      if (event.kind === "round") {
        roundSteps.push(index + 1);
      }
    }
    steps.push(copy(state));
  }
  return {
    n: state.n,
    source: state.source,
    sink: state.sink,
    edges: state.edges,
    arcs: state.arcs,
    level: state.level,
    rounds: state.rounds,
    augs: state.augs,
    cuts: state.cuts,
    cutCap: state.cutCap,
    value: state.value,
    bfs: state.bfs,
    pushes: state.pushes,
    pushed: state.pushed,
    blocked: state.blocked,
    resets: state.resets,
    cap_ok: capOk(state),
    cons_ok: consOk(state),
    rounds_ok: roundsOk(state),
    cut_ok: cutOk(state),
    ledger_ok: ledgerOk(state),
    steps: steps,
    step_ok: stepOk,
    step_kind: stepKind,
    round_steps: roundSteps,
    count_events: events.length,
    failed_events: stepOk.filter(function (flag) { return !flag; }).length,
    last_round: state.rounds.length > 0 ? state.rounds[state.rounds.length - 1] : null
  };
}
