import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { fileStatusIcon } from "./composer-diff-icons.ts";

test("changed files use BB thread information glyphs and status colors", () => {
  const dom = new JSDOM();
  const cases = [
    ['M', 'DiffModified', 'text-subtle-foreground'],
    ['A', 'DiffAdded', 'text-diff-added'],
    ['??', 'DiffAdded', 'text-diff-added'],
    ['D', 'DiffRemoved', 'text-diff-removed'],
    ['R', 'DiffRenamed', 'text-subtle-foreground'],
    ['C', 'Copy', 'text-subtle-foreground'],
    ['U', 'DiffConflict', 'text-destructive'],
    ['?', 'CircleQuestion', 'text-subtle-foreground'],
  ];
  for (const [status, glyph, color] of cases) {
    const icon = fileStatusIcon(dom.window.document, status);
    assert.equal(icon.getAttribute('data-icon'), glyph);
    assert.ok(icon.classList.contains(color));
    assert.equal(icon.getAttribute('role'), 'img');
    assert.ok(icon.getAttribute('aria-label'));
    assert.equal(icon.getAttribute('data-bb-chat-ui-info-file-status'), status);
  }
  const added = fileStatusIcon(dom.window.document, 'A');
  const untracked = fileStatusIcon(dom.window.document, '??');
  assert.deepEqual([...added.children].map(node => node.outerHTML), [...untracked.children].map(node => node.outerHTML));
  // Geometry from BB's DiffRenamed / SquareArrowRight01 glyph, not a straight arrow.
  assert.ok(fileStatusIcon(dom.window.document, 'R').querySelector('path[d="M10 7C10 7 14 10.6824 14 12C14 13.3176 10 17 10 17"]'));
  assert.equal(fileStatusIcon(dom.window.document, '?').querySelector('circle')?.getAttribute('r'), '10');
  dom.window.close();
});
