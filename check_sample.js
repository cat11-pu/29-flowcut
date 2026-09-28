import fs from "node:fs";
import { checkNet, levels, blocking, applyPath, valueOf, cutOf } from "./flow.js";
import { addEdge, round, reset } from "./ops.js";
import { applyEvent } from "./app.js";
import { capOk, consOk, roundsOk, cutOk, ledgerOk } from "./audit.js";

const __lines = [];
function emit(label, value) {
  __lines.push([String(label), value]);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/flow.json", "utf8"));
const events = spec.events || [];
const base = spec.state;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(list, start) {
  let state = copy(start || base);
  let failed = 0;
  for (const event of list) {
    try {
      state = applyEvent(state, event);
    } catch (error) {
      failed += 1;
    }
  }
  return { state: state, failed: failed };
}

function fingerprint(state) {
  return JSON.stringify([state.edges, state.arcs, state.level, state.rounds, state.augs,
                         state.cuts, state.cutCap, state.value, state.bfs, state.pushes,
                         state.pushed, state.blocked, state.resets]);
}

function augPath(state, index) {
  const row = (state.augs || [])[index];
  return row && Array.isArray(row[2]) && row[2].length > 0 ? row[2] : null;
}

const whole = run(events);
const state = whole.state;
const half = Math.ceil(events.length / 2);
const part = run(events.slice(0, half));
const tail = run(events.slice(half), part.state);
const replay = run(events);

emit("边表", state.edges);
emit("残量弧表", state.arcs);
emit("层号", state.level);
emit("流量值", state.value);
emit("轮次流水", state.rounds);
emit("每轮增广条数", (state.rounds || []).map(function (row) { return row[3]; }));
emit("每轮推量", (state.rounds || []).map(function (row) { return row[2]; }));
emit("增广流水", (state.augs || []).map(function (row) { return [row[0], row[1]]; }));
emit("增广弧路", (state.augs || []).map(function (row) { return row[2]; }));
emit("最小割边集", state.cuts);
emit("割容量", state.cutCap);
emit("可达集", cutOf(state)[0]);
emit("计数", [state.bfs, state.pushes, state.pushed, state.blocked]);
emit("重置次数", state.resets);
emit("弧对自洽", capOk(state));
emit("守恒自洽", consOk(state));
emit("轮次自洽", roundsOk(state));
emit("割自洽", cutOk(state));
emit("增广账自洽", ledgerOk(state));

function keepsNetOnFailure() {
  const probe = copy(state);
  const before = fingerprint(probe);
  let raised = false;
  try {
    addEdge(probe, 1, 1, 2);
  } catch (error) {
    raised = true;
  }
  if (!raised) {
    return 0;
  }
  return fingerprint(probe) === before ? 1 : 0;
}

function keepsInput() {
  const probe = copy(state);
  const before = fingerprint(probe);
  let grown = null;
  try {
    grown = addEdge(probe, 4, 5, 2);
  } catch (error) {
    return 0;
  }
  if (fingerprint(probe) !== before) {
    return 0;
  }
  if (!grown || !Array.isArray(grown.edges) || grown.edges.length !== (probe.edges || []).length + 1) {
    return 0;
  }
  return 1;
}

emit("失败不动网", keepsNetOnFailure());
emit("原状不动", keepsInput());
emit("重放不新增", fingerprint(replay.state) === fingerprint(state) ? 0 : 1);
emit("重放报错", replay.failed);
emit("中态不同", fingerprint(part.state) !== fingerprint(state));
emit("拆两轮一致", fingerprint(tail.state) === fingerprint(state) && tail.failed === whole.failed - part.failed);
emit("异常事件数", whole.failed);

function emptyRound() {
  const net = { n: 6, source: 0, sink: 5, edges: [], arcs: [],
                level: [-1, -1, -1, -1, -1, -1], rounds: [], augs: [], cuts: [], cutCap: 0,
                value: 0, bfs: 0, pushes: 0, pushed: 0, blocked: 0, resets: 0 };
  const after = round(net);
  const cut = cutOf(after);
  return [after.value, cut[1], cut[2], after.blocked];
}

emit("空网空割", emptyRound());

// ---- 错误路径探针：真调用实现，看它报出什么码 ----
try {
  addEdge(state, 1, 7, 2);
  emit("坏端点", "没有报错");
} catch (error) {
  emit("坏端点", error && error.code ? error.code : String(error.message));
}
try {
  addEdge(state, 2, 2, 1);
  emit("自环", "没有报错");
} catch (error) {
  emit("自环", error && error.code ? error.code : String(error.message));
}
try {
  addEdge(state, 1, 3, -1);
  emit("负容量", "没有报错");
} catch (error) {
  emit("负容量", error && error.code ? error.code : String(error.message));
}
try {
  addEdge(state, 1, 3, 1.5);
  emit("小数容量", "没有报错");
} catch (error) {
  emit("小数容量", error && error.code ? error.code : String(error.message));
}
try {
  addEdge(state, 1, 3);
  emit("缺容量", "没有报错");
} catch (error) {
  emit("缺容量", error && error.code ? error.code : String(error.message));
}
try {
  const probe = copy(state);
  probe.source = 2;
  probe.sink = 2;
  levels(probe);
  emit("源汇相同", "没有报错");
} catch (error) {
  emit("源汇相同", error && error.code ? error.code : String(error.message));
}
try {
  const probe = copy(state);
  probe.arcs = probe.arcs.slice(0, probe.arcs.length - 1);
  levels(probe);
  emit("弧表残缺", "没有报错");
} catch (error) {
  emit("弧表残缺", error && error.code ? error.code : String(error.message));
}
const heldPath = augPath(state, 0);
if (heldPath === null) {
  emit("超量推送", "没有弧路");
  emit("断链弧路", "没有弧路");
} else {
  try {
    let small = Infinity;
    for (const a of heldPath) {
      small = Math.min(small, state.arcs[a][2]);
    }
    applyPath(state, heldPath, small + 1);
    emit("超量推送", "没有报错");
  } catch (error) {
    emit("超量推送", error && error.code ? error.code : String(error.message));
  }
  try {
    applyPath(state, [heldPath[0], heldPath[0]], 1);
    emit("断链弧路", "没有报错");
  } catch (error) {
    emit("断链弧路", error && error.code ? error.code : String(error.message));
  }
}

// ---- 期望值（参考模型算出）----
const EXPECTED = {
  "边表": [
    [
      0,
      1,
      1
    ],
    [
      0,
      2,
      3
    ],
    [
      1,
      3,
      3
    ],
    [
      2,
      3,
      3
    ],
    [
      1,
      4,
      1
    ],
    [
      4,
      2,
      2
    ],
    [
      3,
      5,
      3
    ],
    [
      4,
      5,
      1
    ]
  ],
  "残量弧表": [
    [
      0,
      1,
      0
    ],
    [
      1,
      0,
      1
    ],
    [
      0,
      2,
      0
    ],
    [
      2,
      0,
      3
    ],
    [
      1,
      3,
      3
    ],
    [
      3,
      1,
      0
    ],
    [
      2,
      3,
      0
    ],
    [
      3,
      2,
      3
    ],
    [
      1,
      4,
      0
    ],
    [
      4,
      1,
      1
    ],
    [
      4,
      2,
      2
    ],
    [
      2,
      4,
      0
    ],
    [
      3,
      5,
      0
    ],
    [
      5,
      3,
      3
    ],
    [
      4,
      5,
      0
    ],
    [
      5,
      4,
      1
    ]
  ],
  "层号": [
    0,
    -1,
    -1,
    -1,
    -1,
    -1
  ],
  "流量值": 4,
  "轮次流水": [
    [
      [
        0,
        1,
        1,
        2,
        2,
        3
      ],
      true,
      3,
      2
    ],
    [
      [
        0,
        3,
        1,
        2,
        4,
        5
      ],
      true,
      1,
      1
    ],
    [
      [
        0,
        -1,
        -1,
        -1,
        -1,
        -1
      ],
      false,
      0,
      0
    ],
    [
      [
        0,
        -1,
        -1,
        -1,
        -1,
        -1
      ],
      false,
      0,
      0
    ]
  ],
  "每轮增广条数": [
    2,
    1,
    0,
    0
  ],
  "每轮推量": [
    3,
    1,
    0,
    0
  ],
  "增广流水": [
    [
      [
        0,
        1,
        3,
        5
      ],
      1
    ],
    [
      [
        0,
        2,
        3,
        5
      ],
      2
    ],
    [
      [
        0,
        2,
        3,
        1,
        4,
        5
      ],
      1
    ]
  ],
  "增广弧路": [
    [
      0,
      4,
      12
    ],
    [
      2,
      6,
      12
    ],
    [
      2,
      6,
      5,
      8,
      14
    ]
  ],
  "最小割边集": [
    [
      0,
      1
    ],
    [
      0,
      2
    ]
  ],
  "割容量": 4,
  "可达集": [
    1,
    0,
    0,
    0,
    0,
    0
  ],
  "计数": [
    4,
    3,
    4,
    2
  ],
  "重置次数": 1,
  "弧对自洽": true,
  "守恒自洽": true,
  "轮次自洽": true,
  "割自洽": true,
  "增广账自洽": true,
  "失败不动网": 1,
  "原状不动": 1,
  "重放不新增": 0,
  "重放报错": 6,
  "中态不同": true,
  "拆两轮一致": true,
  "异常事件数": 6,
  "空网空割": [
    0,
    [],
    0,
    1
  ],
  "坏端点": "E_BAD_NODE",
  "自环": "E_BAD_SELF",
  "负容量": "E_BAD_CAP",
  "小数容量": "E_BAD_CAP",
  "缺容量": "E_BAD_CAP",
  "源汇相同": "E_BAD_TERMINAL",
  "弧表残缺": "E_BAD_EDGE",
  "超量推送": "E_BAD_AMOUNT",
  "断链弧路": "E_BAD_EDGE"
};
function __same(got, want) {
  if (typeof got === "string") {
    try {
      const parsed = JSON.parse(got);
      if (JSON.stringify(parsed) === JSON.stringify(want)) {
        return true;
      }
    } catch (error) {
      return JSON.stringify(got) === JSON.stringify(want);
    }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find(function (pair) { return pair[0] === label; });
  if (!found) {
    __bad += 1;
    console.log("缺失验收项 " + label);
    continue;
  }
  if (__same(found[1], want)) {
    console.log("一致 " + label + " = " + JSON.stringify(found[1]));
  } else {
    __bad += 1;
    console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1]));
  }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
