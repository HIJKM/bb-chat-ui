import assert from "node:assert/strict";
import test from "node:test";

import {
  applyFadeHeight,
  composerGlassCss,
  fadeHeight,
  jumpButtonTop,
  jumpButtonTopAboveComposer,
} from "./composer-glass.ts";

test("fades messages above the composer without pulling the footer up", () => {
  const css = composerGlassCss;
  assert.doesNotMatch(css, /margin-top:\s*calc\(-1 \*/);
  assert.doesNotMatch(css, /scroll-bottom-anchor/);
  assert.match(css, /background:\s*transparent !important/);
  assert.match(css, /top:\s*auto !important/);
  assert.match(css, /bottom:\s*0 !important/);
  assert.match(
    css,
    /height:\s*var\(--bb-chat-ui-fade-height, 50%\) !important/,
  );
  assert.doesNotMatch(css, /100% \+ var\(--bb-chat-ui-plate-height/);
  assert.equal(
    fadeHeight({ plateBottom: 640, composerTop: 560, composerHeight: 80 }),
    40,
  );
  assert.equal(
    fadeHeight({ plateBottom: 100, composerTop: 90, composerHeight: 40 }),
    0,
  );
  assert.match(
    css,
    /linear-gradient\(\s*to bottom,\s*transparent[\s\S]*var\(--background\)/,
  );
  assert.doesNotMatch(
    css,
    /padding-bottom:\s*3\.5rem|0 16px 36px|0 16px 40px|blur\(16px\)|blur\(12px\) saturate\(1\.8\)|1\.5px|h-6|to-background|height:\s*auto/,
  );
});

test("paints the composer, diff pill, and jump button with the mobile glass", () => {
  const css = composerGlassCss;
  assert.match(
    css,
    /\[data-promptbox\],[\s\S]*#thread-prompt-banner-git-toggle,[\s\S]*button\[aria-label="Scroll to latest event"\]\s*\{[\s\S]*backdrop-filter:\s*blur\(14px\) saturate\(1\.25\);[\s\S]*-webkit-backdrop-filter:\s*blur\(14px\) saturate\(1\.25\);/,
  );
  assert.match(css, /color-mix\(in oklab, white 78%, transparent\)/);
  assert.match(
    css,
    /border-color:\s*color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 10%, transparent\)/,
  );
  assert.match(
    css,
    /0 12px 32px -14px color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 22%, transparent\),\s*inset 0 1px 0 color-mix\(in oklab, white 85%, transparent\)/,
  );
  assert.match(
    css,
    /0 6px 18px -12px color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 22%, transparent\)/,
  );
  assert.match(css, /oklch\(0\.27 0\.008 275 \/ 0\.86\)/);
  assert.match(
    css,
    /border-color:\s*color-mix\(in oklab, white 12%, transparent\)/,
  );
  assert.match(
    css,
    /inset 0 1px 0 color-mix\(in oklab, white 12%, transparent\)/,
  );
  assert.match(css, /color-mix\(in oklab, black 60%, transparent\)/);
  assert.match(css, /\[data-promptbox\]\s*\{[^}]*border-radius:\s*1\.375rem/);
  assert.match(
    css,
    /\[data-promptbox\]\[data-promptbox-compact\]\s*\{[^}]*border-radius:\s*999px/,
  );
  assert.doesNotMatch(
    css,
    /#thread-prompt-banner-git-toggle\s*\{[^}]*border-radius:/,
  );
});

test("places the jump button on the diff pill row", () => {
  const css = composerGlassCss;
  assert.match(
    css,
    /\[data-scroll-footer\]:has\(\.chat-prompt-box\) button\[aria-label="Scroll to latest event"\]\s*\{[^}]*position:\s*absolute;[^}]*margin-top:\s*0 !important;[^}]*top:\s*var\(--bb-chat-ui-jump-top, 0px\);[^}]*right:\s*1rem;[^}]*left:\s*auto;[^}]*transform:\s*none;/,
  );
  assert.match(css, /button\[aria-label="Scroll to latest event"\]:not\(\.invisible\)/);
  assert.match(css, /padding-right:\s*2\.5rem/);
  assert.doesNotMatch(css, /-mt-20/);
  assert.equal(
    jumpButtonTop({
      columnTop: 80,
      pillTop: 100,
      pillHeight: 28,
      buttonHeight: 32,
    }),
    18,
  );
  assert.equal(
    jumpButtonTopAboveComposer({
      columnTop: 80,
      composerTop: 200,
      buttonHeight: 32,
    }),
    80,
  );
});

test("sets the fade height from the composer midline", () => {
  const writes: string[] = [];
  const node = {
    style: {
      setProperty(_name: string, value: string) {
        writes.push(value);
      },
      removeProperty() {
        writes.push("cleared");
      },
    },
  };
  applyFadeHeight(node, 40.2);
  assert.deepEqual(writes, ["40px"]);
  applyFadeHeight(node, 0);
  assert.deepEqual(writes, ["40px", "cleared"]);
});
