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
  assert.equal(snapshot.presentation.label, "feature/c… · 8 commits");
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
  assert.equal(unknown?.detail.remoteBaseMissing, true);
  assert.equal(unknown?.presentation.visible, false, "unknown remains unknown but does not expose clean main");
});

test("clean main/master with missing remote refs hide while dirty files remain visible", () => {
  for (const branch of ["main", "master"]) {
    const w = workspace(branch, 0, null);
    assert.equal(diffPresentation(w, { main:true, count:null }).visible, false);
    w.workingTree = { insertions:1, deletions:0, files:[{ path:"draft.ts", status:"M", insertions:1, deletions:0 }] };
    assert.equal(diffPresentation(w, { main:true, count:null }).visible, true);
  }
});

test("missing origin base never falls back to local merge-base counts", async () => {
  const f = reader();
  const sdk = { ...f.sdk, async status(args:{ mergeBaseBranch?:string }) {
    f.calls.push(args.mergeBaseBranch ?? "HEAD");
    const w = workspace("feature/chat", 27);
    if (args.mergeBaseBranch) { w.mergeBase.baseRef = null; w.mergeBase.mergeBaseBranch = args.mergeBaseBranch; }
    return { outcome:"available", workspace:w };
  } };
  const result = await readWorkspaceDiff(sdk,"env_test",undefined,new AbortController().signal);
  assert.equal(result?.detail.commitCount,null);
  assert.equal(result?.detail.remoteBaseMissing,true);
  assert.deepEqual(result?.detail.commits,[]);
  assert.equal(result?.presentation.visible,true,"feature branch name is still available");
  assert.deepEqual(f.calls,["HEAD","refs/remotes/origin/main","refs/remotes/origin/feature/chat"]);
});

test("line stats win when dirty; only the pill truncates branch names to 10 characters", () => {
  const w = workspace("feature/a-very-long-branch-name");
  const clean = diffPresentation(w, { main:false, count:8 });
  assert.equal(clean.branchLabel, "feature/a…");
  assert.equal(Array.from(clean.branchLabel!).length, 10);
  for (const branch of ["short", "1234567890", "12345678901", "🚀1234567890"]) {
    const label = diffPresentation(workspace(branch), { main:false, count:0 }).branchLabel!;
    const characters = Array.from(branch);
    assert.equal(label, characters.length <= 10 ? branch : `${characters.slice(0,9).join("")}…`);
  }
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
  assert.equal(s, null, "mixed checkouts must not publish an intermediate branch-only snapshot");
});

test("a temporary remote comparison failure does not replace a known main count with a branch-only snapshot", async () => {
  const f = reader('main');
  const sdk = { ...f.sdk, async status(args:{ mergeBaseBranch?:string }) {
    if (args.mergeBaseBranch) throw new Error('temporary failure');
    return { outcome:'available', workspace:workspace('main') };
  } };
  assert.equal(await readWorkspaceDiff(sdk,'env_test',undefined,new AbortController().signal),null);
});

test("a new commit during comparison is retried as one coherent snapshot", async () => {
  const f = reader('main');
  const sdk = { ...f.sdk, async status(args:{ mergeBaseBranch?:string }) {
    const w = workspace('main');
    if (args.mergeBaseBranch) { w.checkout.headSha='new-head'; w.mergeBase.mergeBaseBranch=args.mergeBaseBranch; }
    return { outcome:'available', workspace:w };
  } };
  assert.equal(await readWorkspaceDiff(sdk,'env_test',undefined,new AbortController().signal),null);
});

test("confirmed non-Git status finishes without waiting for an unrelated PR lookup", async () => {
  let settled = false;
  const sdk = {
    async status() { return { outcome:"unavailable", failure:{ code:"not_git_repo" } }; },
    pullRequest:() => new Promise<{ outcome:string }>(() => {}),
  };
  const result = readWorkspaceDiff(sdk,"env_test",undefined,new AbortController().signal).then(value => { settled = true; return value; });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(settled,true,"non-Git detection must not wait for PR data");
  assert.equal(await result,undefined,"confirmed absence differs from a retryable incomplete snapshot");
});
