import test from "node:test";
import assert from "node:assert/strict";
import { loadParent, parentEventMatters, parentSummary } from "./composer-parent.ts";

const current = { id: "child", parentThreadId: "parent-1" as string | null };
const parent = { id: "parent-1", title: "부모 스레드", titleFallback: "fallback", providerId: "codex" };

test("parent summary keeps only the requested thread's real parent", () => {
  assert.deepEqual(parentSummary("child", current, parent), { id: "parent-1", title: "부모 스레드", providerId: "codex" });
  assert.equal(parentSummary("child", current, { ...parent, title: null }).title, "fallback");
  assert.equal(parentSummary("child", current, { ...parent, title: null, titleFallback: null }).title, "Parent");
  assert.equal(parentSummary("other", current, parent), null);
  assert.equal(parentSummary("child", { id: "child", parentThreadId: null }, parent), null);
  assert.equal(parentSummary("child", current, null), null);
  assert.equal(parentSummary("child", current, { ...parent, id: "late-parent", providerId: "claude" }), null);
  assert.equal(parentEventMatters(["title-changed"]), true);
  assert.equal(parentEventMatters(["thread-deleted"]), true);
  assert.equal(parentEventMatters(["events-appended", "title-changed"]), true);
  assert.equal(parentEventMatters(["events-appended"]), false);
  assert.equal(parentEventMatters(["status-changed"]), false);
  assert.equal(parentEventMatters(["read-state-changed", "tabs-changed", "terminals-changed"]), false);
});

test("a missing or aborted parent fetch does not keep another parent", async () => {
  let calls = 0;
  const get = async () => { calls += 1; return parent; };
  assert.equal(await loadParent(get, "child", { id: "child", parentThreadId: null }, new AbortController().signal), null);
  assert.equal(calls, 0);
  assert.deepEqual(await loadParent(get, "child", current, new AbortController().signal), { id: "parent-1", title: "부모 스레드", providerId: "codex" });
  assert.equal(await loadParent(async () => ({ ...parent, id: "late-parent", providerId: "claude" }), "child", current, new AbortController().signal), null);
  const gone = new AbortController();
  assert.equal(await loadParent(() => Promise.reject(new Error("missing")), "child", current, gone.signal), null);
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(loadParent(() => Promise.reject(new Error("aborted")), "child", current, aborted.signal));
});
