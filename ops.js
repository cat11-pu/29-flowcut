// ops.js：加边、跑轮与重置（基线：一律原样返回）
import { checkNet, levels, blocking, applyPath, cutOf } from "./flow.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function nonNegInt(value) {
  return Number.isInteger(value) && value >= 0;
}

function clone(state) {
  const next = { ...state };
  next.edges = (state.edges || []).map(function (edge) { return edge.slice(); });
  next.arcs = (state.arcs || []).map(function (arc) { return arc.slice(); });
  next.level = (state.level || []).slice();
  next.rounds = (state.rounds || []).map(function (row) {
    return [row[0].slice(), row[1], row[2], row[3]];
  });
  next.augs = (state.augs || []).map(function (row) {
    return [row[0].slice(), row[1], row[2].slice()];
  });
  next.cuts = (state.cuts || []).map(function (pair) { return pair.slice(); });
  return next;
}

export function addEdge(state, u, v, cap) {
  checkNet(state);
  if (!Number.isSafeInteger(u) || u < 0 || u >= state.n
      || !Number.isSafeInteger(v) || v < 0 || v >= state.n) {
    fail("E_BAD_NODE");
  }
  if (u === v) {
    fail("E_BAD_SELF");
  }
  if (!nonNegInt(cap)) {
    fail("E_BAD_CAP");
  }
  const next = clone(state);
  next.edges.push([u, v, cap]);
  next.arcs.push([u, v, cap], [v, u, 0]);
  return next;
}

export function round(state) {
  checkNet(state);
  const next = clone(state);
  next.bfs += 1;
  const level = levels(next);
  next.level = level;
  if (level[next.sink] === -1) {
    const cut = cutOf(next);
    next.cuts = cut[1];
    next.cutCap = cut[2];
    next.blocked += 1;
    next.rounds.push([level.slice(), false, 0, 0]);
    return next;
  }
  const rows = blocking(next);
  let pushed = 0;
  for (const row of rows) {
    applyPath(next, row[2], row[1]);
    next.augs.push([row[0].slice(), row[1], row[2].slice()]);
    next.pushes += 1;
    next.pushed += row[1];
    pushed += row[1];
  }
  next.cuts = [];
  next.cutCap = 0;
  next.rounds.push([level.slice(), true, pushed, rows.length]);
  return next;
}

export function reset(state) {
  checkNet(state);
  const next = clone(state);
  next.arcs = [];
  next.edges.forEach(function (edge, k) {
    next.arcs[2 * k] = [edge[0], edge[1], edge[2]];
    next.arcs[2 * k + 1] = [edge[1], edge[0], 0];
  });
  next.level = new Array(next.n).fill(-1);
  next.rounds = [];
  next.augs = [];
  next.cuts = [];
  next.cutCap = 0;
  next.value = 0;
  next.bfs = 0;
  next.pushes = 0;
  next.pushed = 0;
  next.blocked = 0;
  next.resets += 1;
  return next;
}
