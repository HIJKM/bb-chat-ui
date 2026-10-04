import assert from "node:assert/strict";
import test from "node:test";

import {
  applyComposerRadius,
  applyFadeHeight,
  composerCollapseHeight,
  composerGlassCss,
  composerHeightTransition,
  composerRadiusChange,
  fadeHeight,
  composerControlsLayout,
  composerLift,
  desktopCollapseStick,
  nextPinnedScroll,
  planComposerHeight,
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

test("keeps the expanded editor minimum height independent of banners", () => {
  assert.match(
    composerGlassCss,
    /\[data-scroll-footer\]:has\(\.chat-prompt-box\) \[data-follow-up-composer-anchor\] \[data-promptbox\]:not\(\[data-promptbox-compact\]\) \[data-promptbox-editor-scroll\]\s*\{\s*min-height:\s*68px !important;\s*\}/,
  );
});

test("paints the chat surface slightly darker than the app canvas", () => {
  const css = composerGlassCss;
  assert.match(
    css,
    /\[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\s*\{[^}]*--bb-chat-ui-canvas:\s*oklch\(0\.97 0 0\);[^}]*background-color:\s*var\(--bb-chat-ui-canvas\) !important;/,
  );
  assert.match(
    css,
    /\.dark \[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\s*\{[^}]*--bb-chat-ui-canvas:\s*oklch\(0\.17 0 0\);/,
  );
  assert.match(
    css,
    /\.thread-scrollbar\s*\{[^}]*background-color:\s*var\(--bb-chat-ui-canvas\) !important;/,
  );
  assert.match(
    css,
    /linear-gradient\(\s*to bottom,\s*transparent,\s*var\(--bb-chat-ui-canvas, var\(--background\)\) 50%\s*\)/,
  );
  assert.match(
    css,
    /main\[data-sidebar="inset"\]:has\(\[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\)\s*\{[^}]*--bb-chat-ui-canvas:\s*oklch\(0\.97 0 0\);[^}]*background-color:\s*var\(--bb-chat-ui-canvas\) !important;/,
  );
  assert.match(
    css,
    /\.dark main\[data-sidebar="inset"\]:has\(\[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\)\s*\{[^}]*--bb-chat-ui-canvas:\s*oklch\(0\.17 0 0\);/,
  );
  assert.match(
    css,
    /:has\(> \[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\) > header\s*\{[^}]*background-color:\s*var\(--bb-chat-ui-canvas\) !important;/,
  );
  assert.match(
    css,
    /header:has\(\+ :has\(\[data-thread-window\]:not\(\[data-surface-tone="sidebar"\]\)\)\)\s*\{[^}]*background-color:\s*var\(--bb-chat-ui-canvas\) !important;/,
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
    /#thread-prompt-banner-git-toggle,\s*\[data-scroll-footer\]:has\(\.chat-prompt-box\) button\[aria-label="Scroll to latest event"\]\s*\{[^}]*border-color:\s*transparent !important;/,
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
    /\.dark \[data-scroll-footer\]:has\(\.chat-prompt-box\) #thread-prompt-banner-git-toggle,\s*\.dark \[data-scroll-footer\]:has\(\.chat-prompt-box\) button\[aria-label="Scroll to latest event"\]\s*\{[^}]*border-color:\s*transparent !important;/,
  );
  assert.match(
    css,
    /inset 0 1px 0 color-mix\(in oklab, white 12%, transparent\)/,
  );
  assert.match(css, /color-mix\(in oklab, black 60%, transparent\)/);
  assert.match(css, /\[data-promptbox\]\s*\{[^}]*border-color:\s*transparent !important;/);
  assert.match(
    css,
    /\[data-promptbox\]\s*\{[^}]*transition:\s*box-shadow 320ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/,
  );
  assert.doesNotMatch(css, /transition:[^;]*!important/);
  assert.match(
    css,
    /\[data-promptbox\]:focus-within\s*\{[^}]*border-color:\s*transparent !important;/,
  );
  assert.match(
    css,
    /@media \(width < 48rem\) and \(pointer: coarse\)\s*\{[\s\S]*\[data-promptbox\]\s*\{[^}]*box-shadow:\s*0 6px 16px -10px color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 22%, transparent\),/,
  );
  assert.match(
    css,
    /@media \(width < 48rem\) and \(pointer: coarse\)\s*\{[\s\S]*\[data-promptbox\]:focus-within\s*\{[^}]*box-shadow:\s*0 8px 20px -12px color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 34%, transparent\),/,
  );
  assert.match(
    css,
    /@media \(width < 48rem\) and \(pointer: coarse\)\s*\{[\s\S]*\.dark \[data-scroll-footer\]:has\(\.chat-prompt-box\) \[data-promptbox\]\s*\{[^}]*box-shadow:\s*0 6px 16px -10px color-mix\(in oklab, black 60%, transparent\),/,
  );
  assert.match(
    css,
    /@media \(width < 48rem\) and \(pointer: coarse\)\s*\{[\s\S]*\.dark \[data-scroll-footer\]:has\(\.chat-prompt-box\) \[data-promptbox\]:focus-within\s*\{[^}]*box-shadow:\s*0 8px 20px -12px color-mix\(in oklab, var\(--ink, var\(--foreground\)\) 34%, transparent\),/,
  );
  assert.match(
    css,
    /\.dark \[data-scroll-footer\]:has\(\.chat-prompt-box\) \[data-promptbox\]\s*\{[^}]*border-color:\s*transparent !important;/,
  );
  assert.doesNotMatch(
    css,
    /\[data-promptbox\]:focus-within\s*\{[^}]*border-color:\s*color-mix/,
  );
  assert.match(css, /\[data-promptbox\]\s*\{[^}]*border-radius:\s*1\.375rem/);
  assert.match(
    css,
    /\[data-promptbox\]\[data-promptbox-compact\]\s*\{[^}]*border-radius:\s*999px/,
  );
  assert.match(
    css,
    /\[data-promptbox\]\[data-promptbox-compact\]:has\(\[aria-label="Exit handoff"\]\)\s*\{[^}]*border-radius:\s*1\.375rem !important;/,
  );
  assert.doesNotMatch(
    css,
    /#thread-prompt-banner-git-toggle\s*\{[^}]*border-radius:/,
  );
});

test("keeps the collapsing composer on the bottom edge", () => {
  const css = composerGlassCss;
  assert.match(
    css,
    /\[data-promptbox\]\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*justify-content:\s*flex-end;/,
  );
  assert.match(
    css,
    /@media \(width < 48rem\)\s*\{[\s\S]*:has\(\[data-promptbox-compact\]\)[\s\S]*max-height:\s*100dvh;[\s\S]*\[data-promptbox-shell\] > \.grid\s*\{[^}]*overflow-y:\s*auto;/,
  );
  const desktop = css.match(
    /@media \(width >= 48rem\)\s*\{[\s\S]*\n\}(?=\n@media \(pointer: fine\))/,
  );
  assert.ok(desktop);
  assert.match(desktop[0], /:has\(\[data-promptbox-compact\]\)/);
  assert.match(desktop[0], /justify-content:\s*flex-end;/);
  assert.doesNotMatch(desktop[0], /100dvh|overflow-y:\s*auto/);
  assert.equal(
    desktopCollapseStick({
      desktop: false,
      scrollGap: 10,
      footerBottom: 800,
      scrollerBottom: 800,
    }),
    false,
  );
  assert.equal(
    desktopCollapseStick({
      desktop: true,
      scrollGap: 10,
      footerBottom: 796,
      scrollerBottom: 800,
    }),
    true,
  );
  assert.equal(composerLift({
    desktop: false,
    stick: true,
    scrollerBottom: 800,
    plateBottom: 780,
  }), null);
  assert.equal(composerLift({
    desktop: true,
    stick: true,
    scrollerBottom: 800,
    plateBottom: 780,
  }), "translateY(20px)");
  assert.equal(composerLift({
    desktop: true,
    stick: true,
    scrollerBottom: 800,
    plateBottom: 800,
  }), null);
});

test("eases composer height and corner on a fine pointer", () => {
  const css = composerGlassCss;
  assert.match(css, /@keyframes bb-chat-ui-composer-radius/);
  assert.match(
    css,
    /@media \(pointer: fine\)\s*\{[\s\S]*?\[data-promptbox\]\s*\{[^}]*height 360ms cubic-bezier\(0\.22, 1, 0\.36, 1\),\s*border-radius 480ms cubic-bezier\(0\.22, 1, 0\.36, 1\);/,
  );
  assert.match(
    css,
    /@media \(pointer: fine\) and \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition:\s*box-shadow 320ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/,
  );
  assert.deepEqual(
    composerRadiusChange({
      previousCompact: false,
      nextCompact: true,
      handoff: false,
      finePointer: true,
      reducedMotion: false,
    }),
    { from: "1.375rem", to: "999px" },
  );
  assert.deepEqual(
    composerRadiusChange({
      previousCompact: true,
      nextCompact: false,
      handoff: false,
      finePointer: true,
      reducedMotion: false,
    }),
    { from: "999px", to: "1.375rem" },
  );
  assert.equal(
    composerRadiusChange({
      previousCompact: false,
      nextCompact: true,
      handoff: true,
      finePointer: true,
      reducedMotion: false,
    }),
    null,
  );
  assert.equal(
    composerRadiusChange({
      previousCompact: false,
      nextCompact: true,
      handoff: false,
      finePointer: false,
      reducedMotion: false,
    }),
    null,
  );
  assert.equal(
    composerRadiusChange({
      previousCompact: false,
      nextCompact: true,
      handoff: false,
      finePointer: true,
      reducedMotion: true,
    }),
    null,
  );

  const writes: string[] = [];
  const element = {
    style: {
      setProperty(name: string, value: string) {
        writes.push(`${name}:${value}`);
      },
      animation: "",
    },
    getBoundingClientRect() {
      writes.push("measure");
    },
  };
  applyComposerRadius(element, { from: "1.375rem", to: "999px" });
  assert.deepEqual(writes, [
    "--bb-chat-ui-radius-from:1.375rem",
    "--bb-chat-ui-radius-to:999px",
    "measure",
  ]);
  assert.equal(
    element.style.animation,
    "bb-chat-ui-composer-radius 480ms cubic-bezier(0.22, 1, 0.36, 1)",
  );
});

test("lengthens the host height flip and keeps a bottom scroll pinned", () => {
  const host = "height 240ms cubic-bezier(0.22, 1, 0.36, 1)";
  assert.equal(
    composerHeightTransition(host),
    "height 360ms cubic-bezier(0.22, 1, 0.36, 1)",
  );
  assert.equal(composerHeightTransition("height 480ms ease"), null);
  assert.equal(composerHeightTransition(""), null);

  const started = planComposerHeight({
    transition: host,
    height: "48px",
    now: 1_000,
    idleHeight: 120,
    motion: null,
  });
  assert.equal(started.rewrite?.from, 120);
  assert.equal(started.rewrite?.to, 48);
  assert.equal(
    started.rewrite?.transition,
    "height 360ms cubic-bezier(0.22, 1, 0.36, 1)",
  );
  assert.equal(started.resume, null);
  assert.deepEqual(started.motion, {
    from: 120,
    to: 48,
    startedAt: 1_000,
    durationMs: 360,
  });

  const cutOff = planComposerHeight({
    transition: "",
    height: "",
    now: 1_320,
    idleHeight: 120,
    motion: started.motion,
  });
  assert.ok(cutOff.resume);
  assert.equal(cutOff.resume?.from, 120);
  assert.equal(cutOff.resume?.to, 48);
  assert.equal(cutOff.resume?.remainingMs, 40);
  assert.match(cutOff.resume?.transition ?? "", /height 360ms/);
  assert.match(cutOff.resume?.transition ?? "", /-320ms/);
  assert.equal(cutOff.motion, started.motion);
  const resumedHeight = composerCollapseHeight({
    from: 120,
    to: 48,
    elapsedMs: 320,
    durationMs: 360,
  });
  assert.ok(resumedHeight < 60);
  assert.ok(resumedHeight > 48);

  const finished = planComposerHeight({
    transition: "",
    height: "",
    now: 1_360,
    idleHeight: 48,
    motion: started.motion,
  });
  assert.equal(finished.motion, null);
  assert.equal(finished.resume, null);

  assert.equal(composerCollapseHeight({
    from: 120,
    to: 48,
    elapsedMs: 0,
    durationMs: 480,
  }), 120);
  assert.equal(composerCollapseHeight({
    from: 120,
    to: 48,
    elapsedMs: 480,
    durationMs: 480,
  }), 48);

  assert.deepEqual(
    nextPinnedScroll({
      scrollTop: 400,
      scrollHeight: 500,
      clientHeight: 80,
      stick: true,
      lastPinned: null,
    }),
    { scrollTop: 420, stick: true },
  );
  assert.deepEqual(
    nextPinnedScroll({
      scrollTop: 420,
      scrollHeight: 500,
      clientHeight: 80,
      stick: true,
      lastPinned: 420,
    }),
    { scrollTop: null, stick: true },
  );
  assert.deepEqual(
    nextPinnedScroll({
      scrollTop: 300,
      scrollHeight: 500,
      clientHeight: 80,
      stick: true,
      lastPinned: 420,
    }),
    { scrollTop: null, stick: false },
  );
  assert.deepEqual(
    nextPinnedScroll({
      scrollTop: 10,
      scrollHeight: 80,
      clientHeight: 100,
      stick: false,
      lastPinned: null,
    }),
    { scrollTop: null, stick: false },
  );
});

test("rounds buttons inside the composer like the mobile composer", () => {
  const css = composerGlassCss;
  assert.match(
    css,
    /\[data-promptbox\] button:not\(:has\(img\)\),\s*\[data-scroll-footer\]:has\(\.chat-prompt-box\) \[data-promptbox\] \[role="button"\]:not\(:has\(img\)\)\s*\{[^}]*border-radius:\s*999px !important;/,
  );
  assert.match(
    css,
    /\[data-promptbox-send-menu\]\s*\{[^}]*border-radius:\s*999px !important;/,
  );
  assert.doesNotMatch(
    css,
    /\[aria-label="Stop run"\]\s*\{[^}]*border-radius:\s*10px/,
  );
});

test("stacks each side independently above the to-do card", () => {
  const all = { width: 358, diffHeight: 32, agentation: true,
    agentationWidth: 160, queue: true, jumpHeight: 32, rightWidth: 32 };
  assert.deepEqual(composerControlsLayout(all), {
    height: 72, agentationBottom: 40, queueBottom: 40,
    agentationWidth: 318, queueWidth: 358,
  });
  assert.deepEqual(composerControlsLayout({ ...all, diffHeight: 0 }), {
    height: 72, agentationBottom: 0, queueBottom: 40,
    agentationWidth: 318, queueWidth: 358,
  });
  assert.deepEqual(composerControlsLayout({ ...all, jumpHeight: 0 }), {
    height: 72, agentationBottom: 40, queueBottom: 0,
    agentationWidth: 318, queueWidth: 190,
  });
  assert.deepEqual(composerControlsLayout({ ...all, queue: false, jumpHeight: 0, rightWidth: 0 }), {
    height: 72, agentationBottom: 40, queueBottom: 0,
    agentationWidth: 358, queueWidth: 358,
  });
  assert.equal(composerControlsLayout({ ...all, agentation: false }).height, 72);
  assert.equal(composerControlsLayout({ ...all, diffHeight: 48 }).queueBottom, 40);
  assert.equal(composerControlsLayout({ ...all, queue: false, rightWidth: 32 }).agentationWidth, 318);
});

test("anchors the actual Agentation box upward, including a contents plugin wrapper", () => {
  assert.match(composerGlassCss, /:has\(> \.agentation-staging-shell\)\s*\{[^}]*position:\s*absolute;[^}]*height:\s*32px;/);
  assert.match(composerGlassCss, /\.agentation-staging-shell\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;/);
  assert.doesNotMatch(composerGlassCss, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(composerGlassCss, /section\[aria-label="To-do list"\]\s*\{[^}]*order:\s*2;/);
});

test("anchors jump-to-bottom by its bottom edge", () => {
  assert.match(composerGlassCss, /button\[aria-label="Scroll to latest event"\]\s*\{[^}]*position:\s*absolute;[^}]*top:\s*auto;[^}]*bottom:\s*var\(--bb-chat-ui-jump-bottom, 0px\);/);
  assert.doesNotMatch(composerGlassCss, /-mt-20/);
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
