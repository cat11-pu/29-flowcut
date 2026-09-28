// audit.js：五条不变量（给定，不写）
import { valueOf, cutOf } from "./flow.js";

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function capOk(state) {
  try {
    const edges = state.edges || [];
    const arcs = state.arcs || [];
    if (arcs.length !== 2 * edges.length) {
      return false;
    }
    for (let k = 0; k < edges.length; k += 1) {
      const edge = edges[k];
      const fwd = arcs[2 * k];
      const rev = arcs[2 * k + 1];
      if (!Array.isArray(edge) || edge.length !== 3) {
        return false;
      }
      if (!Array.isArray(fwd) || fwd.length !== 3 || !Array.isArray(rev) || rev.length !== 3) {
        return false;
      }
      if (fwd[0] !== edge[0] || fwd[1] !== edge[1] || rev[0] !== edge[1] || rev[1] !== edge[0]) {
        return false;
      }
      if (typeof fwd[2] !== "number" || typeof rev[2] !== "number") {
        return false;
      }
      if (fwd[2] < 0 || rev[2] < 0 || fwd[2] + rev[2] !== edge[2]) {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function consOk(state) {
  try {
    const n = state.n;
    const bal = [];
    for (let i = 0; i < n; i += 1) {
      bal.push(0);
    }
    const edges = state.edges || [];
    const arcs = state.arcs || [];
    if (arcs.length !== 2 * edges.length) {
      return false;
    }
    for (let k = 0; k < edges.length; k += 1) {
      const edge = edges[k];
      const flow = edge[2] - arcs[2 * k][2];
      bal[edge[0]] -= flow;
      bal[edge[1]] += flow;
    }
    if (bal[state.source] !== -state.value) {
      return false;
    }
    if (bal[state.sink] !== state.value) {
      return false;
    }
    for (let i = 0; i < n; i += 1) {
      if (i === state.source || i === state.sink) {
        continue;
      }
      if (bal[i] !== 0) {
        return false;
      }
    }
    return state.value === valueOf(state);
  } catch (error) {
    return false;
  }
}

export function roundsOk(state) {
  try {
    const rounds = state.rounds || [];
    if (rounds.length !== state.bfs) {
      return false;
    }
    let count = 0;
    let pushed = 0;
    for (const row of rounds) {
      if (!Array.isArray(row) || row.length !== 4) {
        return false;
      }
      if (typeof row[1] !== "boolean") {
        return false;
      }
      if (!Array.isArray(row[0]) || row[0].length !== state.n) {
        return false;
      }
      if (row[1] !== (row[0][state.sink] >= 0)) {
        return false;
      }
      if (row[1]) {
        if (!Number.isInteger(row[3]) || row[3] < 1) {
          return false;
        }
      } else if (row[3] !== 0 || row[2] !== 0) {
        return false;
      }
      count += row[3];
      pushed += row[2];
    }
    return count === state.pushes && pushed === state.pushed;
  } catch (error) {
    return false;
  }
}

export function cutOk(state) {
  try {
    const rounds = state.rounds || [];
    const last = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const blocked = !!(last && last[1] === false);
    if (!blocked) {
      return (state.cuts || []).length === 0 && state.cutCap === 0;
    }
    const cut = cutOf(state);
    return same(state.cuts || [], cut[1]) && state.cutCap === cut[2] && state.cutCap === state.value;
  } catch (error) {
    return false;
  }
}

export function ledgerOk(state) {
  try {
    const augs = state.augs || [];
    if (augs.length !== state.pushes) {
      return false;
    }
    for (const row of augs) {
      if (!Array.isArray(row) || row.length !== 3) {
        return false;
      }
      const nodes = row[0];
      const amount = row[1];
      const path = row[2];
      if (!Array.isArray(nodes) || !Array.isArray(path)) {
        return false;
      }
      if (nodes.length !== path.length + 1) {
        return false;
      }
      if (nodes[0] !== state.source || nodes[nodes.length - 1] !== state.sink) {
        return false;
      }
      if (!Number.isInteger(amount) || amount < 1) {
        return false;
      }
      for (let spot = 0; spot < path.length; spot += 1) {
        const a = path[spot];
        if (!Number.isInteger(a) || a < 0 || a >= (state.arcs || []).length) {
          return false;
        }
        const arc = state.arcs[a];
        if (arc[0] !== nodes[spot] || arc[1] !== nodes[spot + 1]) {
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}
