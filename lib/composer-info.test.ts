import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { injectComposerInfo, fitComposerInfo } from "./composer-info.ts";
import { infoKinds } from "./composer-info-settings.ts";

function fixture() {
  const dom = new JSDOM(`<html><head></head><body><div data-scroll-footer><div class="chat-prompt-box"><div data-promptbox-shell><div class="grid">
    <div style="display:contents"><span hidden data-bb-chat-ui-info-settings='{}'></span></div>
    <div class="space-y-2"><section aria-label="Child threads"><button id="thread-prompt-banner-child-threads-toggle" aria-expanded="false" aria-label="Active child thread: Review" aria-controls="children">Review</button><div id="children" hidden><a href="/review">Review</a></div></section>
    <section aria-label="Thread context before sending"><button id="thread-prompt-banner-git-toggle">+12 −4 · 3 files</button><a aria-label="Pull request 12: Open" href="https://example.com/pr/12">#12</a></section></div>
    <section aria-label="Goal"><button aria-expanded="false" aria-controls="goal">Goal</button><div id="goal" hidden>Ship composer</div><button aria-label="Clear active Goal">Clear</button></section>
    <section aria-label="To-do list"><button aria-expanded="false" aria-controls="todos">2/5 complete</button><div id="todos" hidden>Verify mobile</div></section>
    <div><div class="plugin-banner">An unknown plugin notice <button>Open notice</button></div></div>
    <section aria-label="Queued messages"><header data-queued-messages-mode="collapsed"><button aria-expanded="false" aria-controls="queue">2</button></header><div id="queue" hidden><div data-queued-messages-scroll-frame><button>Edit message</button></div></div></section>
  </div><div data-follow-up-composer-anchor><div data-follow-up-composer><textarea>keep draft</textarea></div></div></div></div></div></body></html>`, { pretendToBeVisual: true });
  const { document } = dom.window;
  for (const toggle of document.querySelectorAll('button[aria-expanded]')) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      const body = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
      if (body) body.hidden = !expanded;
    });
  }
  const tick = () => new Promise<void>(resolve => dom.window.setTimeout(resolve, 35));
  const click = (selector: string) => {
    const button = document.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, selector);
    button.click();
    return button;
  };
  return { dom, document, tick, click };
}

test("overflow reserves the all-information button and prefers Diff and children", () => {
  const items = [
    { key: "goal", width: 70 }, { key: "children", width: 75 },
    { key: "diff", width: 140 }, { key: "todos", width: 60 },
  ];
  assert.deepEqual(fitComposerInfo(items, 270), ["diff", "children"]);
  assert.deepEqual(fitComposerInfo(items, 390), ["diff", "children", "goal"]);
  assert.deepEqual(fitComposerInfo(items, 120), ["children"]);
  assert.deepEqual(fitComposerInfo(items, 30), []);
});

test("an empty composer lists every information family without inventing summary data", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  for (const node of Array.from(stack.children).slice(1)) node.remove();
  const stop = injectComposerInfo(f.document);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger]'), null);
  f.click('[aria-label^="전체 정보"]');
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice]').length, infoKinds.length);
  for (const kind of infoKinds) {
    const choice = f.document.querySelector(`[data-bb-chat-ui-info-choice="${kind.key}"]`)!;
    assert.ok(choice.textContent?.includes(kind.label));
    assert.ok(choice.textContent?.includes('현재 없음'));
  }
  f.click('[data-bb-chat-ui-info-choice="diff"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-empty="diff"]')?.textContent?.includes('현재 정보 없음'));
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-menu]').length, 1);
  assert.equal(f.document.activeElement?.getAttribute('aria-label'), 'Code Diff 닫기');
  f.document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-menu]'), null);
  assert.ok(f.document.activeElement?.hasAttribute('data-bb-chat-ui-info-all'));
  stop();
  f.dom.window.close();
});

test("an empty disclosure switches to real information when it arrives", async () => {
  const f = fixture();
  const goal = f.document.querySelector('section[aria-label="Goal"]')!;
  const parent = goal.parentElement!;
  goal.remove();
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="goal"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-empty="goal"]'));
  parent.append(goal);
  await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-empty]'), null);
  assert.ok(goal.hasAttribute('data-bb-chat-ui-info-open'));
  assert.equal(goal.querySelector('[aria-expanded]')!.getAttribute('aria-expanded'), 'true');
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 1);
  stop();
  f.dom.window.close();
});

test("all information stays reachable; host controls and parents survive a single detail disclosure", async () => {
  const f = fixture();
  const goal = f.document.querySelector('section[aria-label="Goal"]')!;
  const parent = goal.parentElement;
  let cleared = 0;
  goal.querySelector('button[aria-label="Clear active Goal"]')!.addEventListener("click", () => cleared++);
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-menu]'));
  for (const key of ["diff", "children", "goal", "todos", "pullRequest", "other", "queue"]) {
    assert.ok(f.document.querySelector(`[data-bb-chat-ui-info-choice="${key}"]`), key);
  }
  f.click('[data-bb-chat-ui-info-choice="goal"]');
  await f.tick();
  assert.equal(goal.querySelector('[aria-expanded]')!.getAttribute("aria-expanded"), "true");
  assert.equal(goal.parentElement, parent);
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 1);
  f.click('[aria-label="Clear active Goal"]');
  assert.equal(cleared, 1);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="todos"]');
  await f.tick();
  assert.equal(goal.querySelector('[aria-expanded]')!.getAttribute("aria-expanded"), "false");
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 1);
  f.document.dispatchEvent(new f.dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await f.tick();
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 0);
  stop();
  assert.equal(goal.parentElement, parent);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-bar]'), null);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-unit]'), null);
  assert.equal(f.document.querySelector('textarea')!.value, "keep draft");
  f.dom.window.close();
});

test("settings change exposed summaries without removing menu entries or losing Diff action", async () => {
  const f = fixture();
  let diffOpened = 0;
  f.document.querySelector('#thread-prompt-banner-git-toggle')!.addEventListener("click", () => diffOpened++);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.equal(diffOpened, 0);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-diff]')?.textContent?.includes('+12 −4 · 3 files'));
  f.click('[data-bb-chat-ui-info-action="diff"]');
  assert.equal(diffOpened, 1);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), null);
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute("data-bb-chat-ui-info-settings", JSON.stringify({ showDiff: false, showGoal: true }));
  await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'), null);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="goal"]'));
  f.click('[aria-label^="전체 정보"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="diff"]'));
  stop();
  f.dom.window.close();
});

test("Diff first opens one dismissible popover from either the pill or the catalog", async () => {
  const f = fixture();
  let diffOpened = 0;
  const native = f.document.querySelector('#thread-prompt-banner-git-toggle')!;
  const parent = native.parentElement;
  native.addEventListener('click', () => diffOpened++);
  const stop = injectComposerInfo(f.document);
  const pill = f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.equal(pill.getAttribute('aria-expanded'), 'true');
  assert.equal(diffOpened, 0);
  assert.equal(native.parentElement, parent);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-menu]'), null);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="diff"]');
  assert.equal(diffOpened, 0);
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-menu]').length, 1);
  assert.equal(f.document.activeElement?.getAttribute('aria-label'), 'Code Diff 닫기');
  native.textContent = '+20 −5 · 4 files';
  await f.tick();
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-diff]')?.textContent?.includes('+20 −5 · 4 files'));
  f.document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-menu]'), null);
  assert.equal(diffOpened, 0);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  f.click('[data-bb-chat-ui-info-trigger="children"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), null);
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 1);
  stop(); f.dom.window.close();
});

test("read-only Diff summaries show real branch information and defer the scoped panel action", async t => {
  const f = fixture();
  const previousButton = Object.getOwnPropertyDescriptor(globalThis, 'HTMLButtonElement');
  Object.defineProperty(globalThis, 'HTMLButtonElement', { configurable:true, value:f.dom.window.HTMLButtonElement });
  t.after(() => {
    if (previousButton) Object.defineProperty(globalThis, 'HTMLButtonElement', previousButton);
    else Reflect.deleteProperty(globalThis, 'HTMLButtonElement');
  });
  f.document.querySelector('section[aria-label="Thread context before sending"]')!.remove();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const source = f.document.createElement('span');
  source.hidden = true;
  source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify({ insertions:8, deletions:2, files:3, branch:'bb/review' }));
  stack.append(source);
  const panel = f.document.createElement('button');
  panel.setAttribute('aria-label', 'Show diff panel');
  panel.getClientRects = () => [new f.dom.window.DOMRect(0,0,32,32)] as unknown as DOMRectList;
  f.document.body.append(panel);
  let opened = 0;
  panel.addEventListener('click', () => opened++);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.equal(opened, 0);
  const popover = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  assert.ok(popover.textContent?.includes('+8 −2 · 3 files'));
  assert.ok(popover.textContent?.includes('Branch · bb/review'));
  f.click('[data-bb-chat-ui-info-action="diff"]');
  assert.equal(opened, 1);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), null);
  stop(); f.dom.window.close();
});

test("visibility settings remove disabled live and empty families from the row and catalog", async () => {
  const f = fixture();
  const stop = injectComposerInfo(f.document);
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="goal"]');
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'끄기', showDiff:'끄기', showWorkflow:'끄기', showChildren:'목록에만 표시' }));
  await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-open]'), null);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'), null);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="children"]'), null);
  f.click('[aria-label^="전체 정보"]');
  for (const key of ['diff','goal','workflow']) assert.equal(f.document.querySelector(`[data-bb-chat-ui-info-choice="${key}"]`), null, key);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="children"]'));
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice]').length, infoKinds.length - 3);
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'상단 표시', showWorkflow:'목록에만 표시' }));
  await f.tick();
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="goal"]'));
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="workflow"]')?.textContent?.includes('현재 없음'));
  f.click('[data-bb-chat-ui-info-choice="workflow"]');
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showWorkflow:'끄기' }));
  await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-empty]'), null);
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify(Object.fromEntries(infoKinds.map(kind => [kind.setting,'끄기']))));
  await f.tick();
  assert.equal((f.document.querySelector('[data-bb-chat-ui-info-bar]') as HTMLElement).hidden, true);
  assert.equal(f.document.querySelector('textarea')!.value, 'keep draft');
  source.setAttribute('data-bb-chat-ui-info-settings', '{}');
  await f.tick();
  assert.equal((f.document.querySelector('[data-bb-chat-ui-info-bar]') as HTMLElement).hidden, false);
  stop(); f.dom.window.close();
});

test("disabling the queue preserves an in-progress edit and hides its detail when editing ends", async () => {
  const f = fixture();
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  const queue = f.document.querySelector('section[aria-label="Queued messages"]')!;
  queue.insertAdjacentHTML('beforeend', '<textarea data-queued-message-inline-editor>unsaved edit</textarea>');
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showQueue:'끄기' }));
  await f.tick();
  assert.ok(queue.hasAttribute('data-bb-chat-ui-info-open'));
  assert.equal(queue.querySelector('textarea')!.value, 'unsaved edit');
  queue.querySelector('textarea')!.remove();
  await f.tick();
  assert.equal(queue.hasAttribute('data-bb-chat-ui-info-open'), false);
  f.click('[aria-label^="전체 정보"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-choice="queue"]'), null);
  stop(); f.dom.window.close();
});

test("current and child requests suppress information and the editor, and resolution restores the draft", async () => {
  for (const id of ["tool-use-ask", "plugin-request-banner", "plan-review-request", "approval-banner", "user-question-banner", "plan-review-banner"]) {
    const f = fixture();
    const stop = injectComposerInfo(f.document);
    const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
    const request = f.document.createElement("section");
    request.setAttribute("data-testid", id);
    request.setAttribute("aria-label", "Needs your input");
    request.innerHTML = '<button>Answer</button>';
    stack.prepend(request);
    await f.tick();
    assert.ok(stack.hasAttribute("data-bb-chat-ui-info-request"));
    assert.equal(request.hasAttribute("data-bb-chat-ui-info-unit"), false);
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-bar]')!.getAttribute("hidden"), "");
    request.remove();
    await f.tick();
    assert.equal(stack.hasAttribute("data-bb-chat-ui-info-request"), false);
    assert.equal(f.document.querySelector('textarea')!.value, "keep draft");
    stop();
    f.dom.window.close();
  }
});

test("two plugin notices are separately reachable, and unloading keeps a queue edit open", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const second = f.document.createElement("section");
  second.setAttribute("aria-label", "Second plugin notice");
  second.innerHTML = '<button>Act on second notice</button>';
  stack.append(second);
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  const choices = f.document.querySelectorAll<HTMLButtonElement>('[data-bb-chat-ui-info-choice="other"]');
  assert.equal(choices.length, 2);
  choices[1].click();
  assert.ok(second.hasAttribute("data-bb-chat-ui-info-open"));
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  const queue = f.document.querySelector('section[aria-label="Queued messages"]')!;
  queue.insertAdjacentHTML("beforeend", '<textarea data-queued-message-inline-editor>draft edit</textarea>');
  stop();
  assert.equal(queue.querySelector('[aria-expanded]')!.getAttribute('aria-expanded'), 'true');
  assert.equal(queue.querySelector('textarea')!.value, 'draft edit');
  f.dom.window.close();
});

test("queue editing blocks detail replacement and dismissal until editing finishes", async () => {
  const f = fixture();
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  await f.tick();
  const queue = f.document.querySelector('section[aria-label="Queued messages"]')!;
  const editor = f.document.createElement("textarea");
  editor.setAttribute("data-queued-message-inline-editor", "");
  editor.value = "unsaved edit";
  queue.append(editor);
  f.click('[data-bb-chat-ui-info-trigger="children"]');
  f.document.dispatchEvent(new f.dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await f.tick();
  assert.ok(queue.hasAttribute("data-bb-chat-ui-info-open"));
  assert.equal(editor.value, "unsaved edit");
  editor.remove();
  f.click('[data-bb-chat-ui-info-trigger="children"]');
  await f.tick();
  assert.equal(queue.hasAttribute("data-bb-chat-ui-info-open"), false);
  stop();
  f.dom.window.close();
});

test("archived stack-only composer retains supplementary data and native restore actions", async () => {
  const f = fixture();
  f.document.querySelector('[data-follow-up-composer-anchor]')!.remove();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const status = f.document.createElement("section");
  status.setAttribute("aria-label", "Thread archived");
  status.innerHTML = '<button>Unarchive</button>';
  stack.append(status);
  let restored = 0;
  status.querySelector('button')!.addEventListener('click', () => restored++);
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="status"]');
  f.click('[aria-label="Thread archived"] button');
  assert.equal(restored, 1);
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-open]').length, 1);
  stop();
  f.dom.window.close();
});

test("read-only supplements remain available without replacing native editable cards", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  stack.insertAdjacentHTML("beforeend", `<div data-bb-chat-ui-info-supplements>
    <section data-bb-chat-ui-info-kind="goal" aria-label="Goal"><p>Read-only Goal snapshot</p></section>
    <section data-bb-chat-ui-info-kind="plan" aria-label="Plan"><p>Archived plan text</p></section>
  </div>`);
  const stop = injectComposerInfo(f.document);
  f.click('[aria-label^="전체 정보"]');
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice="goal"]').length, 1);
  f.click('[data-bb-chat-ui-info-choice="goal"]');
  assert.ok(f.document.querySelector('section[aria-label="Goal"]:not([data-bb-chat-ui-info-kind])')!.hasAttribute('data-bb-chat-ui-info-open'));
  f.click('[aria-label^="전체 정보"]');
  f.click('[data-bb-chat-ui-info-choice="plan"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-kind="plan"]')!.hasAttribute('data-bb-chat-ui-info-open'));
  stop();
  f.dom.window.close();
});

test("remounts and two composer scopes do not leak disclosures or hide each other's requests", async () => {
  const f = fixture();
  const shell = f.document.querySelector('[data-promptbox-shell]')!;
  const other = shell.cloneNode(true) as HTMLElement;
  f.document.body.append(other);
  const stop = injectComposerInfo(f.document);
  const bars = f.document.querySelectorAll('[data-bb-chat-ui-info-bar]');
  assert.equal(bars.length, 2);
  (bars[0].querySelector('[data-bb-chat-ui-info-all]') as HTMLButtonElement).click();
  assert.equal(other.querySelector('[data-bb-chat-ui-info-menu]'), null);
  other.querySelector('.grid')!.insertAdjacentHTML('afterbegin', '<section data-testid="user-question-banner"><button>Answer</button></section>');
  await f.tick();
  assert.equal(shell.querySelector('.grid')!.hasAttribute('data-bb-chat-ui-info-request'), false);
  assert.equal(other.querySelector('.grid')!.hasAttribute('data-bb-chat-ui-info-request'), true);
  shell.remove();
  await f.tick();
  assert.equal(shell.querySelector('[data-bb-chat-ui-info-bar]'), null);
  stop();
  assert.equal(other.querySelector('[data-bb-chat-ui-info-unit]'), null);
  f.dom.window.close();
});
