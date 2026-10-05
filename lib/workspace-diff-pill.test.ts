import assert from "node:assert/strict";
import test from "node:test";

import {
  headDiffSummary,
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

test("omits the branch icon on the repository's default branch", () => {
  for (const branch of ["main", "master"]) {
    assert.equal(headDiffSummary({
      branch: { currentBranch: branch, defaultBranch: branch },
      workingTree: { insertions: 0, deletions: 0, files: [] },
    }).branch, null);
  }
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
