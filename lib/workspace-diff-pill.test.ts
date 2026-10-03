import assert from "node:assert/strict";
import test from "node:test";

import {
  planChangesPanelClicks,
  readChangedFileLabel,
} from "./workspace-diff-pill.ts";

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
