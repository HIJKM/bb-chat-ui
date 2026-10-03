import assert from "node:assert/strict";
import test from "node:test";

import { listIndexForTick, tickWidth } from "./thread-toc.ts";

test("gives the tick under the pointer the long hover length", () => {
  assert.equal(tickWidth(0), 32);
});

test("keeps a distant tick at the longer rest length", () => {
  assert.equal(tickWidth(48), 10);
  assert.equal(tickWidth(80), 10);
});

test("shortens ticks as they get farther from the pointer", () => {
  const near = tickWidth(8);
  const mid = tickWidth(24);
  assert.ok(near < 32);
  assert.ok(near > mid);
  assert.ok(mid > 10);
});

test("maps a tick onto the same list row when every message has a tick", () => {
  assert.equal(listIndexForTick(0, 5, 5), 0);
  assert.equal(listIndexForTick(2, 5, 5), 2);
  assert.equal(listIndexForTick(4, 5, 5), 4);
});

test("maps sampled ticks across a longer message list", () => {
  assert.equal(listIndexForTick(0, 3, 7), 0);
  assert.equal(listIndexForTick(1, 3, 7), 3);
  assert.equal(listIndexForTick(2, 3, 7), 6);
});
