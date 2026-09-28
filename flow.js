// flow.js：残量弧对网上的分层、阻塞流与最小割
function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isInt(value) {
  return Number.isInteger(value);
}

export function checkNet(net) {
  if (!net || typeof net !== "object") {
    fail("E_BAD_EDGE");
  }
  const n = net.n;
  const edges = net.edges;
  const arcs = net.arcs;
  if (!isInt(n) || n < 0 || !Array.isArray(edges) || !Array.isArray(arcs)) {
    fail("E_BAD_EDGE");
  }
  if (arcs.length !== 2 * edges.length) {
    fail("E_BAD_EDGE");
  }
  for (let k = 0; k < edges.length; k += 1) {
    const edge = edges[k];
    if (!Array.isArray(edge) || edge.length !== 3) {
      fail("E_BAD_EDGE");
    }
    const u = edge[0];
    const v = edge[1];
    const cap = edge[2];
    if (!isInt(u) || !isInt(v) || u < 0 || u >= n || v < 0 || v >= n || u === v) {
      fail("E_BAD_EDGE");
    }
    if (!isInt(cap) || cap < 0) {
      fail("E_BAD_EDGE");
    }
    const fwd = arcs[2 * k];
    const rev = arcs[2 * k + 1];
    if (!Array.isArray(fwd) || fwd.length !== 3 || !Array.isArray(rev) || rev.length !== 3) {
      fail("E_BAD_EDGE");
    }
    if (fwd[0] !== u || fwd[1] !== v || rev[0] !== v || rev[1] !== u) {
      fail("E_BAD_EDGE");
    }
    if (typeof fwd[2] !== "number" || typeof rev[2] !== "number"
        || fwd[2] < 0 || rev[2] < 0 || fwd[2] + rev[2] !== cap) {
      fail("E_BAD_EDGE");
    }
  }
  const source = net.source;
  const sink = net.sink;
  if (!isInt(source) || !isInt(sink)
      || source < 0 || source >= n || sink < 0 || sink >= n || source === sink) {
    fail("E_BAD_TERMINAL");
  }
  return net;
}

function outLists(net) {
  const out = [];
  for (let i = 0; i < net.n; i += 1) {
    out.push([]);
  }
  for (let a = 0; a < net.arcs.length; a += 1) {
    out[net.arcs[a][0]].push(a);
  }
  return out;
}

export function levels(net) {
  checkNet(net);
  const n = net.n;
  const arcs = net.arcs;
  const out = outLists(net);
  const lvl = new Array(n).fill(-1);
  const queue = [net.source];
  lvl[net.source] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const u = queue[head];
    for (const a of out[u]) {
      const w = arcs[a][1];
      if (arcs[a][2] > 0 && lvl[w] === -1) {
        lvl[w] = lvl[u] + 1;
        queue.push(w);
      }
    }
  }
  return lvl;
}

export function blocking(net) {
  checkNet(net);
  const arcs = net.arcs;
  const source = net.source;
  const sink = net.sink;
  const lvl = levels(net);
  const rows = [];
  if (lvl[sink] === -1) {
    return rows;
  }
  const out = outLists(net);
  const residual = arcs.map(function (arc) {
    return arc[2];
  });
  const cursor = new Array(net.n).fill(0);
  let nodes = [source];
  let path = [];
  while (true) {
    const u = nodes[nodes.length - 1];
    const list = out[u];
    let moved = false;
    while (cursor[u] < list.length) {
      const a = list[cursor[u]];
      const w = arcs[a][1];
      if (residual[a] > 0 && lvl[w] === lvl[u] + 1) {
        nodes.push(w);
        path.push(a);
        moved = true;
        if (w === sink) {
          let bottleneck = Infinity;
          for (const used of path) {
            if (residual[used] < bottleneck) {
              bottleneck = residual[used];
            }
          }
          rows.push([nodes.slice(), bottleneck, path.slice()]);
          for (const used of path) {
            residual[used] -= bottleneck;
            residual[used ^ 1] += bottleneck;
          }
          nodes = [source];
          path = [];
        }
        break;
      }
      cursor[u] += 1;
    }
    if (!moved) {
      if (u === source) {
        break;
      }
      nodes.pop();
      path.pop();
      const parent = nodes[nodes.length - 1];
      cursor[parent] += 1;
    }
  }
  return rows;
}

export function applyPath(net, arcPath, amount) {
  checkNet(net);
  if (!Array.isArray(arcPath) || arcPath.length === 0) {
    fail("E_BAD_EDGE");
  }
  let headNode = null;
  for (const a of arcPath) {
    if (!isInt(a) || a < 0 || a >= net.arcs.length) {
      fail("E_BAD_EDGE");
    }
    const arc = net.arcs[a];
    if (headNode !== null && arc[0] !== headNode) {
      fail("E_BAD_EDGE");
    }
    headNode = arc[1];
  }
  if (headNode !== net.sink) {
    fail("E_BAD_EDGE");
  }
  if (!isInt(amount) || amount <= 0) {
    fail("E_BAD_AMOUNT");
  }
  let smallest = Infinity;
  for (const a of arcPath) {
    if (net.arcs[a][2] < smallest) {
      smallest = net.arcs[a][2];
    }
  }
  if (amount > smallest) {
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
  const source = net.source;
  let value = 0;
  for (let k = 0; k < net.edges.length; k += 1) {
    const flow = net.arcs[2 * k + 1][2];
    const edge = net.edges[k];
    if (edge[0] === source) {
      value += flow;
    } else if (edge[1] === source) {
      value -= flow;
    }
  }
  return value;
}

export function cutOf(net) {
  checkNet(net);
  const n = net.n;
  const arcs = net.arcs;
  const reachable = new Array(n).fill(0);
  const queue = [net.source];
  reachable[net.source] = 1;
  for (let head = 0; head < queue.length; head += 1) {
    const u = queue[head];
    for (let a = 0; a < arcs.length; a += 1) {
      const w = arcs[a][1];
      if (arcs[a][0] === u && arcs[a][2] > 0 && reachable[w] === 0) {
        reachable[w] = 1;
        queue.push(w);
      }
    }
  }
  const cuts = [];
  let capacity = 0;
  for (const edge of net.edges) {
    if (reachable[edge[0]] === 1 && reachable[edge[1]] === 0) {
      cuts.push([edge[0], edge[1]]);
      capacity += edge[2];
    }
  }
  return [reachable, cuts, capacity];
}
