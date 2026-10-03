import assert from "node:assert/strict";
import test from "node:test";

import { firstQuoteSpan, replaceQuoteSpan } from "./quote-draft.ts";

test("reads a quote out of the composer text", () => {
  const span = firstQuoteSpan("앞\n\n> 포인터가 떠난다\n> 카드가 남는다\n\n뒤");
  assert.ok(span);
  assert.equal(span?.body, "포인터가 떠난다\n카드가 남는다");
  assert.equal(span?.label, "포인터가 떠난다");
  assert.equal(span?.raw, "> 포인터가 떠난다\n> 카드가 남는다");
});

test("replaces the quote with one mention and keeps the surrounding text", () => {
  const text = "앞\n\n> 포인터가 떠난다\n\n뒤 @file";
  const span = firstQuoteSpan(text);
  assert.ok(span);
  const file = { from: text.indexOf("@file"), to: text.indexOf("@file") + 5, id: "file" };
  const mention = {
    from: span!.start,
    to: span!.start + span!.label.length,
    id: "quote-1",
  };
  const next = replaceQuoteSpan({ text, mentions: [file] }, span!, mention);
  assert.equal(next?.text, "앞\n\n포인터가 떠난다\n\n뒤 @file");
  assert.deepEqual(next?.mentions, [
    mention,
    { ...file, from: file.from - (span!.raw.length - span!.label.length), to: file.to - (span!.raw.length - span!.label.length) },
  ]);
});

test("does not treat text inside an existing mention as a quote", () => {
  const text = "> 이미 멘션";
  const span = firstQuoteSpan(text, [{ from: 0, to: text.length }]);
  assert.equal(span, null);
});
