// flow.js：残量弧对网上的分层、阻塞流与最小割（基线：一律给空）
function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function nonNegInt(value) {
  return Number.isInteger(value) && value >= 0;
}

export function checkNet(net) {
  if (!net || typeof net !== "object") {
    fail("E_BAD_TERMINAL");
  }
  const n = net.n;
  const edges = net.edges;
  const arcs = net.arcs;
  if (!Number.isSafeInteger(n) || n < 0 || !Array.isArray(edges) || !Array.isArray(arcs)) {
    fail("E_BAD_EDGE");
  }
  if (arcs.length !== 2 * edges.length) {
    fail("E_BAD_EDGE");
  }
  for (let k = 0; k < edges.length; k += 1) {
    const edge = edges[k];
    const fwd = arcs[2 * k];
    const rev = arcs[2 * k + 1];
    if (!Array.isArray(edge) || edge.length !== 3) {
      fail("E_BAD_EDGE");
    }
    const u = edge[0];
    const v = edge[1];
    const cap = edge[2];
    if (!Number.isSafeInteger(u) || u < 0 || u >= n
        || !Number.isSafeInteger(v) || v < 0 || v >= n
        || u === v
        || !nonNegInt(cap)) {
      fail("E_BAD_EDGE");
    }
    if (!Array.isArray(fwd) || fwd.length !== 3
        || !Array.isArray(rev) || rev.length !== 3
        || fwd[0] !== u || fwd[1] !== v
        || rev[0] !== v || rev[1] !== u) {
      fail("E_BAD_EDGE");
    }
  }
  if (!Number.isSafeInteger(net.source) || net.source < 0 || net.source >= n
      || !Number.isSafeInteger(net.sink) || net.sink < 0 || net.sink >= n
      || net.source === net.sink) {
    fail("E_BAD_TERMINAL");
  }
  return net;
}

export function levels(net) {
  checkNet(net);
  const n = net.n;
  const level = new Array(n).fill(-1);
  const queue = [net.source];
  level[net.source] = 0;
  let head = 0;
  while (head < queue.length) {
    const u = queue[head];
    head += 1;
    for (let a = 0; a < net.arcs.length; a += 1) {
      const arc = net.arcs[a];
      if (arc[0] !== u || arc[2] <= 0) {
        continue;
      }
      if (level[arc[1]] === -1) {
        level[arc[1]] = level[u] + 1;
        queue.push(arc[1]);
      }
    }
  }
  return level;
}

export function blocking(net) {
  checkNet(net);
  const level = levels(net);
  const { source, sink, arcs } = net;
  const residual = arcs.map(function (arc) {
    return arc[2];
  });
  const cursor = new Array(net.n).fill(0);
  const out = [];
  for (let u = 0; u < net.n; u += 1) {
    const list = [];
    for (let a = 0; a < arcs.length; a += 1) {
      if (arcs[a][0] === u) {
        list.push(a);
      }
    }
    out.push(list);
  }
  const rows = [];
  const nodePath = [source];
  const arcPath = [];
  while (true) {
    const u = nodePath[nodePath.length - 1];
    if (u === sink) {
      let bottleneck = Infinity;
      for (const a of arcPath) {
        if (residual[a] < bottleneck) {
          bottleneck = residual[a];
        }
      }
      rows.push([nodePath.slice(), bottleneck, arcPath.slice()]);
      for (const a of arcPath) {
        residual[a] -= bottleneck;
        residual[a ^ 1] += bottleneck;
      }
      nodePath.length = 1;
      arcPath.length = 0;
      continue;
    }
    const list = out[u];
    if (cursor[u] < list.length) {
      const a = list[cursor[u]];
      const v = arcs[a][1];
      if (residual[a] > 0 && level[v] === level[u] + 1) {
        arcPath.push(a);
        nodePath.push(v);
      } else {
        cursor[u] += 1;
      }
      continue;
    }
    if (u === source) {
      break;
    }
    const cameBy = arcPath.pop();
    nodePath.pop();
    const prev = nodePath[nodePath.length - 1];
    cursor[prev] = out[prev].indexOf(cameBy) + 1;
  }
  return rows;
}

export function applyPath(net, arcPath, amount) {
  checkNet(net);
  if (!Array.isArray(arcPath) || arcPath.length === 0) {
    fail("E_BAD_EDGE");
  }
  for (let spot = 0; spot < arcPath.length; spot += 1) {
    const a = arcPath[spot];
    if (!Number.isSafeInteger(a) || a < 0 || a >= net.arcs.length) {
      fail("E_BAD_EDGE");
    }
    if (spot > 0 && net.arcs[a][0] !== net.arcs[arcPath[spot - 1]][1]) {
      fail("E_BAD_EDGE");
    }
  }
  if (net.arcs[arcPath[arcPath.length - 1]][1] !== net.sink) {
    fail("E_BAD_EDGE");
  }
  let bottleneck = Infinity;
  for (const a of arcPath) {
    if (net.arcs[a][2] < bottleneck) {
      bottleneck = net.arcs[a][2];
    }
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > bottleneck) {
    fail("E_BAD_AMOUNT");
  }
  for (const a of arcPath) {
    net.arcs[a][2] -= amount;
    net.arcs[a ^ 1][2] += amount;
  }
  net.value = valueOf(net);
  return net;
}

export function valueOf(net) {
  checkNet(net);
  let value = 0;
  net.edges.forEach(function (edge, k) {
    const flow = net.arcs[2 * k + 1][2];
    if (edge[0] === net.source) {
      value += flow;
    }
    if (edge[1] === net.source) {
      value -= flow;
    }
  });
  return value;
}

export function cutOf(net) {
  checkNet(net);
  const reach = new Array(net.n).fill(0);
  reach[net.source] = 1;
  const queue = [net.source];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head];
    head += 1;
    for (let a = 0; a < net.arcs.length; a += 1) {
      const arc = net.arcs[a];
      if (arc[0] === u && arc[2] > 0 && !reach[arc[1]]) {
        reach[arc[1]] = 1;
        queue.push(arc[1]);
      }
    }
  }
  const cuts = [];
  let cutCap = 0;
  net.edges.forEach(function (edge) {
    if (reach[edge[0]] && !reach[edge[1]]) {
      cuts.push([edge[0], edge[1]]);
      cutCap += edge[2];
    }
  });
  return [reach, cuts, cutCap];
}
