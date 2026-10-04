import assert from "node:assert/strict";
import test from "node:test";

import {
  queuePillLabel,
  queuedMessagesCss,
  readQueueCount,
  conversationTimelineInColumn,
  messageColumnBeforeFooter,
  shouldFoldQueue,
  shouldPlaceQueueInColumn,
} from "./queued-messages.ts";

test("names the folded queue pill after the held count", () => {
  assert.equal(readQueueCount(" 2 "), "2");
  assert.equal(readQueueCount("Queue"), "");
  assert.equal(readQueueCount(null), "");
  assert.equal(queuePillLabel("collapsed", "2"), "대기 메시지 2개");
  assert.equal(queuePillLabel("drawer", "2"), "접기");
  assert.equal(queuePillLabel("workspace", "4"), "접기");
  assert.equal(queuePillLabel("collapsed", ""), "대기 메시지");
  assert.equal(
    queuePillLabel("drawer", "5", "Expand queued messages"),
    "대기 메시지 5개",
  );
  assert.equal(
    queuePillLabel("drawer", "2", "Collapse queued messages"),
    "접기",
  );
});

test("folds a drawer once, and leaves an open editor alone", () => {
  assert.equal(
    shouldFoldQueue({
      mode: "drawer",
      canCollapse: true,
      editing: false,
      folded: false,
    }),
    true,
  );
  assert.equal(
    shouldFoldQueue({
      mode: "drawer",
      canCollapse: true,
      editing: false,
      folded: true,
    }),
    false,
  );
  assert.equal(
    shouldFoldQueue({
      mode: "drawer",
      canCollapse: false,
      editing: false,
      folded: false,
    }),
    false,
  );
  assert.equal(
    shouldFoldQueue({
      mode: "drawer",
      canCollapse: true,
      editing: true,
      folded: false,
    }),
    false,
  );
  assert.equal(
    shouldFoldQueue({
      mode: "collapsed",
      canCollapse: true,
      editing: false,
      folded: false,
    }),
    false,
  );
  assert.equal(
    shouldFoldQueue({
      mode: "workspace",
      canCollapse: true,
      editing: false,
      folded: false,
    }),
    false,
  );
});

test("paints queued messages as a right pill and faded bubbles", () => {
  const css = queuedMessagesCss;
  assert.match(css, /section\[aria-label="Queued messages"\]:has\(\[data-queued-messages-mode\]\)/);
  assert.match(
    css,
    /section\[aria-label="Queued messages"\]:has\(\[data-queued-messages-mode\]\)\s*\{[^}]*position:\s*static !important;/,
  );
  assert.match(
    css,
    /section\[aria-label="Queued messages"\]:has\(\[data-queued-messages-mode\]\)\s*\{[^}]*align-self:\s*stretch;/,
  );
  assert.match(
    css,
    /section\[aria-label="Queued messages"\]:has\(\[data-queued-messages-mode\]\)\s*\{[^}]*width:\s*100%;/,
  );
  assert.doesNotMatch(css, /position:\s*absolute/);
  assert.doesNotMatch(css, /min\(760px,\s*100%\)/);
  const column = { id: "column" };
  const anchor = {
    classList: {
      contains: (name: string) => name === "scroll-bottom-anchor",
    },
    previousElementSibling: column,
  };
  assert.equal(
    messageColumnBeforeFooter({ previousElementSibling: anchor }),
    column,
  );
  assert.equal(messageColumnBeforeFooter(null), null);
  assert.equal(
    messageColumnBeforeFooter({ previousElementSibling: null }),
    null,
  );
  assert.equal(
    messageColumnBeforeFooter({
      previousElementSibling: {
        classList: { contains: () => false },
        previousElementSibling: column,
      },
    }),
    null,
  );
  const timeline = {
    id: "timeline",
    classList: { contains: (name: string) => name === "flex-1" },
  };
  assert.equal(
    conversationTimelineInColumn({ firstElementChild: timeline }),
    timeline,
  );
  assert.equal(conversationTimelineInColumn(null), null);
  assert.equal(
    conversationTimelineInColumn({ firstElementChild: null }),
    null,
  );
  assert.equal(
    conversationTimelineInColumn({
      firstElementChild: {
        classList: { contains: () => false },
      },
    }),
    null,
  );
  const section = { id: "queue" };
  assert.equal(shouldPlaceQueueInColumn(null, null, null, section), false);
  assert.equal(shouldPlaceQueueInColumn(null, column, null, section), true);
  assert.equal(
    shouldPlaceQueueInColumn(column, column, section, section),
    false,
  );
  assert.equal(
    shouldPlaceQueueInColumn(column, column, { id: "message" }, section),
    true,
  );
  assert.match(css, /height:\s*auto !important/);
  assert.match(css, /background:\s*transparent !important/);
  assert.match(
    css,
    /\[data-queued-messages-scroll-frame\]\s*\{[^}]*grid-template-rows:\s*1fr;/,
  );
  assert.match(
    css,
    /\[data-queued-messages-scroll-frame\]\s*\{[^}]*transition:[^;]*grid-template-rows 260ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/,
  );
  assert.match(
    css,
    /\[data-queued-messages-mode="collapsed"\]\) \[data-queued-messages-scroll-frame\]\s*\{[^}]*grid-template-rows:\s*0fr;/,
  );
  assert.match(css, /content:\s*attr\(data-bb-chat-ui-queue-label\)/);
  assert.match(
    css,
    /header\[data-queued-messages-mode\]\s*\{[^}]*order:\s*1;/,
  );
  assert.match(css, /margin-left:\s*auto/);
  assert.match(css, /border-radius:\s*18px !important/);
  assert.match(css, /button\[aria-label\^="Reorder"\]\s*\{[^}]*display:\s*none !important;/);
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex > \.min-w-0\s*\{[^}]*background:\s*var\(--surface-recessed\);/,
  );
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex > \.min-w-0\s*\{[^}]*border:\s*1px solid var\(--border-seam\);/,
  );
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex > \.min-w-0\s*\{[^}]*border-radius:\s*calc\(var\(--radius\) \+ 4px\);/,
  );
  assert.doesNotMatch(css, /var\(--radius-xl\)/);
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex > \.min-w-0\s*\{[^}]*max-width:\s*70%;/,
  );
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex > \.min-w-0\s*\{[^}]*opacity:\s*0\.7;/,
  );
  assert.doesNotMatch(css, /26px 26px 10px 26px/);
  assert.match(
    css,
    /\[data-queued-message-row\] > \.flex\s*\{[^}]*align-items:\s*center !important;/,
  );
  assert.match(
    css,
    /\[data-queued-message-actions\]\s*\{[^}]*position:\s*static !important;/,
  );
  assert.match(
    css,
    /\[data-queued-message-actions\]\s*\{[^}]*translate:\s*none !important;/,
  );
  assert.match(
    css,
    /\[data-queued-message-actions\]\s*\{[^}]*align-self:\s*center !important;/,
  );
  assert.match(
    css,
    /\[data-queued-message-actions\]\s*\{[^}]*opacity:\s*1 !important;/,
  );
});
