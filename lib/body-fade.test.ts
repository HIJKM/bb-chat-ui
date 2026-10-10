import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { bodyFadeBox, readBodyFadeClips, type BodyFadeClip } from "./body-fade.ts";
import { composerInfoCss } from "./composer-info.ts";

const cardClip: BodyFadeClip = { top: 81, right: 309, bottom: 239, left: 11, clipX: true, clipY: true };
const bodyClip: BodyFadeClip = { top: 90, right: 356, bottom: 490, left: 16, clipX: true, clipY: true };
const scrolled = { top: 100, right: 344, bottom: 404, left: 24 };

test("body fade clips keep both axes and the padding edge", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const { document, window } = { document: dom.window.document, window: dom.window };
  document.body.innerHTML = `<section id="card" style="overflow:hidden;border:1px solid transparent">
    <div id="gap">
      <div id="body" style="overflow-y:auto;overflow-x:visible">
        <div id="hole" style="overflow:hidden">
          <div id="nan" style="overflow:hidden"><div id="scroller"></div></div>
        </div>
      </div>
    </div>
  </section>`;
  const card = document.querySelector<HTMLElement>("#card")!;
  const gap = document.querySelector<HTMLElement>("#gap")!;
  const body = document.querySelector<HTMLElement>("#body")!;
  const hole = document.querySelector<HTMLElement>("#hole")!;
  const nan = document.querySelector<HTMLElement>("#nan")!;
  const scroller = document.querySelector<HTMLElement>("#scroller")!;
  const box = (x: number, y: number, width: number, height: number) => new window.DOMRect(x, y, width, height);
  card.getBoundingClientRect = () => box(10, 80, 300, 160);
  gap.getBoundingClientRect = () => box(12, 88, 320, 420);
  body.getBoundingClientRect = () => box(16, 130, 340, 400);
  hole.getBoundingClientRect = () => ({ width: 10, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect;
  nan.getBoundingClientRect = () => ({ top: Number.NaN, right: 20, bottom: 20, left: 0, width: 20, height: 20 }) as DOMRect;
  scroller.getBoundingClientRect = () => box(24, 40, 320, 304);

  const clips = readBodyFadeClips(scroller);
  const cardCss = window.getComputedStyle(card);
  const bodyCss = window.getComputedStyle(body);
  try {
    assert.deepEqual(clips.map(clip => clip.node.id), ["body", "card"]);
    assert.equal(bodyCss.overflowY, "auto");
    assert.equal(bodyCss.overflowX, "visible");
    assert.equal(clips[0].node, body);
    assert.deepEqual(
      { top: clips[0].top, right: clips[0].right, bottom: clips[0].bottom, left: clips[0].left, clipX: clips[0].clipX, clipY: clips[0].clipY },
      { top: 130, right: 356, bottom: 530, left: 16, clipX: true, clipY: true },
      "a taller header moves the clip down, and a visible cross axis still clips",
    );
    assert.equal(cardCss.overflow, "hidden");
    assert.equal(cardCss.borderTopWidth, "1px");
    assert.equal(clips[1].node, card);
    assert.deepEqual(
      { top: clips[1].top, right: clips[1].right, bottom: clips[1].bottom, left: clips[1].left, clipX: clips[1].clipX, clipY: clips[1].clipY },
      { top: 81, right: 309, bottom: 239, left: 11, clipX: true, clipY: true },
      `shorthand overflow ${cardCss.overflow} (${cardCss.overflowX}/${cardCss.overflowY}) still clips inside the border`,
    );
    assert.equal(clips.some(clip => clip.node === hole || clip.node === nan || clip.node === gap), false);
  } finally { window.close(); }
});

test("body fades follow the visible edge at the top, middle, end, and while moving", () => {
  const clips = [bodyClip, cardClip];
  const place = (overflow: { above: boolean; below: boolean }, moving = false, scroller = scrolled, extra: BodyFadeClip[] = []) => bodyFadeBox({
    anchorTop: 0,
    anchorLeft: 0,
    scroller,
    clips: [...clips, ...extra],
    overflow,
    moving,
  });

  const top = place({ above: false, below: true }, false, scrolled, [
    { top: 0, right: 0, bottom: 0, left: 0, clipX: true, clipY: true },
  ]);
  assert.equal(top.above.show, false);
  assert.deepEqual(top.below, { show: true, top: 215, left: 24, width: 285, height: 24 });

  const mid = place({ above: true, below: true });
  assert.deepEqual(mid.above, { show: true, top: 100, left: 24, width: 285, height: 24 });
  assert.deepEqual(mid.below, { show: true, top: 215, left: 24, width: 285, height: 24 });

  const end = place({ above: true, below: false });
  assert.deepEqual(end.above, { show: true, top: 100, left: 24, width: 285, height: 24 });
  assert.deepEqual(end.below, { show: true, top: 215, left: 24, width: 285, height: 24 });

  const tall = bodyFadeBox({
    anchorTop: 0,
    anchorLeft: 0,
    scroller: { top: 40, right: 344, bottom: 344, left: 24 },
    clips: [
      { top: 130, right: 356, bottom: 530, left: 16, clipX: true, clipY: true },
      cardClip,
    ],
    overflow: { above: false, below: true },
    moving: false,
  });
  assert.deepEqual(tall.above, { show: true, top: 130, left: 24, width: 285, height: 24 });
  assert.deepEqual(tall.below, { show: true, top: 215, left: 24, width: 285, height: 24 });

  const horizontal = bodyFadeBox({
    anchorTop: 0,
    anchorLeft: 0,
    scroller: scrolled,
    clips: [{ top: 81, right: 309, bottom: 239, left: 11, clipX: true, clipY: false }],
    overflow: { above: false, below: true },
    moving: false,
  });
  assert.equal(horizontal.above.show, false);
  assert.deepEqual(horizontal.below, { show: true, top: 380, left: 24, width: 285, height: 24 });

  const vertical = bodyFadeBox({
    anchorTop: 0,
    anchorLeft: 0,
    scroller: scrolled,
    clips: [{ top: 81, right: 309, bottom: 239, left: 11, clipX: false, clipY: true }],
    overflow: { above: false, below: true },
    moving: false,
  });
  assert.deepEqual(vertical.below, { show: true, top: 215, left: 24, width: 320, height: 24 });

  const open = bodyFadeBox({
    anchorTop: 40,
    anchorLeft: 0,
    scroller: { top: 180, right: 344, bottom: 468, left: 24 },
    clips: [],
    overflow: { above: false, below: true },
    moving: false,
  });
  assert.equal(open.above.show, false);
  assert.deepEqual(open.below, { show: true, top: 404, left: 24, width: 320, height: 24 });
  const openEnd = bodyFadeBox({
    anchorTop: 40,
    anchorLeft: 0,
    scroller: { top: 180, right: 344, bottom: 468, left: 24 },
    clips: [],
    overflow: { above: true, below: false },
    moving: false,
  });
  assert.deepEqual(openEnd.above, { show: true, top: 140, left: 24, width: 320, height: 24 });
  assert.equal(openEnd.below.show, false);

  const short = bodyFadeBox({
    anchorTop: 0,
    anchorLeft: 0,
    scroller: { top: 100, right: 344, bottom: 180, left: 24 },
    clips: [],
    overflow: { above: false, below: true },
    moving: false,
  });
  assert.deepEqual(short.below, { show: true, top: 160, left: 24, width: 320, height: 20 });

  const missed = place({ above: true, below: true }, false, { top: 300, right: 344, bottom: 340, left: 24 });
  assert.equal(missed.above.show, false);
  assert.equal(missed.below.show, false);
  const beside = place({ above: true, below: true }, false, { top: 100, right: 520, bottom: 404, left: 400 });
  assert.equal(beside.above.show, false);
  assert.equal(beside.below.show, false);

  const moving = place({ above: true, below: true }, true);
  assert.equal(moving.above.show, false);
  assert.equal(moving.below.show, false);
});

/** jsdom drops `background:linear-gradient(..., var(--bb-chat-ui-info-face), ...)` from CSSOM, so the applied sheet text is the check that fails if that face comes back. */
function appliedStyleRules(css: string) {
  const rules: { selector: string; body: string }[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("{", cursor);
    if (open < 0) break;
    let depth = 1;
    let end = open + 1;
    while (end < text.length && depth > 0) {
      if (text[end] === "{") depth += 1;
      else if (text[end] === "}") depth -= 1;
      end += 1;
    }
    const selector = text.slice(cursor, open).trim();
    if (selector && !selector.startsWith("@")) rules.push({ selector, body: text.slice(open + 1, end - 1) });
    cursor = end;
  }
  return rules;
}

test("a body fade blurs and masks without painting a second card face", () => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  const style = dom.window.document.createElement("style");
  style.textContent = composerInfoCss;
  dom.window.document.head.append(style);
  const sheet = style.sheet;
  assert.ok(sheet, "composerInfoCss was applied");
  const applied = appliedStyleRules(style.textContent ?? "");
  const fadeRules = applied.filter(rule => rule.selector.includes("data-bb-chat-ui-info-body-fade"));
  const omRules = [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule instanceof dom.window.CSSStyleRule);
  const fadeOm = omRules.filter(rule => rule.selectorText.includes("data-bb-chat-ui-info-body-fade"));
  try {
    assert.ok(fadeRules.length >= 4, fadeRules.map(rule => rule.selector).join("\n"));
    for (const rule of fadeRules) {
      for (const declaration of rule.body.split(";").map(part => part.trim()).filter(Boolean)) {
        const name = declaration.slice(0, declaration.indexOf(":")).trim().toLowerCase();
        assert.equal(name === "background" || name.startsWith("background-"), false, `${rule.selector} ${declaration}`);
      }
      assert.doesNotMatch(rule.body, /--bb-chat-ui-info-face/, rule.selector);
    }
    const base = fadeRules.find(rule => rule.selector === "[data-bb-chat-ui-info-body-fade]");
    assert.ok(base);
    assert.match(base.body, /backdrop-filter:blur\(5px\)/);
    assert.match(base.body, /-webkit-backdrop-filter:blur\(5px\)/);
    for (const edge of ["above", "below"]) {
      const rule = fadeRules.find(item => item.selector.includes(`body-fade="${edge}"`));
      assert.ok(rule, edge);
      assert.match(rule.body, /mask-image:linear-gradient/);
      assert.match(rule.body, /-webkit-mask-image:linear-gradient/);
    }
    const hint = applied.find(rule => rule.selector.includes('scroll-hint="top"'));
    assert.ok(hint, "the popover scroll hint is a different surface");
    assert.match(hint.body, /background:linear-gradient\([^)]*--bb-chat-ui-info-face/);
    const baseOm = fadeOm.find(rule => rule.selectorText === "[data-bb-chat-ui-info-body-fade]");
    assert.ok(baseOm);
    assert.match(baseOm.style.getPropertyValue("backdrop-filter"), /blur\(5px\)/);
    assert.equal(baseOm.style.getPropertyValue("background"), "");
    for (const edge of ["above", "below"]) {
      const rule = fadeOm.find(item => item.selectorText.includes(`body-fade="${edge}"`));
      assert.ok(rule, edge);
      assert.match(rule.style.getPropertyValue("mask-image"), /linear-gradient/);
      assert.equal(rule.style.getPropertyValue("background-image"), "");
    }
  } finally { dom.window.close(); }
});
