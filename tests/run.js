import assert from "node:assert";
import { levels, blocking, applyPath, valueOf, cutOf } from "../flow.js";
import { addEdge, round } from "../ops.js";
import { render } from "../app.js";

const base = {
  n: 4, source: 0, sink: 3, edges: [], arcs: [], level: [-1, -1, -1, -1],
  rounds: [], augs: [], cuts: [], cutCap: 0,
  value: 0, bfs: 0, pushes: 0, pushed: 0, blocked: 0, resets: 0
};
const spec = {
  state: base,
  events: [{ kind: "edge", u: 0, v: 3, cap: 2 }, { kind: "round" }]
};

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log("ok " + name);
  } catch (error) {
    failed += 1;
    console.log("FAIL " + name + " :: " + error.message);
  }
}

check("levels 给长度", () => {
  assert.strictEqual(levels(base).length, 4);
});

check("levels 源点层号零", () => {
  const net = addEdge(addEdge(base, 0, 3, 2), 0, 1, 1);
  assert.strictEqual(levels(net)[0], 0);
});

check("blocking 给表", () => {
  assert.ok(Array.isArray(blocking(addEdge(base, 0, 3, 2))));
});

check("applyPath 给网", () => {
  const net = addEdge(addEdge(base, 0, 3, 2), 0, 1, 1);
  assert.ok(Array.isArray(applyPath(net, [0], 1).arcs));
});

check("valueOf 给数", () => {
  assert.strictEqual(typeof valueOf(addEdge(base, 0, 3, 2)), "number");
});

check("cutOf 给三项", () => {
  assert.strictEqual(cutOf(addEdge(base, 0, 3, 2)).length, 3);
});

check("addEdge 追一对弧", () => {
  const net = addEdge(addEdge(base, 0, 3, 2), 0, 1, 1);
  assert.strictEqual(addEdge(net, 1, 3, 2).arcs.length, net.arcs.length + 2);
});

check("round 记一轮", () => {
  assert.strictEqual(round(addEdge(base, 0, 3, 2)).bfs, 1);
});

check("render 数事件", () => {
  assert.strictEqual(render(spec).count_events, 2);
});

console.log("9 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
