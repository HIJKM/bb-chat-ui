import assert from "node:assert/strict";
import test from "node:test";

import {
  headDiffSummary,
  headDiffDetail,
  planChangesPanelClicks,
  readChangedFileLabel,
} from "./workspace-diff-pill.ts";

test("counts only changes against HEAD, excluding committed branch changes", () => {
  assert.deepEqual(headDiffSummary({
    branch: { currentBranch: "feature/chat", defaultBranch: "main" },
    workingTree: { insertions: 12, deletions: 3, files: [{}, {}] },
    mergeBase: { insertions: 400, deletions: 90, files: [{}, {}, {}] },
  }), { insertions: 12, deletions: 3, files: 2, branch: "feature/chat" });
});

test("detail files use the same comparison as the pill and distinguish branch commits from unpushed commits", () => {
  const dirty = { path:'draft.ts', status:'M', insertions:4, deletions:1 };
  const committed = { path:'saved.ts', status:'A', insertions:23, deletions:0 };
  const commits = [{ sha:'1234567abc', shortSha:'1234567', subject:'저장된 변경' }];
  const workspace = {
    branch:{ currentBranch:'feature/chat', defaultBranch:'main' },
    workingTree:{ insertions:4, deletions:1, files:[dirty] },
    mergeBase:{ insertions:23, deletions:0, files:[committed], commits, baseRef:'main', mergeBaseBranch:'main' },
  };
  assert.deepEqual(headDiffDetail(workspace, { isWorktree:true }), {
    branch:'feature/chat', basis:'HEAD 대비 미커밋 변경', baseRef:'main', files:[dirty], commits,
  });
  workspace.workingTree = { insertions:0, deletions:0, files:[] };
  assert.deepEqual(headDiffDetail(workspace, { isWorktree:true }), {
    branch:'feature/chat', basis:'main 대비 커밋된 변경', baseRef:'main', files:[committed], commits,
  });
  assert.deepEqual(headDiffDetail(workspace).files, []);
});

test("omits the branch icon on the repository's default branch", () => {
  const pairs = [
    ["main", "main"],
    ["master", "master"],
    ["main", "origin/main"],
    ["master", "refs/heads/master"],
    ["develop", "refs/remotes/origin/develop"],
  ];
  for (const [currentBranch, defaultBranch] of pairs) {
    assert.equal(headDiffSummary({
      branch: { currentBranch, defaultBranch },
      workingTree: { insertions: 0, deletions: 0, files: [] },
    }).branch, null);
  }
});

test("shows a clean worktree's committed diff and leaves a normal branch at zero", () => {
  const workspace = {
    branch: { currentBranch: "bb/chat-1", defaultBranch: "main" },
    workingTree: { insertions: 0, deletions: 0, files: [] },
    mergeBase: { insertions: 23, deletions: 27, files: [{}, {}, {}, {}, {}] },
  };
  assert.deepEqual(headDiffSummary(workspace, { isWorktree: true }), {
    insertions: 23, deletions: 27, files: 5, branch: "bb/chat-1",
  });
  assert.deepEqual(headDiffSummary(workspace), {
    insertions: 0, deletions: 0, files: 0, branch: "bb/chat-1",
  });
});

test("does not add committed worktree changes on top of uncommitted ones", () => {
  assert.deepEqual(headDiffSummary({
    branch: { currentBranch: "bb/chat-1", defaultBranch: "origin/main" },
    workingTree: { insertions: 4, deletions: 1, files: [{}] },
    mergeBase: { insertions: 23, deletions: 27, files: [{}, {}] },
  }, { isWorktree: true }), {
    insertions: 4, deletions: 1, files: 1, branch: "bb/chat-1",
  });
});

test("keeps zero HEAD changes on a clean feature branch and no icon for detached HEAD", () => {
  assert.deepEqual(headDiffSummary({
    branch: { currentBranch: "feature/chat", defaultBranch: "main" },
    workingTree: { insertions: 0, deletions: 0, files: [] },
  }), { insertions: 0, deletions: 0, files: 0, branch: "feature/chat" });
  assert.equal(headDiffSummary({
    branch: { currentBranch: null, defaultBranch: "main" },
    workingTree: { insertions: 0, deletions: 0, files: [] },
  }).branch, null);
});

test("reads a plural file count from the host summary", () => {
  assert.equal(
    readChangedFileLabel("Uncommitted · 7 files, +328 -4"),
    "7 files",
  );
});

test("reads a singular file count", () => {
  assert.equal(readChangedFileLabel("1 file, +2 -1"), "1 file");
});

test("returns null when the summary has no file count", () => {
  assert.equal(readChangedFileLabel("No changes"), null);
});

test("opens a closed panel before selecting Diff", () => {
  assert.deepEqual(
    planChangesPanelClicks([
      { label: "Show right panel (⌘\\)", pressed: false, inert: false },
      { label: "Show diff panel (⌘D)", pressed: true, inert: true },
    ]),
    ["show-panel"],
  );
});

test("selects Diff when the panel is already open", () => {
  assert.deepEqual(
    planChangesPanelClicks([
      { label: "Show diff panel", pressed: false, inert: false },
    ]),
    ["diff"],
  );
});

test("leaves an open Diff panel alone", () => {
  assert.deepEqual(
    planChangesPanelClicks([
      { label: "Show diff panel", pressed: true, inert: false },
    ]),
    [],
  );
});
