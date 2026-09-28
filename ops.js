// ops.js：加边、跑轮与重置（不改入参，一律返回新状态）
import { checkNet, levels, blocking, applyPath, cutOf } from "./flow.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function cloneArcs(arcs) {
  return arcs.map(function (arc) {
    return [arc[0], arc[1], arc[2]];
  });
}

export function addEdge(state, u, v, cap) {
  checkNet(state);
  if (!Number.isInteger(u) || !Number.isInteger(v)
      || u < 0 || u >= state.n || v < 0 || v >= state.n) {
    fail("E_BAD_NODE");
  }
  if (u === v) {
    fail("E_BAD_SELF");
  }
  if (!Number.isInteger(cap) || cap < 0) {
    fail("E_BAD_CAP");
  }
  return {
    ...state,
    edges: state.edges.concat([[u, v, cap]]),
    arcs: state.arcs.concat([[u, v, cap], [v, u, 0]])
  };
}

export function round(state) {
  checkNet(state);
  const lvl = levels(state);
  const bfs = state.bfs + 1;
  if (lvl[state.sink] === -1) {
    const cut = cutOf(state);
    return {
      ...state,
      level: lvl,
      bfs: bfs,
      blocked: state.blocked + 1,
      rounds: state.rounds.concat([[lvl, false, 0, 0]]),
      cuts: cut[1],
      cutCap: cut[2]
    };
  }
  const augRows = blocking(state);
  const net = { ...state, arcs: cloneArcs(state.arcs) };
  let total = 0;
  for (const row of augRows) {
    applyPath(net, row[2], row[1]);
    total += row[1];
  }
  return {
    ...net,
    level: lvl,
    bfs: bfs,
    rounds: state.rounds.concat([[lvl, true, total, augRows.length]]),
    augs: state.augs.concat(augRows),
    pushes: state.pushes + augRows.length,
    pushed: state.pushed + total,
    cuts: [],
    cutCap: 0
  };
}

export function reset(state) {
  checkNet(state);
  const arcs = state.arcs.map(function (arc, idx) {
    if (idx % 2 === 0) {
      return [arc[0], arc[1], state.edges[idx / 2][2]];
    }
    return [arc[0], arc[1], 0];
  });
  return {
    ...state,
    edges: state.edges.map(function (edge) {
      return [edge[0], edge[1], edge[2]];
    }),
    arcs: arcs,
    level: new Array(state.n).fill(-1),
    rounds: [],
    augs: [],
    cuts: [],
    cutCap: 0,
    value: 0,
    bfs: 0,
    pushes: 0,
    pushed: 0,
    blocked: 0,
    resets: state.resets + 1
  };
}
