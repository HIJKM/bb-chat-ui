import test from "node:test";
import assert from "node:assert/strict";
import { diffPresentation, readWorkspaceDiff } from "./workspace-diff-data.ts";

const commit = { sha:"abc123456789", shortSha:"abc1234", subject:"saved work" };
function workspace(branch = "feature/chat", count = 8, baseRef:string | null = "base-sha") {
  return {
    branch:{ currentBranch:branch as string | null, defaultBranch:"main" },
    checkout:{ headSha:"head-sha" },
    workingTree:{ insertions:0, deletions:0, files:[] as { path:string; status:string; insertions:number; deletions:number }[] },
    mergeBase:{ insertions:900, deletions:60, files:[], aheadCount:count, baseRef, mergeBaseBranch:"refs/remotes/origin/main", commits:[commit] },
  };
}
function reader(branch = "feature/chat", prCount = 8, unpushedCount = 3) {
  const calls:string[] = [];
  return { calls, sdk:{
    async status(args:{ mergeBaseBranch?:string }) {
      const ref = args.mergeBaseBranch;
      calls.push(ref ?? "HEAD");
      const w = workspace(branch, ref?.endsWith(branch) ? unpushedCount : prCount);
      if (ref) w.mergeBase.mergeBaseBranch = ref;
      return { outcome:"available", workspace:w };
    },
    async pullRequest() { return { outcome:"absent" }; },
  } };
}

test("feature snapshot compares PR base and origin branch separately using aheadCount, not the list length", async () => {
  const f = reader();
  const snapshot = await readWorkspaceDiff(f.sdk, "env_test", undefined, new AbortController().signal);
  assert.ok(snapshot);
  assert.equal(snapshot.detail.commitCount, 8);
  assert.equal(snapshot.detail.unpushedCount, 3);
  assert.equal(snapshot.detail.baseRef, "origin/main");
  assert.equal(snapshot.detail.unpushedRef, "origin/feature/chat");
  assert.equal(snapshot.detail.commits.length, 1, "a limited commit list does not change the count");
  assert.equal(snapshot.presentation.label, "feature/chat · 8 commits");
  assert.equal(snapshot.presentation.label.includes("↑"), false);
  assert.equal(snapshot.insertions, 0);
  assert.deepEqual(snapshot.detail.files, []);
  assert.deepEqual(new Set(f.calls), new Set(["HEAD", "refs/remotes/origin/main", "refs/remotes/origin/feature/chat"]));
});

test("main and master show only origin ahead counts and hide clean zero states", async () => {
  for (const branch of ["main", "master"]) {
    const f = reader(branch, 99, 3);
    const snapshot = await readWorkspaceDiff(f.sdk, "env_test", undefined, new AbortController().signal);
    assert.ok(snapshot);
    assert.equal(snapshot.presentation.label, "↑3");
    assert.equal(snapshot.detail.commitKind, "unpushed");
    assert.equal(f.calls.filter(ref => ref !== "HEAD").length, 1, "reuse the same remote comparison");
    f.sdk.status = async args => {
      const w = workspace(branch, 0);
      if (args.mergeBaseBranch) w.mergeBase.mergeBaseBranch = args.mergeBaseBranch;
      return { outcome:"available", workspace:w };
    };
    assert.equal((await readWorkspaceDiff(f.sdk, "env_test", undefined, new AbortController().signal))?.presentation.visible, false);
  }
});

test("an open PR base overrides the environment base; closed PRs do not", async () => {
  const f = reader();
  const sdk = { ...f.sdk, async pullRequest() { return { outcome:"available", pullRequest:{ state:"open", baseRefName:"develop", headRefName:"feature/chat" } }; } };
  const s = await readWorkspaceDiff(sdk, "env_test", "release", new AbortController().signal);
  assert.equal(s?.detail.baseRef, "origin/develop");
  assert.ok(f.calls.includes("refs/remotes/origin/develop"));
  sdk.pullRequest = async () => ({ outcome:"available", pullRequest:{ state:"closed", baseRefName:"develop", headRefName:"feature/chat" } });
  assert.equal((await readWorkspaceDiff(sdk, "env_test", "release", new AbortController().signal))?.detail.baseRef, "origin/release");
});

test("missing remote refs with SDK zero counts stay unknown, while a new branch still gets its PR count", async () => {
  const f = reader();
  const sdk = { ...f.sdk, async status(args:{ mergeBaseBranch?:string }) {
    const ref = args.mergeBaseBranch;
    const w = workspace("feature/chat", ref?.endsWith("feature/chat") ? 0 : 8, ref?.endsWith("feature/chat") ? null : "base-sha");
    if (ref) w.mergeBase.mergeBaseBranch = ref;
    return { outcome:"available", workspace:w };
  } };
  const snapshot = await readWorkspaceDiff(sdk, "env_test", undefined, new AbortController().signal);
  assert.equal(snapshot?.detail.commitCount, 8);
  assert.equal(snapshot?.detail.unpushedCount, null);
  sdk.status = async args => {
    const w = workspace("main", 0, null);
    if (args.mergeBaseBranch) w.mergeBase.mergeBaseBranch = args.mergeBaseBranch;
    return { outcome:"available", workspace:w };
  };
  const unknown = await readWorkspaceDiff(sdk, "env_test", undefined, new AbortController().signal);
  assert.equal(unknown?.detail.unpushedCount, null);
  assert.equal(unknown?.presentation.visible, true, "unknown is not clean zero");
});

test("line stats win when dirty; only the pill truncates branch names to 16 characters", () => {
  const w = workspace("feature/a-very-long-branch-name");
  const clean = diffPresentation(w, { main:false, count:8 });
  assert.equal(clean.branchLabel, "feature/a-very-…");
  assert.equal(Array.from(clean.branchLabel!).length, 16);
  assert.equal(clean.branch, "feature/a-very-long-branch-name");
  w.workingTree = { insertions:7, deletions:2, files:[{ path:"draft.ts", status:"M", insertions:7, deletions:2 }] };
  const dirty = diffPresentation(w, { main:false, count:8 });
  assert.equal(dirty.label, "+7 −2 · 1 file");
  assert.equal(dirty.branchLabel, null);
  assert.equal(dirty.visible, true);
});

test("detached HEAD has no remote or PR comparison and still shows dirty files", async () => {
  const f = reader();
  f.sdk.status = async () => {
    const w = workspace(); w.branch.currentBranch = null;
    return { outcome:"available", workspace:w };
  };
  const s = await readWorkspaceDiff(f.sdk, "env_test", undefined, new AbortController().signal);
  assert.equal(s?.presentation.branch, null);
  assert.equal(s?.presentation.visible, false);
  assert.equal(s?.detail.commitCount, null);
});

test("a checkout switch during comparison cannot attach another branch's commit counts", async () => {
  const f = reader();
  const sdk = { ...f.sdk, async status(args:{ mergeBaseBranch?:string }) {
    const w = workspace(args.mergeBaseBranch ? "feature/other" : "feature/chat", 77);
    if (args.mergeBaseBranch) w.mergeBase.mergeBaseBranch = args.mergeBaseBranch;
    return { outcome:"available", workspace:w };
  } };
  const s = await readWorkspaceDiff(sdk, "env_test", undefined, new AbortController().signal);
  assert.equal(s?.detail.commitCount, null);
  assert.equal(s?.detail.unpushedCount, null);
});
