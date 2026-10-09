import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { injectComposerInfo, fitComposerInfo, composerInfoCss } from "./composer-info.ts";
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

test("default settings expose all available information while empty families stay catalog-only", () => {
  const f = fixture();
  const stop = injectComposerInfo(f.document);
  try {
    assert.deepEqual([...f.document.querySelectorAll('[data-bb-chat-ui-info-trigger]')].map(node => node.getAttribute('data-bb-chat-ui-info-trigger')), ['diff','children','goal','todos','queue','pullRequest','other']);
    f.click('[data-bb-chat-ui-info-all]');
    assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice]').length,infoKinds.length);
    assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="plan"][data-bb-chat-ui-info-unavailable]'));
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="plan"]'),null);
  } finally { stop(); f.dom.window.close(); }
});

test("native popovers replace only their bottom collapse with a small close without ending Plan or Goal", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const cards: { kind:string; node:HTMLElement; toggle:HTMLButtonElement; collapse:HTMLButtonElement }[] = [];
  let ended = 0;
  for (const [kind, label] of [['plan','Prompt mode'], ['goal','Goal'], ['todos','To-do list'], ['workflow','Workflow'], ['background','Background commands'], ['machine','Machine status'], ['status','Thread history']]) {
    stack.querySelector(`section[aria-label="${label}"]`)?.remove();
    const node = f.document.createElement('section'); node.setAttribute('aria-label',label);
    node.innerHTML = `<div role="group"><button ${kind === 'machine' ? 'id="machine-status-toggle"' : ''} aria-expanded="false" aria-controls="${kind}-body">${label}</button><button aria-label="${kind === 'plan' ? 'Exit plan mode' : 'Clear active Goal'}">End</button></div><div id="${kind}-body" hidden><h3>Body heading</h3><p>Details</p><button aria-label="Collapse internal list" aria-expanded="true" aria-controls="internal-${kind}">Internal fold</button><div id="internal-${kind}">Items</div><div class="px-1 pb-1"><button aria-label="Collapse ${label}" aria-expanded="true" aria-controls="${kind}-body">Collapse</button></div></div>`;
    const toggle = node.querySelector<HTMLButtonElement>('button')!;
    const collapse = node.querySelector<HTMLButtonElement>(`button[aria-label="Collapse ${label}"]`)!;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded',String(expanded));
      node.querySelector<HTMLElement>(`#${kind}-body`)!.hidden = !expanded;
    });
    collapse.addEventListener('click', () => toggle.click());
    node.querySelector('button[aria-label="Exit plan mode"], button[aria-label="Clear active Goal"]')!.addEventListener('click', () => ended++);
    stack.append(node); cards.push({kind,node,toggle,collapse});
  }
  const stop = injectComposerInfo(f.document);
  try {
    for (const {kind,node,toggle,collapse} of cards) {
      f.click('[data-bb-chat-ui-info-all]');
      f.click(`[data-bb-chat-ui-info-choice="${kind}"]`);
      await f.tick();
      assert.equal(f.dom.window.getComputedStyle(collapse.parentElement!).display,'none',`${kind}: the standalone bottom handle takes no space`);
      assert.notEqual(f.dom.window.getComputedStyle(node.querySelector('[aria-label="Collapse internal list"]')!).display,'none','internal list folds remain available');
      const dismiss = node.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-native-dismiss]');
      assert.ok(dismiss,`${kind}: a dedicated visual close is present`);
      assert.equal(dismiss.textContent,'×');
      assert.equal(node.querySelector('[data-bb-chat-ui-info-close-heading]'),toggle.parentElement,'reserve close space beside the actual title, not a heading in the body');
      assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-native-dismiss]').length,1);
      dismiss.click();
      assert.equal(toggle.getAttribute('aria-expanded'),'false');
      assert.equal(node.hasAttribute('data-bb-chat-ui-info-open'),false);
      assert.equal(ended,0,'closing the popover never ends Plan or clears Goal');
    }
    stop();
    for (const {node,collapse} of cards) {
      assert.equal(node.querySelector('[data-bb-chat-ui-info-native-dismiss]'),null);
      assert.equal(collapse.hasAttribute('data-bb-chat-ui-info-collapse'),false);
      assert.notEqual(f.dom.window.getComputedStyle(collapse.parentElement!).display,'none','unload restores native controls');
    }
  } finally { stop(); f.dom.window.close(); }
});

test("native close survives header replacement and keeps genuine actions on their original parents", async () => {
  const f = fixture();
  const node = f.document.querySelector<HTMLElement>('section[aria-label="Goal"]')!;
  const originalAction = node.querySelector('[aria-label="Clear active Goal"]')!;
  const originalParent = originalAction.parentElement;
  const stop = injectComposerInfo(f.document);
  try {
    f.click('[data-bb-chat-ui-info-all]'); f.click('[data-bb-chat-ui-info-choice="goal"]'); await f.tick();
    node.querySelector('[data-bb-chat-ui-info-native-dismiss]')!.remove();
    node.querySelector('button[aria-expanded]')!.textContent = 'Updated Goal';
    await f.tick();
    assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-native-dismiss]').length,1);
    assert.equal(originalAction.parentElement,originalParent);
    f.click('[data-bb-chat-ui-info-native-dismiss]');
    assert.equal(node.hasAttribute('data-bb-chat-ui-info-open'),false);
  } finally { stop(); f.dom.window.close(); }
});

test("the Workflow stack collapse is hidden without becoming another information entry", () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const wrapper = f.document.createElement('div');
  wrapper.innerHTML = '<div id="workflow-stack"><section aria-label="Workflow"><button aria-expanded="false" aria-controls="workflow-detail">Workflow A</button><div id="workflow-detail" hidden>Phase A</div></section></div><button aria-label="Collapse 2 workflows" aria-expanded="true" aria-controls="workflow-stack">Collapse stack</button>';
  stack.append(wrapper);
  const collapse = wrapper.querySelector('[aria-label="Collapse 2 workflows"]')!;
  const stop = injectComposerInfo(f.document);
  try {
    assert.equal(f.dom.window.getComputedStyle(collapse).display,'none');
    assert.equal(collapse.hasAttribute('data-bb-chat-ui-info-unit'),false,'a stack close is not plugin information');
    f.click('[data-bb-chat-ui-info-all]');
    assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice="workflow"]').length,1);
    assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-choice="other"]').length,1,'only the actual plugin notice stays in the catalog');
  } finally { stop(); }
  assert.notEqual(f.dom.window.getComputedStyle(collapse).display,'none');
  f.dom.window.close();
});

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

test("pills use a sequential droplet entrance once, preserving avatar motion and cancelling on unload", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'상단 표시', showQueue:'상단 표시' }));
  source.setAttribute('data-bb-chat-ui-info-children', JSON.stringify([1,2,3].map(id => ({ id:String(id),title:`Child ${id}`,state:'run' }))));
  const entries: { key:string; frames:Keyframe[]; options:KeyframeAnimationOptions; cancelled:boolean }[] = [];
  f.dom.window.HTMLElement.prototype.animate = function(frames, options) {
    const key = this.getAttribute('data-bb-chat-ui-info-trigger');
    const entry = { key:key ?? 'orb', frames:frames as Keyframe[], options:options as KeyframeAnimationOptions, cancelled:false };
    entries.push(entry);
    return { cancel:() => { entry.cancelled = true; } } as Animation;
  };
  const stop = injectComposerInfo(f.document);
  const pills = () => entries.filter(entry => entry.key !== 'orb' && entry.options.duration === 460);
  const visible = ['diff', 'goal', 'todos', 'queue', 'pullRequest', 'other'];
  assert.deepEqual(pills().map(entry => entry.key), visible);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-avatar][data-new]'), 'avatars retain their existing individual bubbles');
  assert.deepEqual(pills()[0].frames.map(frame => frame.transform), [
    'translateY(8px) scale(.82,.72)', 'translateY(-4px) scale(.94,1.16)',
    'translateY(0) scale(1.1,.94)', 'translateY(-1px) scale(.985,1.015)', 'none',
  ]);
  assert.deepEqual(pills()[0].frames.map(frame => frame.offset), [0,.35,.65,.82,1], 'stretch, landing squash and gentle recovery fit inside one quick entrance');
  assert.equal(pills()[0].options.duration, 460);
  assert.deepEqual(pills().map(entry => entry.options.delay), [0,180,225,270,315,360], 'visible pills and child avatars enter from left to right in 45ms steps');
  assert.ok(pills().every(entry => entry.options.fill === 'backwards'), 'delayed pills hold their starting pose until their turn');
  assert.deepEqual([...f.document.querySelectorAll<HTMLElement>('[data-bb-chat-ui-info-avatar][data-new]')].map(avatar => avatar.style.animationDelay), ['45ms','90ms','135ms']);
  assert.equal(pills()[0].frames[0].easing, 'cubic-bezier(.36,0,.18,1)');
  assert.equal(pills()[0].frames[1].easing, 'cubic-bezier(.36,0,.18,1)', 'each segment slows to zero at the turn and the end');
  assert.match(composerInfoCss, /animation:bb-info-droplet 460ms cubic-bezier\(\.36,0,\.18,1\) backwards/);
  assert.match(composerInfoCss, /35% \{ transform:translateY\(-4px\) scale\(\.94,1\.16\); \} 65% \{ transform:translateY\(0\) scale\(1\.1,\.94\); \} 82% \{ transform:translateY\(-1px\) scale\(\.985,1\.015\); \} 100% \{ transform:none; \}/);
  const firstAvatar=f.document.querySelector('[data-bb-chat-ui-info-avatar][data-new]');
  f.document.querySelector('#thread-prompt-banner-git-toggle')!.textContent = '+14 −4 · 3 files';
  await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-avatar][data-new]'),firstAvatar,'unrelated Diff arrival keeps the in-progress avatar bubble alive');
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'끄기', showQueue:'상단 표시' }));
  await f.tick();
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'상단 표시', showQueue:'상단 표시' }));
  await f.tick();
  f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
  assert.deepEqual(pills().map(entry => entry.key), visible, 'refresh, re-enable and resize do not replay entry motion');
  assert.equal(entries.filter(entry => entry.key === 'orb' && entry.options.duration === 460).length,1,'the all-information button enters once after the pills');
  assert.equal(entries.find(entry => entry.key === 'orb')?.options.delay,405);
  assert.ok(entries.filter(entry => entry.key === 'orb' && entry.options.duration !== 460).every(entry => entry.options.duration === 360), 'activity reactions settle quickly too');
  stop();
  assert.ok(pills().every(entry => entry.cancelled), 'in-progress entry animations are cancelled on unload');
  f.dom.window.close();
});

test("pill bubbles wait for visible space and requests, and respect reduced motion", async () => {
  for (const reduced of [false, true]) {
    const f = fixture();
    Object.defineProperty(f.dom.window, 'matchMedia', { value:() => ({ matches:reduced }) });
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings', '{"showGoal":"상단 표시"}');
    Object.defineProperty(f.dom.window.HTMLElement.prototype, 'offsetWidth', { get:() => 120 });
    f.dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ width:10 } as DOMRect);
    const animated:string[] = [];
    f.dom.window.HTMLElement.prototype.animate = function(_frames,options) {
      const key = this.getAttribute('data-bb-chat-ui-info-trigger');
      if (key && (options as KeyframeAnimationOptions).duration === 460) animated.push(key);
      return { cancel() {} } as Animation;
    };
    const stack = f.document.querySelector<HTMLElement>('[data-promptbox-shell] > .grid')!;
    let width = 30;
    stack.getBoundingClientRect = () => ({ width } as DOMRect);
    const request = f.document.createElement('div'); request.setAttribute('data-testid','user-question-banner'); stack.append(request);
    const stop = injectComposerInfo(f.document);
    assert.deepEqual(animated, []);
    width = 200; f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
    assert.deepEqual(animated, [], 'hidden request state does not consume entry motion');
    request.remove(); await f.tick();
    assert.deepEqual(animated, reduced ? [] : ['diff']);
    assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-trigger="goal"]')!.hidden, true, 'bubble scale does not make overflow pills fit');
    width = 500; f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
    assert.deepEqual(animated, reduced ? [] : ['diff', 'goal'], 'an overflow pill waits until it first becomes visible');
    width = 200; f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
    width = 500; f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
    assert.deepEqual(animated, reduced ? [] : ['diff', 'goal']);
    stop(); f.dom.window.close();
  }
});

test("catalog entries retain their family icon with or without current information", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  for (const kind of infoKinds) source.insertAdjacentHTML('beforeend', `<span data-bb-chat-ui-info-icon="${kind.key}"><svg data-family="${kind.key}"><path d="M1 1h1" /></svg></span>`);
  f.document.querySelector('#thread-prompt-banner-child-threads-toggle')!.insertAdjacentHTML('afterbegin', '<svg data-chevron />');
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-all]');
  for (const kind of infoKinds) {
    const choice = f.document.querySelector(`[data-bb-chat-ui-info-choice="${kind.key}"]`)!;
    const icon = choice.querySelector('svg');
    assert.ok(icon, `${kind.label} has an icon even when no information is available`);
    assert.equal(icon.getAttribute('data-family'), kind.key);
    assert.equal(icon.getAttribute('aria-hidden'), 'true');
  }
  const goal = f.document.querySelector('section[aria-label="Goal"]')!;
  goal.remove();
  await f.tick();
  const emptyGoal = f.document.querySelector('[data-bb-chat-ui-info-choice="goal"]')!;
  assert.ok(emptyGoal.hasAttribute('data-bb-chat-ui-info-unavailable'));
  assert.ok(emptyGoal.querySelector('[data-family="goal"]'));
  stop(); f.dom.window.close();
});

test("queue pill uses its Clock family icon instead of the hidden native disclosure glyph", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', '{"showQueue":"상단 표시"}');
  source.insertAdjacentHTML('beforeend', '<span data-bb-chat-ui-info-icon="queue"><svg data-icon="Clock"><path d="M12 6v6h4" /></svg></span>');
  const toggle = f.document.querySelector('section[aria-label="Queued messages"] header button')!;
  toggle.insertAdjacentHTML('afterbegin', '<svg data-icon="ChevronDown" style="display:none"><path d="m6 9 6 6 6-6" /></svg>');
  const stop = injectComposerInfo(f.document);
  const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="queue"]')!;
  assert.ok(pill.querySelector('[data-icon="Clock"]'));
  assert.equal(pill.querySelector('[data-icon="ChevronDown"]'), null);
  assert.equal(f.dom.window.getComputedStyle(pill.querySelector('svg')!).display, 'inline');
  f.click('[data-bb-chat-ui-info-trigger="queue"]'); await f.tick();
  assert.ok(f.document.querySelector('section[aria-label="Queued messages"][data-bb-chat-ui-info-open]'));
  assert.ok(pill.querySelector('[data-icon="Clock"]'), 'expansion keeps the queue family icon');
  stop(); f.dom.window.close();
});

test("distinct family icons replace native duplicates in pills and the catalog, even when icons arrive late", async () => {
  const f=fixture();
  const stack=f.document.querySelector('[data-promptbox-shell] > .grid')!;
  stack.insertAdjacentHTML('beforeend','<section aria-label="Prompt mode"><button><svg data-native-icon="ListTodo" /></button>Plan</section><section aria-label="Thread history"><button><svg data-native-icon="MessageSquare" /></button>Status</section><section aria-label="Machine status"><button id="machine-status-toggle"><svg data-native-icon="Terminal" /></button>Machine</section>');
  f.document.querySelector('.plugin-banner button')!.insertAdjacentHTML('afterbegin','<svg data-native-icon="AlertTriangle" />');
  const source=f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  const stop=injectComposerInfo(f.document);
  try {
    for (const key of ['plan','status','machine','other']) source.insertAdjacentHTML('beforeend',`<span data-bb-chat-ui-info-icon="${key}"><svg data-family="${key}" /></span>`);
    await f.tick();
    for (const key of ['plan','status','machine','other']) {
      const pill=f.document.querySelector(`[data-bb-chat-ui-info-trigger="${key}"]`)!;
      assert.ok(pill.querySelector(`[data-family="${key}"]`),`${key}: the family artwork overrides the native duplicate`);
      assert.equal(pill.querySelector('[data-native-icon]'),null);
    }
    f.click('[data-bb-chat-ui-info-all]');
    for (const key of ['plan','status','machine','other']) assert.ok(f.document.querySelector(`[data-bb-chat-ui-info-choice="${key}"] [data-family="${key}"]`));
  } finally { stop(); f.dom.window.close(); }
});

test("popover scroll hints follow available content, including nested scroll areas, and are cleaned up", async () => {
  const f = fixture();
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-all]');
  const menu = f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-menu]')!;
  // JSDOM does not derive overflowY from the popover's overflow shorthand.
  menu.style.overflowY = 'auto';
  let scrollHeight = 600;
  Object.defineProperties(menu, { scrollHeight:{ get:() => scrollHeight }, clientHeight:{ value:200 } });
  const hints = () => ['top', 'bottom'].map(edge => f.document.querySelector<HTMLElement>(`[data-bb-chat-ui-info-scroll-hint="${edge}"]`));
  const scroll = (node: HTMLElement, top: number) => { node.scrollTop = top; node.dispatchEvent(new f.dom.window.Event('scroll')); };
  scroll(menu, 0);
  assert.deepEqual(hints().map(node => node?.hidden), [true, false]);
  scroll(menu, 120);
  assert.deepEqual(hints().map(node => node?.hidden), [false, false]);
  scroll(menu, 400);
  assert.deepEqual(hints().map(node => node?.hidden), [false, true]);
  scrollHeight = 200;
  scroll(menu, 0);
  assert.deepEqual(hints().map(node => node?.hidden), [true, true]);
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  const frame = f.document.querySelector<HTMLElement>('[data-queued-messages-scroll-frame]')!;
  frame.style.overflowY = 'auto';
  Object.defineProperties(frame, { scrollHeight:{ value:500 }, clientHeight:{ value:180 } });
  scroll(frame, 0);
  assert.deepEqual(hints().map(node => node?.hidden), [true, false]);
  scroll(frame, 320);
  assert.deepEqual(hints().map(node => node?.hidden), [false, true]);
  f.document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  assert.deepEqual(hints().map(node => node?.hidden), [true, true]);
  const before = frame.parentElement;
  stop();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-scroll-hint]'), null);
  assert.equal(frame.parentElement, before, 'native scroll content keeps its original parent');
  f.dom.window.close();
});

test("popover wheel scrolling stays inside its scrollable root and nested editors, including empty and edge states", () => {
  const f = fixture();
  let chatWheels = 0;
  f.document.body.addEventListener('wheel', () => { chatWheels++; });
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-all]');
  const menu = f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-menu]')!;
  menu.style.overflowY = 'auto';
  let height = 600;
  Object.defineProperties(menu, { scrollHeight:{ get:() => height }, clientHeight:{ value:200 } });
  const wheel = (target:Element, deltaY:number) => {
    const event = new f.dom.window.WheelEvent('wheel', { deltaY, bubbles:true, cancelable:true });
    target.dispatchEvent(event); return event;
  };
  menu.scrollTop = 100;
  assert.equal(wheel(menu.querySelector('button')!,100).defaultPrevented,false,'native scrolling works inside the popup');
  assert.equal(chatWheels,0,'ancestor chat handlers cannot process popup wheel events');
  menu.scrollTop = 400;
  assert.equal(wheel(menu,100).defaultPrevented,true,'bottom edge cannot chain to the chat');
  menu.scrollTop = 0;
  assert.equal(wheel(menu,-100).defaultPrevented,true,'top edge cannot chain to the chat');
  height = 200;
  assert.equal(wheel(menu,100).defaultPrevented,true,'a short popup cannot scroll the chat either');
  const editor = f.document.createElement('textarea'); editor.style.overflowY = 'auto'; menu.append(editor);
  Object.defineProperties(editor, { scrollHeight:{ value:500 }, clientHeight:{ value:100 } });
  assert.equal(wheel(editor,100).defaultPrevented,false,'nested editable content retains native scrolling');
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  const queue = f.document.querySelector<HTMLElement>('[data-queued-messages-scroll-frame]')!;
  queue.style.overflowY = 'auto'; Object.defineProperties(queue,{ scrollHeight:{ value:500 },clientHeight:{ value:180 } });
  assert.equal(wheel(queue,100).defaultPrevented,false,'native queue lists retain scrolling');
  queue.scrollTop = 320;
  assert.equal(wheel(queue,100).defaultPrevented,true);
  assert.equal(chatWheels,0);
  stop();
  assert.equal(wheel(queue,100).defaultPrevented,false,'cleanup restores native event handling');
  assert.equal(chatWheels,1);
  f.dom.window.close();
});

test("single-finger popup gestures do not reach chat handlers or chain from a short popup", () => {
  const f = fixture();
  let chatMoves = 0;
  f.document.body.addEventListener('touchmove', () => { chatMoves++; });
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-all]');
  const menu = f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-menu]')!;
  let target:Element = menu;
  const gesture = (type:string,y:number) => {
    const event = new f.dom.window.TouchEvent(type, { bubbles:true,cancelable:true,touches:[{ clientX:30,clientY:y }] });
    target.dispatchEvent(event); return event;
  };
  gesture('touchstart',200);
  assert.equal(gesture('touchmove',180).defaultPrevented,true);
  assert.equal(chatMoves,0);
  menu.style.overflowY = 'auto'; Object.defineProperties(menu,{ scrollHeight:{ value:600 },clientHeight:{ value:200 } });
  assert.equal(gesture('touchmove',160).defaultPrevented,false,'touch can scroll popup content');
  assert.equal(chatMoves,0);
  f.click('[data-bb-chat-ui-info-choice="queue"]');
  target = f.document.querySelector('[data-queued-messages-scroll-frame]')!;
  gesture('touchstart',160);
  stop();
  assert.equal(gesture('touchmove',140).defaultPrevented,false);
  assert.equal(chatMoves,1);
  f.dom.window.close();
});

test("children use a bare latest-three avatar stack and prefer the designed SDK detail", async () => {
  const f = fixture();
  const children = [
    { id:'old',title:'Old review',state:'done' },
    { id:'ui',title:'UI review',state:'run' },
    { id:'qa',title:'Queue check',state:'wait' },
    { id:'diff',title:'Diff review',state:'done' },
  ];
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-children', JSON.stringify(children));
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  stack.insertAdjacentHTML('beforeend', '<div data-bb-chat-ui-info-supplements><section data-bb-chat-ui-info-kind="children" aria-label="Child Thread"><h3>Child Threads <button data-bb-chat-ui-info-dismiss="children">×</button></h3><button>Open UI review</button></section></div>');
  const native = f.document.querySelector('section[aria-label="Child threads"]')!;
  const parent = native.parentElement;
  const stop = injectComposerInfo(f.document);
  const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="children"]')!;
  const avatars = pill.querySelectorAll('[data-bb-chat-ui-info-avatar]');
  assert.deepEqual(Array.from(avatars, node => node.getAttribute('data-child')), ['ui','qa','diff']);
  assert.deepEqual(Array.from(avatars, node => node.getAttribute('data-state')), ['run','wait','done']);
  assert.equal(avatars[0].firstChild?.textContent, 'UI');
  assert.ok(avatars[2].querySelector('svg'));
  assert.equal(pill.querySelector('[data-bb-chat-ui-info-avatar-more]')!.textContent, '+1');
  assert.equal(f.dom.window.getComputedStyle(pill).backgroundColor, 'rgba(0, 0, 0, 0)');
  f.click('[data-bb-chat-ui-info-trigger="children"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-kind="children"]')!.hasAttribute('data-bb-chat-ui-info-open'));
  assert.equal(native.hasAttribute('data-bb-chat-ui-info-open'), false);
  assert.equal(native.parentElement, parent);
  f.click('[data-bb-chat-ui-info-dismiss="children"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-open]'), null);
  stop(); f.dom.window.close();
});

test("Child Thread and other popover closes have the same button and glyph size", () => {
  const f = fixture();
  f.document.querySelector('[data-promptbox-shell] > .grid')!.insertAdjacentHTML('beforeend', '<section data-bb-chat-ui-info-kind="children" aria-label="Child Thread"><h3>Child Threads <button data-bb-chat-ui-info-dismiss="children">×</button></h3></section>');
  const stop = injectComposerInfo(f.document);
  const check = (button:Element) => {
    const css = f.dom.window.getComputedStyle(button);
    assert.equal(css.width,'24px'); assert.equal(css.height,'24px');
    assert.equal(css.fontSize,'12px','close glyph uses the compact menu size');
    assert.equal(css.fontWeight,'400','a heading must not make the close glyph bold');
    assert.equal(css.lineHeight,'1'); assert.equal(css.padding,'0px');
    assert.equal(css.display,'inline-flex'); assert.equal(css.alignItems,'center');
    assert.equal(css.justifyContent,'center');
  };
  try {
    f.click('[data-bb-chat-ui-info-trigger="children"]');
    check(f.document.querySelector('[data-bb-chat-ui-info-dismiss="children"]')!);
    f.click('[data-bb-chat-ui-info-trigger="diff"]');
    check(f.document.querySelector('[aria-label="Code Diff 닫기"]')!);
    f.click('[data-bb-chat-ui-info-all]');
    check(f.document.querySelector('[aria-label="전체 정보 닫기"]')!);
    f.click('[data-bb-chat-ui-info-choice="goal"]');
    check(f.document.querySelector('[data-bb-chat-ui-info-native-dismiss]')!);
  } finally { stop(); f.dom.window.close(); }
});

test("child counts use up to three overlapping avatars followed by a separate overflow circle", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  const children = Array.from({ length:6 }, (_, index) => ({ id:`child-${index}`, title:`Review ${index}`, state:'run' }));
  source.setAttribute('data-bb-chat-ui-info-children', JSON.stringify(children.slice(0, 1)));
  const stop = injectComposerInfo(f.document);
  for (const count of [1, 2, 3, 4, 6]) {
    source.setAttribute('data-bb-chat-ui-info-children', JSON.stringify(children.slice(0, count)));
    await f.tick();
    const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="children"]')!;
    const stack = pill.querySelector('[data-bb-chat-ui-info-avatars]')!;
    const avatars = Array.from(stack.querySelectorAll('[data-bb-chat-ui-info-avatar]'));
    assert.equal(avatars.length, Math.min(count, 3));
    assert.equal(pill.children.length, 1, 'the count is represented entirely by the avatar stack');
    assert.deepEqual(avatars.map(node => node.getAttribute('data-child')), children.slice(Math.max(0, count - 3), count).map(child => child.id));
    for (let index = 1; index < avatars.length; index++) {
      assert.ok(Number(f.dom.window.getComputedStyle(avatars[index]).zIndex) > Number(f.dom.window.getComputedStyle(avatars[index - 1]).zIndex), 'newer circles overlap from left to right');
    }
    const more = stack.querySelector('[data-bb-chat-ui-info-avatar-more]');
    if (count <= 3) assert.equal(more, null, 'one to three children have no additional numeric label');
    else {
      assert.ok(more);
      assert.equal(more.textContent, `+${count - 3}`);
      assert.equal(stack.lastElementChild, more);
      const style = f.dom.window.getComputedStyle(more);
      assert.equal(style.width, '30px');
      assert.equal(style.height, '30px');
      assert.equal(style.borderRadius, '50%');
      assert.ok(Number(style.zIndex) > Number(f.dom.window.getComputedStyle(avatars.at(-1)!).zIndex));
    }
  }
  stop(); f.dom.window.close();
});

test("Agentation uses the browser picker icon and count while retaining native controls", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showAnnotations:'상단 표시' }));
  source.insertAdjacentHTML('beforeend', '<span data-bb-chat-ui-info-icon="annotations"><svg data-icon="MessageSquarePlus" data-picker-icon><path d="M1 1h1" /></svg></span>');
  const shell = f.document.createElement('div');
  shell.className = 'agentation-staging-shell';
  stack.append(shell);
  let sent = 0;
  const render = (collapsed: boolean) => {
    shell.classList.toggle('agentation-staging-shell--expanded', !collapsed);
    const icon = '<svg data-icon="ChatFeedback" data-feedback-icon><path d="M9 10h6" /></svg>';
    shell.innerHTML = `<div>${collapsed ? `<button aria-expanded="false" aria-label="Expand 3 staged annotations">${icon}Annotations <span class="tabular-nums">3</span></button>` : `<div>${icon}<p>Annotations</p><button aria-expanded="true" aria-label="Collapse staged annotations"><svg data-chevron /></button></div><div><button data-discard-all>Discard all</button><button data-send-all>Send all</button></div>`}</div>
      <div class="grid"><div><div><ul>${[1,2,3].map(id => `<li><span class="sr-only">Description ${id}</span><span aria-hidden="true"><span>Composer</span><span>button</span><span>→</span><span>Feedback ${id}</span></span><button aria-label="Mention annotation">Mention</button><button aria-label="Send annotation to this thread">Send</button><button aria-label="Discard annotation">Discard</button></li>`).join('')}</ul></div></div></div>`;
    shell.querySelector('button[aria-expanded]')!.addEventListener('click', () => render(!collapsed));
    shell.querySelector('[data-send-all]')?.addEventListener('click', () => sent++);
  };
  render(true);
  const parent = shell.parentElement;
  const stop = injectComposerInfo(f.document);
  const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="annotations"]')!;
  assert.equal(pill.textContent, '3');
  assert.equal(infoKinds.find(kind => kind.key === 'annotations')!.icon, 'MessageSquarePlus');
  assert.ok(pill.querySelector('[data-picker-icon]'));
  assert.equal(pill.querySelector('[data-feedback-icon]'), null);
  f.click('[data-bb-chat-ui-info-all]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="annotations"] [data-picker-icon]'));
  f.click('[data-bb-chat-ui-info-trigger="annotations"]');
  await f.tick();
  assert.ok(shell.hasAttribute('data-bb-chat-ui-info-open'));
  assert.equal(shell.parentElement, parent);
  assert.equal(f.dom.window.getComputedStyle(shell).display, 'grid');
  assert.ok(pill.querySelector('[data-picker-icon]'), 'expanding the native card keeps the picker glyph');
  assert.ok(decodeURIComponent(stack.style.getPropertyValue('--bb-chat-ui-feedback-icon')).includes('data-picker-icon'), 'popup header and row masks use the picker glyph');
  assert.equal(f.dom.window.getComputedStyle(shell.querySelector('[data-feedback-icon]')!).display, 'none', 'the old header icon is hidden without removing its native DOM');
  assert.equal(pill.querySelector('[data-chevron]'), null);
  const send = shell.querySelector('[data-send-all]')!;
  const sendParent = send.parentElement;
  f.click('[data-send-all]');
  assert.equal(sent, 1);
  assert.equal(send.parentElement, sendParent);
  shell.querySelector('li')!.remove();
  await f.tick();
  assert.equal(pill.textContent, '2');
  f.click('[aria-label="Collapse staged annotations"]');
  await f.tick();
  assert.equal(shell.hasAttribute('data-bb-chat-ui-info-open'), false);
  stop(); f.dom.window.close();
});

test("Agentation replaces its native glyph when the SDK picker icon finishes loading", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', '{"showAnnotations":"상단 표시"}');
  source.insertAdjacentHTML('beforeend', '<span data-bb-chat-ui-info-icon="annotations"></span>');
  f.document.querySelector('[data-promptbox-shell] > .grid')!.insertAdjacentHTML('beforeend', '<div class="agentation-staging-shell"><button aria-expanded="false"><svg data-icon="ChatFeedback" /><span class="tabular-nums">2</span></button></div>');
  const stop = injectComposerInfo(f.document);
  try {
    source.querySelector('[data-bb-chat-ui-info-icon="annotations"]')!.innerHTML = '<svg data-icon="MessageSquarePlus"><path d="M1 1h1" /></svg>';
    await f.tick();
    const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="annotations"]')!;
    assert.ok(pill.querySelector('[data-icon="MessageSquarePlus"]'), 'icon readiness refreshes the pill even when the annotation count is unchanged');
    assert.equal(pill.querySelector('[data-icon="ChatFeedback"]'), null);
    assert.equal(pill.textContent, '2');
  } finally { stop(); f.dom.window.close(); }
});

test("empty top icons can be enabled and disabled without exposing catalog-only or disabled families", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  for (const node of [...stack.children]) if (!node.contains(source)) node.remove();
  for (const kind of infoKinds) source.insertAdjacentHTML('beforeend', `<span data-bb-chat-ui-info-icon="${kind.key}"><svg data-placeholder-icon="${kind.key}" /></span>`);
  const settings = { showEmptyIcons:false, showAnnotations:'상단 표시', showGoal:'끄기', showPlan:'목록에만 표시' };
  const publish = () => source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify(settings));
  publish();
  const stop = injectComposerInfo(f.document);
  assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-trigger]').length, 0);
  settings.showEmptyIcons = true; publish(); await f.tick();
  const icons = f.document.querySelectorAll('[data-bb-chat-ui-info-trigger]');
  assert.deepEqual([...icons].map(icon => icon.getAttribute('data-bb-chat-ui-info-trigger')), infoKinds.filter(kind => kind.key !== 'goal' && kind.key !== 'plan').map(kind => kind.key));
  for (const icon of icons) {
    assert.equal(icon.textContent, '');
    assert.ok(icon.querySelector('[data-placeholder-icon]'));
    assert.ok(icon.getAttribute('aria-label')?.includes('현재 없음'));
  }
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-empty]')?.textContent?.includes('현재 정보 없음'));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.getAttribute('aria-expanded'), 'true');
  const diff = f.document.createElement('span'); diff.hidden = true;
  diff.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify({ insertions:8, deletions:2, files:1, branch:'bb/review' })); stack.append(diff);
  await f.tick();
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent?.includes('+8 −2'));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.hasAttribute('data-bb-chat-ui-info-unavailable'), false);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-diff]'));
  settings.showEmptyIcons = false; publish(); await f.tick();
  assert.deepEqual([...f.document.querySelectorAll('[data-bb-chat-ui-info-trigger]')].map(icon => icon.getAttribute('data-bb-chat-ui-info-trigger')), ['diff']);
  f.click('[data-bb-chat-ui-info-all]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="plan"]'));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-choice="goal"]'), null);
  stop(); f.dom.window.close();
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

test("Diff opens from an icon beside its popover title, preserving the panel action", () => {
  const f = fixture();
  let opened = 0;
  f.document.querySelector('#thread-prompt-banner-git-toggle')!.addEventListener('click', () => opened++);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const action = f.document.querySelector('[data-bb-chat-ui-info-action="diff"]')!;
  assert.equal(action.parentElement?.tagName, 'HEADER');
  assert.equal(action.previousElementSibling?.textContent, 'Code Diff');
  assert.equal(action.textContent, '');
  assert.ok(action.querySelector('svg'));
  assert.equal(action.getAttribute('aria-label'), 'Diff 패널 열기');
  assert.equal(action.getAttribute('title'), 'Diff 패널 열기');
  (action as HTMLElement).click();
  assert.equal(opened, 1);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), null);
  stop(); f.dom.window.close();
});

test("native panel and plugin-page actions become title icons without moving original controls", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  stack.insertAdjacentHTML('beforeend', '<section data-bb-chat-ui-info-kind="workflow" aria-label="Workflow"><h3>UI review</h3><div><button>사이드 패널에서 열기</button><a href="/plugins/workflows">플러그인 페이지에서 열기</a><button>Stop workflow</button></div></section>');
  const node = stack.querySelector('[data-bb-chat-ui-info-kind="workflow"]')!;
  const panel = node.querySelector('button')!;
  const page = node.querySelector('a')!;
  const parent = panel.parentElement;
  let opened = 0;
  panel.addEventListener('click', () => opened++);
  page.addEventListener('click', event => { event.preventDefault(); opened += 10; });
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-all]'); f.click('[data-bb-chat-ui-info-choice="workflow"]');
  const icons = node.querySelectorAll<HTMLElement>('h3 [data-bb-chat-ui-info-panel-action]');
  assert.equal(icons.length, 2);
  for (const icon of icons) { assert.equal(icon.textContent, ''); assert.ok(icon.querySelector('svg')); }
  assert.equal(icons[0].getAttribute('title'), '사이드 패널에서 열기');
  assert.equal(icons[1].getAttribute('aria-label'), '플러그인 페이지에서 열기');
  assert.equal(panel.parentElement, parent); assert.equal(page.parentElement, parent);
  assert.equal(f.dom.window.getComputedStyle(panel).display, 'none');
  assert.equal(f.dom.window.getComputedStyle(page).display, 'none');
  assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-panel-source]').length, 2);
  assert.equal(parent?.querySelector('button:last-child')?.textContent, 'Stop workflow');
  assert.equal(parent?.querySelector('button:last-child')?.hasAttribute('data-bb-chat-ui-info-panel-source'), false);
  icons[0].click(); icons[1].click(); assert.equal(opened, 11);
  panel.disabled = true; await f.tick();
  assert.equal((icons[0] as HTMLButtonElement).disabled, true);
  icons[0].click(); assert.equal(opened, 11);
  page.remove(); await f.tick();
  assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-panel-action]').length, 1);
  stop();
  assert.equal(node.querySelector('[data-bb-chat-ui-info-panel-action]'), null);
  assert.equal(panel.hasAttribute('data-bb-chat-ui-info-panel-source'), false);
  assert.equal(panel.parentElement, parent);
  f.dom.window.close();
});

test("panel icons follow native rerenders and never appear when no destination exists", async () => {
  const f = fixture();
  const node = f.document.querySelector('[aria-label="Goal"]')!;
  const stop = injectComposerInfo(f.document);
  assert.equal(node.querySelector('[data-bb-chat-ui-info-panel-action]'), null);
  const source = f.document.createElement('button'); source.textContent = 'Open in side panel'; node.append(source);
  await f.tick();
  assert.equal(node.querySelector('h3')?.textContent, 'Goal');
  assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-panel-action]').length, 1);
  node.innerHTML = '<h3>Updated Goal</h3><button title="Open plugin page">Open</button><button>Clear</button>';
  await f.tick();
  assert.equal(node.querySelectorAll('h3').length, 1);
  assert.equal(node.querySelectorAll('[data-bb-chat-ui-info-panel-action]').length, 1);
  const page = node.querySelector('button[title]:not([data-bb-chat-ui-info-panel-action])')!;
  page.setAttribute('title', 'Open ordinary details'); await f.tick();
  assert.equal(node.querySelector('[data-bb-chat-ui-info-panel-action]'), null);
  assert.equal(page.hasAttribute('data-bb-chat-ui-info-panel-source'), false);
  stop();
  assert.equal(node.querySelector('h3')?.textContent, 'Updated Goal');
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
  assert.equal(f.document.activeElement?.getAttribute('aria-label'), 'Diff 패널 열기');
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

test("Diff popover uses compact HEAD and commit metadata without losing comparison meaning or inventing counts", async () => {
  const f = fixture();
  const source = f.document.createElement('span');
  const detail = { branch:'feature/chat', basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main', files:[],
    commitKind:'pr', commitCount:28 as number | null, commits:[{ sha:'abc1234', shortSha:'abc1234', subject:'Latest' }] };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:0,deletions:0,files:0,detail}));
  publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const popup = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  assert.equal(popup.querySelector('[data-bb-chat-ui-info-diff-meta="head"]')?.textContent, 'HEAD · +0 −0 · 0 files');
  assert.ok(popup.querySelector('[data-bb-chat-ui-info-diff-meta="head"]')?.getAttribute('title')?.includes('미커밋'));
  const commits = () => popup.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')!;
  assert.equal(commits().textContent, 'origin/main → HEAD · 28');
  assert.ok(commits().getAttribute('aria-label')?.includes('PR 후보'));
  assert.equal(commits().querySelector('[data-bb-chat-ui-info-commit-count]')?.getAttribute('aria-label'), '커밋 28개');
  assert.ok(commits().querySelector('svg'));
  assert.equal(commits().textContent?.includes('commits'), false);
  detail.commitCount = null; publish(); await f.tick();
  assert.equal(commits().textContent, 'origin/main → HEAD · —');
  assert.equal(commits().querySelector('[data-bb-chat-ui-info-commit-count]')?.getAttribute('aria-label'), '커밋 수 확인 불가');
  detail.commitCount = 0; publish(); await f.tick();
  assert.equal(commits().textContent, 'origin/main → HEAD · 0');
  stop(); f.dom.window.close();
});

test("Diff popover retains changed files, line statistics, comparison basis and actual branch commits while open", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const source = f.document.createElement('span');
  const detail = {
    branch:'bb/review', basis:'HEAD 대비 미커밋 변경', baseRef:'main',
    files:[{ path:'app.tsx', status:'M', insertions:8, deletions:2 },{ path:'image.png', status:'A', insertions:null, deletions:null }],
    commits:[{ sha:'a7c21f0abcdef', shortSha:'a7c21f0', subject:'컴포저 정보 정리' }],
  };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify({ insertions:8, deletions:2, files:2, branch:'bb/review', detail }));
  publish(); stack.append(source);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const popup = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  assert.ok(popup.querySelector('[data-bb-chat-ui-info-diff-meta="head"]')?.getAttribute('title')?.includes('HEAD 대비 미커밋 변경'));
  const rows = popup.querySelectorAll('[data-bb-chat-ui-info-diff-file]');
  assert.equal(rows.length, 2);
  assert.ok(rows[0].textContent?.includes('app.tsx'));
  assert.ok(rows[0].textContent?.includes('+8'));
  assert.ok(rows[0].textContent?.includes('−2'));
  assert.ok(rows[1].textContent?.includes('통계 없음'));
  assert.ok(popup.textContent?.includes('a7c21f0 · 컴포저 정보 정리'));
  assert.ok(popup.textContent?.includes('main → HEAD'));
  assert.equal(popup.textContent?.includes('unpushed'), false);
  detail.files[0].path = 'lib/composer.ts';
  publish(); await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), popup);
  assert.ok(popup.textContent?.includes('lib/composer.ts'));
  assert.equal(popup.textContent?.includes('app.tsx'), false);
  assert.equal(popup.querySelectorAll('[data-bb-chat-ui-info-action="diff"]').length, 1);
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

test("archived stack-only composer offers only restore and preserves its native action", async () => {
  const f = fixture();
  f.document.querySelector('[data-follow-up-composer-anchor]')!.remove();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const status = f.document.createElement("section");
  status.setAttribute("aria-label", "Thread archived");
  status.innerHTML = '<p>Parent thread and archived metadata</p><button>Unarchive</button>';
  stack.append(status);
  let restored = 0;
  status.querySelector('button')!.addEventListener('click', () => restored++);
  const stop = injectComposerInfo(f.document);
  assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,true);
  assert.deepEqual([...f.document.querySelectorAll('[data-bb-chat-ui-info-trigger]')].map(node => node.getAttribute('data-bb-chat-ui-info-trigger')),['status']);
  const pill = f.click('[data-bb-chat-ui-info-trigger="status"]');
  assert.equal(pill.textContent,'Archived thread');
  assert.equal(f.dom.window.getComputedStyle(pill).width,'100%');
  const popover=f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-archived-detail]')!;
  assert.ok(popover);
  assert.equal(popover.querySelectorAll('button').length,2,'only close and restore are present');
  assert.equal(popover.textContent?.includes('Parent thread'),false);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-archive-catalog]'),null);
  f.click('[data-bb-chat-ui-info-unarchive]');
  assert.equal(restored, 1);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-open]'),null,'the native context card stays hidden');
  const nativeAction=status.querySelector<HTMLButtonElement>('button')!;
  nativeAction.disabled=true; nativeAction.textContent='Unarchiving...'; await f.tick();
  assert.equal(popover.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-unarchive]')!.disabled,true);
  assert.equal(popover.querySelector('[data-bb-chat-ui-info-unarchive]')!.textContent,'Unarchiving...');
  f.click('[data-bb-chat-ui-info-unarchive]');
  assert.equal(restored,1,'the pending state prevents another restore');
  status.remove(); await f.tick();
  assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,false);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="goal"]'),'unarchiving restores the normal information row');
  stop();
  f.dom.window.close();
});

test("native Thread history shows one full-width state for archive and removed environments", async () => {
  const f=fixture();
  const stack=f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const status=f.document.createElement('section'); status.setAttribute('aria-label','Thread history');
  status.innerHTML='<div role="status" aria-label="Thread is archived">Thread is archived</div><button>Unarchive</button>';
  stack.append(status);
  const stop=injectComposerInfo(f.document);
  try {
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="status"]')?.textContent,'Archived thread');
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null);
    status.innerHTML='<div role="status" aria-label="Workspace removed">Workspace removed</div><button>Restore workspace</button>';
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null);
    assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,true);
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="status"]')?.textContent,'Workspace removed');
  } finally { stop(); f.dom.window.close(); }
});

test("restore popovers use the SDK bridge when BB omits its native action", async () => {
  for (const [label,kind,text] of [['Thread is archived','unarchive','Unarchive'],['Environment unavailable','environment','Restore workspace'],['Machine removed','environment','Restore workspace'],['Machine removal in progress','environment','Restore workspace'],['Machine cleanup failed','environment','Restore workspace']]) {
    const f=fixture();
    const stack=f.document.querySelector('[data-promptbox-shell] > .grid')!;
    stack.insertAdjacentHTML('beforeend',`<section aria-label="Thread history"><button id="thread-prompt-banner-parent-thread-toggle" aria-expanded="false" aria-controls="omitted-action">Parent</button><div role="status" aria-label="${label}">${label}</div><div id="omitted-action" hidden>Parent details without a restore action</div></section>`);
    const source=f.document.createElement('button'); source.setAttribute('data-bb-chat-ui-info-restore-source',kind); source.textContent=text;
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.append(source);
    let calls=0; source.addEventListener('click',()=>calls++);
    const stop=injectComposerInfo(f.document);
    try {
      f.click('[data-bb-chat-ui-info-trigger="status"]');
      const restore=f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-unarchive]')!;
      assert.equal(restore.disabled,false,'the missing native button must not disable the SDK action');
      assert.equal(restore.textContent,text);
      assert.equal(f.document.querySelector('#thread-prompt-banner-parent-thread-toggle')!.getAttribute('aria-expanded'),'false','SDK restore does not expand the parent card');
      restore.click(); assert.equal(calls,1);
      source.disabled=true; source.textContent='Restoring...'; await f.tick();
      assert.equal(restore.disabled,true);
      source.setAttribute('data-bb-chat-ui-info-restore-error','Provider restore failed'); await f.tick();
      assert.equal(f.document.querySelector('[role="alert"]')?.textContent,'Provider restore failed');
      source.removeAttribute('data-bb-chat-ui-info-restore-error'); source.disabled=false; source.textContent=text; await f.tick();
      assert.equal(f.document.querySelector('[role="alert"]'),null);
      assert.equal(restore.disabled,false);
      assert.equal(f.document.querySelector('[data-bb-chat-ui-info-archive-catalog]'),null);
    } finally { stop(); f.dom.window.close(); }
  }
});

test("SDK restoration capability overrides a stale native action and archive takes priority", async () => {
  const f=fixture();
  const stack=f.document.querySelector('[data-promptbox-shell] > .grid')!;
  stack.insertAdjacentHTML('beforeend','<section aria-label="Thread history"><div role="status" aria-label="Machine removed">Machine removed</div><button>Restore workspace</button></section>');
  const source=f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.innerHTML='<button data-bb-chat-ui-info-restore-source="environment" disabled>복구 불가</button><button data-bb-chat-ui-info-restore-source="unarchive">Unarchive</button>';
  let calls=0; source.querySelector('[data-bb-chat-ui-info-restore-source="unarchive"]')!.addEventListener('click',()=>calls++);
  const stop=injectComposerInfo(f.document);
  try {
    f.click('[data-bb-chat-ui-info-trigger="status"]');
    const restore=f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-unarchive]')!;
    assert.equal(restore.textContent,'복구 불가'); assert.equal(restore.disabled,true);
    source.setAttribute('data-bb-chat-ui-info-read-only-label','Archived thread'); await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="status"]')!.textContent,'Archived thread');
    f.click('[data-bb-chat-ui-info-trigger="status"]');
    f.click('[aria-label="Unarchive"]'); assert.equal(calls,1);
    source.removeAttribute('data-bb-chat-ui-info-read-only-label');
    stack.querySelector('section[aria-label="Thread history"]')!.remove(); await f.tick();
    assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,false);
  } finally { stop(); f.dom.window.close(); }
});

test("restoring returns to normal pills before the SDK read-only snapshot catches up", async () => {
  for (const showEmptyIcons of [false,true]) for (const [nativeLabel,sdkLabel] of [['Thread is archived','Archived thread'],['Environment unavailable','Environment unavailable']]) {
    const f=fixture();
    const stack=f.document.querySelector('[data-promptbox-shell] > .grid')!;
    const source=f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
    source.setAttribute('data-bb-chat-ui-info-settings',JSON.stringify({showEmptyIcons}));
    source.setAttribute('data-bb-chat-ui-info-read-only-label',sdkLabel);
    source.insertAdjacentHTML('beforeend','<span data-bb-chat-ui-info-icon="status"><svg data-placeholder-icon="status" /></span>');
    const status=f.document.createElement('section'); status.setAttribute('aria-label','Thread history');
    status.innerHTML=`<div role="status" aria-label="${nativeLabel}">${nativeLabel}</div><button>Unarchive</button>`;
    stack.append(status);
    const stop=injectComposerInfo(f.document);
    try {
      const bar=f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-bar]')!;
      assert.equal(bar.hasAttribute('data-bb-chat-ui-info-archived'),true);
      f.click('[data-bb-chat-ui-info-trigger="status"]');
      status.remove(); await f.tick();
      assert.equal(bar.hasAttribute('data-bb-chat-ui-info-archived'),false,'a delayed SDK snapshot cannot leave a full-width empty status pill after restore');
      assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,false);
      assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="goal"]'));
      assert.equal(f.document.querySelector('[data-bb-chat-ui-info-archived-detail]'),null);
      const pill=f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-trigger="status"]');
      if (showEmptyIcons) {
        assert.equal(pill?.getAttribute('aria-label'),'스레드 상태 · 현재 없음');
        assert.ok(pill?.querySelector('[data-placeholder-icon="status"]'));
        assert.notEqual(f.dom.window.getComputedStyle(pill!).width,'100%','the requested empty icon uses its normal size');
      } else assert.equal(pill,null);
      source.removeAttribute('data-bb-chat-ui-info-read-only-label'); await f.tick();
      assert.equal(bar.hasAttribute('data-bb-chat-ui-info-archived'),false);
    } finally { stop(); f.dom.window.close(); }
  }
});

test("archived restore uses a lazily mounted parent-context action without exposing parent information", async () => {
  const f=fixture();
  const status=f.document.createElement('section'); status.setAttribute('aria-label','Thread history');
  status.innerHTML='<button id="thread-prompt-banner-parent-thread-toggle" aria-expanded="false" aria-controls="parent-body">Parent thread</button><div role="status" aria-label="Thread is archived">Thread is archived</div><div id="parent-body" hidden></div>';
  let restored=0;
  status.querySelector('button')!.addEventListener('click',()=>{
    const toggle=status.querySelector('button')!;
    const expanded=toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded',String(expanded));
    const body=status.querySelector<HTMLElement>('#parent-body')!; body.hidden=!expanded;
    if (expanded && !body.children.length) {
      body.innerHTML='<p>Private parent details</p><button>Unarchive</button>';
      body.querySelector('button')!.addEventListener('click',()=>restored++);
    }
  });
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(status);
  const stop=injectComposerInfo(f.document);
  try {
    f.click('[data-bb-chat-ui-info-trigger="status"]'); await f.tick();
    const popup=f.document.querySelector('[data-bb-chat-ui-info-archived-detail]')!;
    assert.equal(popup.textContent?.includes('Private parent details'),false);
    f.click('[data-bb-chat-ui-info-unarchive]'); assert.equal(restored,1);
    f.click('[aria-label="Archived thread 닫기"]');
    assert.equal(status.querySelector('button')!.getAttribute('aria-expanded'),'false','closing restores the hidden native disclosure');
  } finally { stop(); f.dom.window.close(); }
});

test("archived status stays visible on narrow screens and yields to an input request", async () => {
  const f=fixture();
  const stack=f.document.querySelector<HTMLElement>('[data-promptbox-shell] > .grid')!;
  stack.getBoundingClientRect=()=>({ width:120 } as DOMRect);
  Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetWidth',{get:()=>120});
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings',JSON.stringify(Object.fromEntries(infoKinds.map(kind=>[kind.setting,'끄기']))));
  stack.insertAdjacentHTML('beforeend','<section aria-label="Thread archived"><button>Unarchive</button></section>');
  const stop=injectComposerInfo(f.document);
  try {
    assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-trigger="status"]')!.hidden,false,'archive status is a required full-width state, not an overflow pill');
    assert.equal(f.document.querySelector<HTMLButtonElement>('[data-bb-chat-ui-info-all]')!.hidden,true);
    const request=f.document.createElement('section'); request.setAttribute('data-testid','user-question-banner'); stack.append(request);
    await f.tick();
    assert.equal(f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-bar]')!.hidden,true);
    request.remove(); await f.tick();
    assert.equal(f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-bar]')!.hidden,false);
  } finally { stop(); f.dom.window.close(); }
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

test("Code Diff pill shows one commit meaning and keeps unpushed counts inside its popover", async () => {
  const f = fixture();
  const source = f.document.createElement('span');
  const name = 'feature/a-very-long-branch-name';
  const snapshot = {
    insertions:0, deletions:0, files:0, branch:name,
    presentation:{ mode:'branch', visible:true, branch:name, branchLabel:'feature/a…', label:'feature/a… · 8 commits' },
    detail:{ branch:name, basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main', files:[],
      commitKind:'pr', commitCount:8, unpushedCount:3, unpushedRef:`origin/${name}`,
      commits:[{ sha:'abc12345678', shortSha:'abc1234', subject:'Saved work' }] },
  };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify(snapshot));
  publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
  assert.equal(pill.textContent, 'feature/a… · 8');
  assert.ok(pill.querySelector('[data-bb-chat-ui-info-commit-count] svg'));
  assert.equal(pill.querySelector('[data-bb-chat-ui-info-commit-count]')?.getAttribute('aria-label'), '커밋 8개');
  assert.equal(pill.textContent?.includes('↑'), false);
  assert.ok(pill.getAttribute('aria-label')?.includes(name));
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const popup = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  assert.equal(popup.querySelector('[data-bb-chat-ui-info-diff-branch]')?.textContent, name);
  assert.equal(popup.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')?.textContent, 'origin/main → HEAD · 8');
  assert.ok(popup.textContent?.includes('미푸시 · 3 commits'));
  assert.ok(popup.textContent?.includes(`origin/${name} 대비`));
  assert.equal(popup.textContent?.includes('PR 후보는 아직 push하지 않은 로컬 커밋도 포함합니다.'), false);
  assert.equal(popup.textContent?.includes('원격 비교는 마지막으로 확인된 상태 기준입니다.'), false);
  assert.equal(popup.textContent?.includes('feature/a…'), false, 'popover uses the full branch name');
  assert.equal(popup.querySelectorAll('[data-bb-chat-ui-info-diff-file]').length, 0);
  snapshot.detail.unpushedCount = 0;
  publish(); await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff]'), popup);
  assert.ok(popup.textContent?.includes('미푸시 · 0 commits'));
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent, 'feature/a… · 8');
  stop(); f.dom.window.close();
});

test("first entry shows an animated Diff placeholder, then reveals SDK data without flashing host counts", async () => {
  for (const showEmptyIcons of [false,true]) {
    const f = fixture();
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings',JSON.stringify({ showEmptyIcons }));
    const source = f.document.createElement('span');
    source.setAttribute('data-bb-chat-ui-head-diff','');
    f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
    const stop = injectComposerInfo(f.document);
    const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
    assert.ok(pill,'Diff enters before its slow first result');
    assert.equal(pill.textContent,'...','no provisional host line counts during loading');
    assert.equal(pill.getAttribute('aria-busy'),'true');
    assert.equal(pill.querySelectorAll('[data-bb-chat-ui-info-diff-loading] span').length,3);
    f.click('[data-bb-chat-ui-info-all]');
    assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="diff"]'),'catalog remains available');
    f.click('[data-bb-chat-ui-info-all]');
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({ insertions:0,deletions:0,files:0,branch:'feature/chat',
      presentation:{ mode:'branch',visible:true,branch:'feature/chat',branchLabel:'feature/c…',label:'feature/c… · 8 commits' },
      detail:{ branch:'feature/chat',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',files:[],commits:[],commitKind:'pr',commitCount:8 },
    }));
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),pill,'the same pill reveals its result');
    assert.equal(pill.textContent,'feature/c… · 8');
    assert.equal(pill.hasAttribute('aria-busy'),false);
    // A new thread's source is empty until its own first result arrives.
    source.setAttribute('data-bb-chat-ui-head-diff',''); await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent,'...');
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({ insertions:0,deletions:0,files:0,branch:null,
      presentation:{ mode:'unpushed',visible:false,branch:'main',branchLabel:'main',label:'main' },
    }));
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null,'confirmed clean main still hides the pill');
    stop(); f.dom.window.close();
  }
});

test("Diff loading widens into its result once and respects reduced motion and unavailable environments", async () => {
  for (const reduced of [false,true]) {
    const f = fixture();
    Object.defineProperty(f.dom.window,'matchMedia',{value:()=>({matches:reduced})});
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showEmptyIcons":true}');
    const source = f.document.createElement('span'); source.setAttribute('data-bb-chat-ui-head-diff','');
    f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
    const entries:{key:string|null;frames:Keyframe[];options:KeyframeAnimationOptions;cancelled:boolean}[]=[];
    Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetWidth',{get() {
      return this.hasAttribute('data-bb-chat-ui-info-trigger') ? this.hasAttribute('aria-busy') ? 64 : 180 : 0;
    }});
    f.dom.window.HTMLElement.prototype.animate=function(frames,options) {
      const entry={key:this.getAttribute('data-bb-chat-ui-info-trigger'),frames:frames as Keyframe[],options:options as KeyframeAnimationOptions,cancelled:false}; entries.push(entry);
      return {cancel:()=>{entry.cancelled=true;}} as Animation;
    };
    const stop=injectComposerInfo(f.document);
    const pill=f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:7,deletions:2,files:1,branch:'feature/chat',
      presentation:{mode:'working',visible:true,branch:'feature/chat',label:'+7 −2 · 1 file'},
    })); await f.tick();
    const width=entries.filter(entry=>entry.key==='diff'&&entry.frames[0].width);
    assert.equal(width.length,reduced?0:1);
    if(!reduced) {
      assert.deepEqual(width[0].frames.map(frame=>frame.width),['64px','180px']);
      assert.equal(width[0].options.duration,320);
      assert.equal(entries.filter(entry=>entry.key==='diff'&&entry.options.duration===460).length,1,'data arrival does not repeat the entry bubble');
    }
    assert.equal(pill.textContent,'+7 −2 · 1 file');
    const refreshed=JSON.parse(source.getAttribute('data-bb-chat-ui-head-diff')!);
    refreshed.detail={branch:'feature/chat',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',files:[],commits:[]};
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify(refreshed)); await f.tick();
    if(!reduced) assert.equal(width[0].cancelled,false,'detail-only refresh does not interrupt the width transition');
    source.setAttribute('data-bb-chat-ui-head-diff','');
    source.setAttribute('data-bb-chat-ui-head-diff-state','unavailable'); await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]:not([data-bb-chat-ui-info-exiting])'),null,'confirmed missing environment ends the placeholder even with empty icons enabled');
    stop(); assert.ok(entries.filter(entry=>entry.options.duration!==360).every(entry=>entry.cancelled),'entry, width and content animations are cancelled on unload'); f.dom.window.close();
  }
});

test("loading Diff exists without a native banner and obeys top, catalog-only and off settings", async () => {
  const f=fixture();
  f.document.querySelector('section[aria-label="Thread context before sending"]')!.remove();
  const settings=f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  const source=f.document.createElement('span'); source.setAttribute('data-bb-chat-ui-head-diff','');
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop=injectComposerInfo(f.document);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent,'...');
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff-content]')?.textContent,'불러오는 중');
  settings.setAttribute('data-bb-chat-ui-info-settings','{"showDiff":"목록에만 표시"}'); await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null);
  f.click('[data-bb-chat-ui-info-all]');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="diff"]'));
  settings.setAttribute('data-bb-chat-ui-info-settings','{"showDiff":"끄기"}'); await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-choice="diff"]'),null);
  stop(); f.dom.window.close();
});

test("entering another thread replays the sequence even when the composer DOM is reused", async () => {
  const f=fixture();
  const source=f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-thread','thread-a');
  const animated:string[]=[];
  f.dom.window.HTMLElement.prototype.animate=function(_frames,options) {
    if((options as KeyframeAnimationOptions).duration===460) animated.push(this.getAttribute('data-bb-chat-ui-info-trigger')??'all');
    return {cancel(){}} as Animation;
  };
  const stop=injectComposerInfo(f.document);
  const sequence = ['diff','goal','todos','queue','pullRequest','other','all'];
  assert.deepEqual(animated,sequence);
  source.setAttribute('data-bb-chat-ui-info-thread','thread-b'); await f.tick();
  assert.deepEqual(animated,[...sequence,...sequence]);
  f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
  assert.equal(animated.length,sequence.length * 2,'resize does not restart the sequence');
  stop(); f.dom.window.close();
});

test("clean main hides the pill even with empty icons enabled but remains in the catalog", async () => {
  const f = fixture();
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings', '{"showEmptyIcons":true}');
  const source = f.document.createElement('span');
  const snapshot = {
    insertions:0, deletions:0, files:0, branch:null,
    presentation:{ mode:'unpushed', visible:true, branch:'main', branchLabel:'main', label:'↑3' },
    detail:{ branch:'main', basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main', files:[], commits:[], commitKind:'unpushed', commitCount:3, unpushedCount:3, unpushedRef:'origin/main' },
  };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify(snapshot));
  publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent, '↑3');
  snapshot.presentation.visible = false; snapshot.presentation.label = 'main';
  snapshot.detail.commitCount = 0; snapshot.detail.unpushedCount = 0;
  publish(); await f.tick();
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'), null);
  f.click('[data-bb-chat-ui-info-all]');
  f.click('[data-bb-chat-ui-info-choice="diff"]');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff-branch]')?.textContent, 'main');
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')?.textContent, 'origin/main → HEAD · 0');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')?.getAttribute('aria-label')?.includes('미푸시'));
  stop(); f.dom.window.close();
});

test("missing remote base is visible in the Diff catalog popover while clean main stays hidden", async () => {
  const f = fixture();
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showEmptyIcons":true}');
  const source = f.document.createElement('span');
  source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({ insertions:0,deletions:0,files:0,
    presentation:{ mode:'unpushed',visible:false,branch:'main',label:'main' },
    detail:{ branch:'main',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',files:[],commits:[],commitKind:'unpushed',commitCount:null,remoteBaseMissing:true },
  }));
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null);
  f.click('[data-bb-chat-ui-info-all]'); f.click('[data-bb-chat-ui-info-choice="diff"]');
  const meta = f.document.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')!;
  assert.equal(meta.textContent,'원격 기준 없음 · origin/main');
  assert.equal(meta.querySelector('[data-bb-chat-ui-info-commit-count]'),null,"unknown is not zero");
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff-branch]')?.textContent,'main');
  stop(); f.dom.window.close();
});

test("dirty Code Diff keeps HEAD stats and PR counts while hiding unknown unpushed information", () => {
  const f = fixture();
  const source = f.document.createElement('span');
  source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify({
    insertions:7, deletions:2, files:1, branch:'feature/chat',
    presentation:{ mode:'working', visible:true, branch:'feature/chat', branchLabel:null, label:'+7 −2 · 1 file' },
    detail:{ branch:'feature/chat', basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main', files:[{ path:'draft.ts', status:'M', insertions:7, deletions:2 }], commits:[], commitKind:'pr', commitCount:8, unpushedCount:null, unpushedRef:'origin/feature/chat' },
  }));
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
  assert.equal(pill.textContent, '+7 −2 · 1 file');
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const popup = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  assert.equal(popup.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')?.textContent, 'origin/main → HEAD · 8');
  assert.equal(popup.textContent?.includes('미푸시'), false);
  assert.equal(popup.textContent?.includes('확인 불가'), false);
  assert.equal(popup.querySelectorAll('[data-bb-chat-ui-info-diff-file]').length, 1);
  stop(); f.dom.window.close();
});

test("Diff popover puts changed files before the commit heading and connected rail", async () => {
  const f = fixture();
  const source = f.document.createElement('span');
  const statuses = ['M','A','D','R','C','U','??'];
  source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify({ insertions:7, deletions:2, files:7, branch:'feature/chat', detail:{
    branch:'feature/chat', basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main',
    files:statuses.map(status => ({ path:`${status.replace('??','new')}.ts`, status, insertions:1, deletions:0 })),
    commits:[1,2,3].map(n => ({ sha:`abc1234${n}`, shortSha:`abc123${n}`, subject:`Commit ${n}` })),
  } }));
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const popup = f.document.querySelector('[data-bb-chat-ui-info-diff]')!;
  const rail = popup.querySelector('[data-bb-chat-ui-info-diff-commits]');
  const files = popup.querySelector('[data-bb-chat-ui-info-diff-files]');
  assert.ok(rail); assert.ok(files);
  const separator=popup.querySelector('hr');
  assert.ok(separator,'a semantic separator divides metadata from the lists');
  assert.ok(popup.querySelector('[data-bb-chat-ui-info-diff-meta="head"]')!.compareDocumentPosition(separator) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(separator.compareDocumentPosition(files) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(files.querySelector('h4')?.textContent,'변경 파일 · 7');
  const commitHeading=[...popup.querySelectorAll('h4')].find(heading=>heading.textContent==='커밋');
  assert.ok(commitHeading,'commits have their own short heading separate from comparison metadata');
  assert.ok(files.compareDocumentPosition(commitHeading) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(commitHeading.compareDocumentPosition(popup.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')!) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(files.compareDocumentPosition(rail) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(rail.querySelectorAll('[data-bb-chat-ui-info-diff-commit]').length, 3);
  assert.equal(rail.querySelectorAll('[data-bb-chat-ui-info-diff-graph] svg circle').length, 3);
  for (const [index,row] of [...files.querySelectorAll('[data-bb-chat-ui-info-diff-file]')].entries()) {
    const icon = row.firstElementChild;
    assert.equal(icon?.tagName.toLowerCase(), 'svg');
    assert.equal(icon?.getAttribute('data-bb-chat-ui-info-file-status'), statuses[index]);
    assert.ok(icon?.getAttribute('aria-label'));
    assert.equal(icon?.getAttribute('aria-hidden'), null);
    assert.ok(row.textContent?.includes('+1'), 'file statistics stay readable after the status icon');
  }
  assert.ok(files.querySelector('[data-bb-chat-ui-info-file-status="A"]')?.classList.contains('text-diff-added'));
  assert.ok(files.querySelector('[data-bb-chat-ui-info-file-status="D"]')?.classList.contains('text-diff-removed'));
  const updated = JSON.parse(source.getAttribute('data-bb-chat-ui-head-diff')!);
  updated.detail.files.pop();
  source.setAttribute('data-bb-chat-ui-head-diff', JSON.stringify(updated)); await f.tick();
  const refreshedFiles = popup.querySelector('[data-bb-chat-ui-info-diff-files]')!;
  assert.equal(refreshedFiles.querySelectorAll('[data-bb-chat-ui-info-diff-file]').length, 6);
  assert.equal(popup.querySelectorAll('hr').length,1,'refresh replaces rather than duplicates the separator');
  assert.equal([...popup.querySelectorAll('h4')].filter(heading=>heading.textContent==='커밋').length,1);
  assert.ok(refreshedFiles.compareDocumentPosition(popup.querySelector('[data-bb-chat-ui-info-diff-meta="commits"]')!) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'open popover refresh keeps changed files above commits');
  stop(); f.dom.window.close();
});

test("Diff popover orders commits by latest authored time, stably, and sorts refreshed lists", async () => {
  const f = fixture();
  const source = f.document.createElement('span');
  const commits = [
    { sha:'old-sha',shortSha:'old',subject:'Older',authoredAt:100 },
    { sha:'new-sha',shortSha:'new',subject:'Latest',authoredAt:300 },
    { sha:'middle-sha',shortSha:'middle',subject:'Middle',authoredAt:200 },
    { sha:'tie-sha',shortSha:'tie',subject:'Same time',authoredAt:300 },
  ];
  const snapshot = { insertions:0,deletions:0,files:0,branch:'feature/chat',detail:{
    branch:'feature/chat',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',files:[],commits,
  } };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify(snapshot));
  publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  f.click('[data-bb-chat-ui-info-trigger="diff"]');
  const rows = () => [...f.document.querySelectorAll('[data-bb-chat-ui-info-diff-commit] code')].map(row=>row.textContent);
  assert.deepEqual(rows(),['new · Latest','tie · Same time','middle · Middle','old · Older']);
  assert.deepEqual(commits.map(c=>c.shortSha),['old','new','middle','tie'],'source order is not mutated');
  commits.push({sha:'fresh-sha',shortSha:'fresh',subject:'Just committed',authoredAt:400});
  publish(); await f.tick();
  assert.deepEqual(rows(),['fresh · Just committed','new · Latest','tie · Same time','middle · Middle','old · Older']);
  stop(); f.dom.window.close();
});

test("Diff lists show five rows and independently expand their remaining rows across refreshes", async () => {
  const f = fixture();
  const source = f.document.createElement('span');
  const snapshot = { insertions:8, deletions:0, files:8, branch:'feature/chat', detail:{
    branch:'feature/chat', basis:'HEAD 대비 미커밋 변경', baseRef:'origin/main',
    files:Array.from({length:8}, (_,n) => ({path:`file-${n}.ts`,status:'M',insertions:1,deletions:0})),
    commits:Array.from({length:7}, (_,n) => ({sha:`sha-${n}`,shortSha:`${n}`,subject:`Commit ${n}`,authoredAt:n})),
  } };
  const publish = () => source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify(snapshot));
  publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  const visible = (kind:string) => [...f.document.querySelectorAll<HTMLElement>(`[data-bb-chat-ui-info-diff-${kind}]`)].filter(row => !row.hidden);
  const toggle = (kind:string) => f.document.querySelector<HTMLButtonElement>(`[data-bb-chat-ui-info-diff-toggle="${kind}"]`)!;
  try {
    f.click('[data-bb-chat-ui-info-trigger="diff"]');
    assert.equal(visible('file').length,5);
    assert.equal(visible('commit').length,5);
    assert.deepEqual(visible('commit').map(row=>row.querySelector('code')?.textContent),
      ['6 · Commit 6','5 · Commit 5','4 · Commit 4','3 · Commit 3','2 · Commit 2']);
    for (const kind of ['files','commits']) {
      assert.equal(toggle(kind).getAttribute('aria-expanded'),'false');
      assert.ok(f.document.getElementById(toggle(kind).getAttribute('aria-controls')!));
    }
    assert.equal(toggle('files').textContent,'3개 더 보기');
    assert.equal(toggle('commits').textContent,'2개 더 보기');
    const hidden = f.document.querySelector<HTMLElement>('[data-bb-chat-ui-info-diff-file][hidden]')!;
    assert.equal(f.dom.window.getComputedStyle(hidden).display,'none','hidden rows do not occupy the scroll view');
    toggle('files').click();
    assert.equal(visible('file').length,8);
    assert.equal(visible('commit').length,5,'opening files does not open commits');
    assert.equal(toggle('files').getAttribute('aria-expanded'),'true');
    assert.equal(toggle('files').textContent,'접기');
    snapshot.detail.files.push({path:'file-8.ts',status:'A',insertions:1,deletions:0});
    snapshot.files++;
    snapshot.detail.commits.push({sha:'sha-7',shortSha:'7',subject:'Commit 7',authoredAt:7});
    publish(); await f.tick();
    assert.equal(visible('file').length,9,'open files stay expanded on refresh');
    assert.equal(visible('commit').length,5,'closed commits stay collapsed on refresh');
    assert.equal(toggle('commits').textContent,'3개 더 보기');
    toggle('commits').click();
    assert.equal(visible('commit').length,8);
    toggle('files').click();
    assert.equal(visible('file').length,5);
    assert.equal(visible('commit').length,8,'closing files leaves commits open');
    f.click('[data-bb-chat-ui-info-trigger="diff"]');
    f.click('[data-bb-chat-ui-info-trigger="diff"]');
    assert.equal(visible('file').length,5,'reopening resets the preview');
    assert.equal(visible('commit').length,5);
  } finally { stop(); f.dom.window.close(); }
});

test("Diff lists with five or fewer rows have no collapse control", () => {
  const f = fixture();
  const source = f.document.createElement('span');
  source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:5,deletions:0,files:5,branch:'feature/chat',detail:{
    branch:'feature/chat',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',
    files:Array.from({length:5}, (_,n)=>({path:`file-${n}.ts`,status:'M',insertions:1,deletions:0})),
    commits:Array.from({length:5}, (_,n)=>({sha:`sha-${n}`,shortSha:`${n}`,subject:`Commit ${n}`})),
  }}));
  f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  const stop = injectComposerInfo(f.document);
  try {
    f.click('[data-bb-chat-ui-info-trigger="diff"]');
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-diff-toggle]'),null);
    assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-diff-file]:not([hidden])').length,5);
    assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-diff-commit]:not([hidden])').length,5);
  } finally { stop(); f.dom.window.close(); }
});

test("Diff numeric updates roll only changed values while exposing the new count immediately", async () => {
  for (const reduced of [false,true]) {
    const f = fixture();
    Object.defineProperty(f.dom.window,'matchMedia',{ value:() => ({ matches:reduced }) });
    const stop = injectComposerInfo(f.document);
    const pill = () => f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
    const number = (key:string) => pill().querySelector(`[data-bb-chat-ui-info-diff-number="${key}"]`)!;
    assert.equal(pill().querySelector('[data-bb-chat-ui-info-diff-previous]'),null,'first display does not roll');
    f.document.querySelector('#thread-prompt-banner-git-toggle')!.textContent = '+38 −4 · 12 files';
    await f.tick();
    assert.equal(number('added').getAttribute('data-bb-chat-ui-info-diff-value'),'38');
    assert.equal(number('files').getAttribute('data-bb-chat-ui-info-diff-value'),'12');
    assert.equal(pill().getAttribute('aria-label')?.includes('+38 −4 · 12 files'),true);
    assert.equal(number('removed').querySelector('[data-bb-chat-ui-info-diff-previous]'),null,'unchanged digits stay still');
    assert.equal(pill().querySelectorAll('[data-bb-chat-ui-info-diff-previous]').length,reduced ? 0 : 2);
    if (!reduced) {
      assert.equal(number('added').querySelector('[data-bb-chat-ui-info-diff-previous]')?.getAttribute('aria-hidden'),'true');
      f.document.querySelector('#thread-prompt-banner-git-toggle')!.textContent = '+7 −4 · 12 files'; await f.tick();
      assert.equal(number('added').querySelector('[data-bb-chat-ui-info-diff-previous]')?.getAttribute('data-bb-chat-ui-info-diff-value'),'38','rapid updates use the last real value');
      const current = number('added').querySelector('[data-bb-chat-ui-info-diff-current]')!;
      current.dispatchEvent(new f.dom.window.Event('animationend'));
      assert.equal(number('added').textContent,'7','finished transitions remove the old display');
    }
    stop(); f.dom.window.close();
  }
});

test("Diff roulette supports PR and main commit counts without rolling digits in branch names", async () => {
  for (const mode of ['branch','unpushed']) {
    const f = fixture();
    const source = f.document.createElement('span');
    let count = 3;
    const publish = () => source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({
      insertions:0,deletions:0,files:0,
      presentation:{ mode,visible:true,branch:mode === 'branch' ? 'chat-2026' : 'main',branchLabel:'chat-2026',label:mode === 'branch' ? `chat-2026 · ${count} commits` : `↑${count}` },
      detail:{ commitCount:count },
    }));
    publish(); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
    const stop = injectComposerInfo(f.document);
    const pill = f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')!;
    assert.equal(pill.querySelectorAll('[data-bb-chat-ui-info-diff-number]').length,1);
    count = 8; publish(); await f.tick();
    const number = pill.querySelector('[data-bb-chat-ui-info-diff-number="commits"]')!;
    assert.equal(number.textContent,'8','old digits do not contaminate the real displayed text');
    assert.equal(number.querySelector('[data-bb-chat-ui-info-diff-previous]')?.getAttribute('data-bb-chat-ui-info-diff-value'),'3');
    if (mode === 'branch') assert.equal(pill.querySelector('[data-bb-chat-ui-info-commit-count]')?.getAttribute('aria-label'),'커밋 8개');
    else assert.equal(pill.textContent,'↑8');
    const current = number.querySelector('[data-bb-chat-ui-info-diff-current]');
    f.document.querySelector('[aria-label="Goal"]')!.append(' updated'); await f.tick();
    assert.equal(number.querySelector('[data-bb-chat-ui-info-diff-current]'),current,'unrelated data preserves the current transition');
    stop();
    assert.equal(pill.isConnected,false,'unloading removes the transitioning pill');
    f.dom.window.close();
  }
});

test("a loading Diff with no result fades away, staying inert and cancelling when data returns", async () => {
  for (const result of ['non-git','clean-main']) for (const reduced of [false,true]) {
    const f = fixture();
    Object.defineProperty(f.dom.window,'matchMedia',{ value:() => ({ matches:reduced }) });
    Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetWidth',{get() { return this.hasAttribute('data-bb-chat-ui-info-trigger') ? 64 : 0; }});
    const source = f.document.createElement('span'); source.setAttribute('data-bb-chat-ui-head-diff','');
    f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
    const exits:{ node:HTMLElement; frames:Keyframe[]; options:KeyframeAnimationOptions; animation:Animation; cancelled:boolean }[] = [];
    f.dom.window.HTMLElement.prototype.animate = function(frames,options) {
      const entry = { node:this,frames:frames as Keyframe[],options:options as KeyframeAnimationOptions,animation:null as unknown as Animation,cancelled:false };
      entry.animation = { cancel:() => { entry.cancelled=true; } } as Animation;
      if (this.hasAttribute('data-bb-chat-ui-info-exiting')) exits.push(entry);
      return entry.animation;
    };
    const stop = injectComposerInfo(f.document);
    assert.ok(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"][aria-busy]'));
    if (result === 'non-git') source.setAttribute('data-bb-chat-ui-head-diff-state','unavailable');
    else source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:0,deletions:0,files:0,presentation:{mode:'unpushed',visible:false,branch:'main',label:'main'}}));
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]:not([data-bb-chat-ui-info-exiting])'),null);
    assert.equal(exits.length,reduced ? 0 : 1);
    if (!reduced) {
      assert.equal(exits[0].options.duration,200);
      assert.equal(exits[0].frames.at(-1)?.opacity,0);
      assert.equal(exits[0].frames[0].width,'64px','the departing pill keeps its original slot initially');
      assert.equal(exits[0].frames.at(-1)?.width,'0px','the slot shrinks with the visible pill');
      assert.notEqual(exits[0].node.style.position,'absolute','neighbours follow the shrinking slot instead of jumping');
      assert.equal(exits[0].node.style.transformOrigin,'left center','the departing pill shrinks towards its left edge');
      assert.equal(exits[0].node.nextElementSibling,f.document.querySelector('[data-bb-chat-ui-info-trigger="children"]'),'the exit stays in the original pill order');
      assert.equal(exits[0].node.getAttribute('aria-hidden'),'true');
      assert.equal(exits[0].node.hasAttribute('disabled'),true);
      source.setAttribute('data-bb-chat-ui-head-diff-state','ready');
      source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:2,deletions:0,files:1,presentation:{mode:'working',visible:true,branch:'main',label:'+2 −0 · 1 file'}}));
      await f.tick();
      assert.equal(exits[0].cancelled,true);
      assert.equal(exits[0].node.isConnected,false,'returning data cannot leave a second ghost pill');
      assert.equal(f.document.querySelectorAll('[data-bb-chat-ui-info-trigger="diff"]').length,1);
      source.setAttribute('data-bb-chat-ui-head-diff',''); source.setAttribute('data-bb-chat-ui-head-diff-state','loading'); await f.tick();
      source.setAttribute('data-bb-chat-ui-head-diff-state','unavailable'); await f.tick();
      assert.equal(exits.length,2);
      if (result === 'clean-main') {
        const finish = exits[1].animation.onfinish as (() => void) | null;
        finish?.();
        assert.equal(exits[1].node.isConnected,false,'completion removes the visual placeholder');
      }
    }
    stop(); assert.equal(f.document.querySelector('[data-bb-chat-ui-info-exiting]'),null);
    if (!reduced && result === 'non-git') assert.equal(exits[1].cancelled,true,'unload cancels an unfinished exit');
    f.dom.window.close();
  }
});

test("every queued addition sends a droplet, including equal-count replacement and catalog-only queues", async () => {
  const f = fixture();
  const settings = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  settings.setAttribute('data-bb-chat-ui-info-settings','{"showQueue":"상단 표시"}');
  const queue = f.document.querySelector('section[aria-label="Queued messages"]')!;
  queue.querySelector('header button')!.innerHTML = '<span data-queued-messages-count>2</span>';
  const count = queue.querySelector('[data-queued-messages-count]')!;
  const rows = queue.querySelector('#queue')!;
  const add = (id:string) => { const row = f.document.createElement('div'); row.setAttribute('data-queued-message-id',id); rows.append(row); return row; };
  const a = add('a'); const b = add('b');
  const records:{ node:HTMLElement; options:KeyframeAnimationOptions; animation:Animation; cancelled:boolean }[] = [];
  f.dom.window.HTMLElement.prototype.animate = function(_frames,options) {
    const record = { node:this,options:options as KeyframeAnimationOptions,animation:null as unknown as Animation,cancelled:false };
    record.animation = { cancel:() => { record.cancelled=true; } } as Animation; records.push(record); return record.animation;
  };
  const stop = injectComposerInfo(f.document);
  const flights = () => records.filter(record => record.node.hasAttribute('data-bb-chat-ui-info-queue-drop'));
  assert.equal(flights().length,0,'existing queue content is not a new send');
  add('c'); count.textContent='3'; await f.tick();
  assert.equal(flights().length,1);
  assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="queue"]')?.textContent,'3','count updates without waiting for the flight');
  add('d'); count.textContent='4'; await f.tick();
  assert.equal(flights().length,2,'the second send also flies while the first animation is running');
  a.remove(); count.textContent='3'; await f.tick(); assert.equal(flights().length,2,'removal is not an addition');
  b.setAttribute('data-queued-message-id','replacement'); await f.tick();
  assert.equal(flights().length,3,'a new message is detected even when the count stays the same');
  const finish = flights()[2].animation.onfinish as (() => void) | null; finish?.();
  assert.equal(flights()[2].node.isConnected,false);
  assert.equal(records.find(record => record.options.duration===150)?.node,f.document.querySelector('[data-bb-chat-ui-info-trigger="queue"]'),'the receiving pill absorbs the droplet');
  settings.setAttribute('data-bb-chat-ui-info-settings','{"showQueue":"목록에만 표시"}'); await f.tick();
  add('e'); count.textContent='4'; await f.tick();
  assert.equal(flights().length,4);
  const finishOrb = flights()[3].animation.onfinish as (() => void) | null; finishOrb?.();
  assert.equal(records.filter(record => record.options.duration===150).at(-1)?.node,f.document.querySelector('[data-bb-chat-ui-info-all]'));
  settings.setAttribute('data-bb-chat-ui-info-thread','other-thread'); await f.tick();
  assert.equal(flights().length,4,'thread changes reset the baseline');
  assert.ok(flights().filter(record => record.node.isConnected).length===0,'scope changes remove flying droplets');
  assert.ok(flights().slice(0,2).every(record=>record.cancelled));
  add('f'); count.textContent='5'; await f.tick(); assert.equal(flights().length,5);
  count.textContent='6'; await f.tick(); assert.equal(flights().length,6,'a collapsed list can update its count before rendering the new row');
  add('late-row'); await f.tick(); assert.equal(flights().length,6,'later detail rendering does not repeat the send');
  stop(); assert.equal(f.document.querySelector('[data-bb-chat-ui-info-queue-drop]'),null);
  assert.equal(flights().at(-1)?.cancelled,true);
  f.dom.window.close();
});

test("queued addition motion respects reduced motion and disabled queue settings", async () => {
  for (const reduced of [true,false]) {
    const f=fixture();
    Object.defineProperty(f.dom.window,'matchMedia',{value:()=>({matches:reduced})});
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings',JSON.stringify({showQueue:reduced?'상단 표시':'끄기'}));
    const header=f.document.querySelector('section[aria-label="Queued messages"] header button')!;
    header.innerHTML='<span data-queued-messages-count>1</span>';
    let flights=0;
    f.dom.window.HTMLElement.prototype.animate=function() { if(this.hasAttribute('data-bb-chat-ui-info-queue-drop')) flights++; return {cancel(){}} as Animation; };
    const stop=injectComposerInfo(f.document);
    header.querySelector('span')!.textContent='2'; await f.tick();
    assert.equal(flights,0);
    stop();f.dom.window.close();
  }
});

test("existing pills slide sideways when a new pill enters ahead of them", async () => {
  const f=fixture();
  f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showGoal":"상단 표시"}');
  f.document.querySelector('[data-promptbox-shell] > .grid')!.getBoundingClientRect=()=>({width:230} as DOMRect);
  const source=f.document.createElement('span');
  const publish=(visible:boolean) => source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({insertions:0,deletions:0,files:0,presentation:{mode:'branch',visible,branch:'feature/chat',label:'feature/c…'}}));
  publish(false); f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
  Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetWidth',{get(){return this.hasAttribute('data-bb-chat-ui-info-trigger') ? 64 : 0;}});
  Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetLeft',{get(){let x=0; for(let n=this.previousElementSibling;n;n=n.previousElementSibling) if(!n.hidden) x+=72; return x;}});
  const moves:{node:HTMLElement;frames:Keyframe[];cancelled:boolean}[]=[];
  f.dom.window.HTMLElement.prototype.animate=function(frames){const record={node:this,frames:frames as Keyframe[],cancelled:false}; if(record.frames[0].translate) moves.push(record); return {cancel(){record.cancelled=true;}} as Animation;};
  const stop=injectComposerInfo(f.document);
  assert.equal(moves.length,0,'initial entry retains its droplet animation');
  const child=f.document.querySelector('[data-bb-chat-ui-info-trigger="children"]');
  publish(true); await f.tick();
  const move=moves.find(record=>record.node===child)!;
  assert.ok(move,'an existing pill is pushed without jumping');
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-exiting]'),'overflow retirement must not block neighbours moving sideways');
  assert.equal(move.frames[0].translate,'-72px 0');
  assert.equal(move.frames.at(-1)?.translate,'0px 0');
  stop(); assert.ok(move.cancelled,'unload cancels lateral motion'); f.dom.window.close();
});

test("ordinary disappearing pills keep an inert shrinking slot and clear it when they return", async () => {
  const f=fixture(); f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showGoal":"상단 표시"}');
  Object.defineProperty(f.dom.window.HTMLElement.prototype,'offsetWidth',{get(){return this.hasAttribute('data-bb-chat-ui-info-trigger') ? 64 : 0;}});
  const exits:{node:HTMLElement;frames:Keyframe[];cancelled:boolean}[]=[];
  f.dom.window.HTMLElement.prototype.animate=function(frames){const record={node:this,frames:frames as Keyframe[],cancelled:false}; if(this.hasAttribute('data-bb-chat-ui-info-exiting')) exits.push(record); return {cancel(){record.cancelled=true;}} as Animation;};
  const stop=injectComposerInfo(f.document);
  const goal=f.document.querySelector('section[aria-label="Goal"]')!; const parent=goal.parentNode!;
  goal.remove(); await f.tick();
  const exit=exits[0]; assert.ok(exit,'exit is not limited to a loading Diff');
  assert.equal(exit.node.style.transformOrigin,'left center');
  assert.equal(exit.node.getAttribute('aria-hidden'),'true');
  assert.equal(exit.frames.at(-1)?.width,'0px');
  parent.appendChild(goal); await f.tick();
  assert.equal(exit.cancelled,true); assert.equal(exit.node.isConnected,false);
  stop();f.dom.window.close();
});

test("queued arrivals survive row-first and count-first rendering without missing or repeating flights", async () => {
  const f=fixture(); f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showQueue":"상단 표시"}');
  const queue=f.document.querySelector('section[aria-label="Queued messages"]')!;
  queue.querySelector('header button')!.innerHTML='<span data-queued-messages-count>2</span>';
  const count=queue.querySelector('[data-queued-messages-count]')!; const rows=queue.querySelector('#queue')!;
  const add=(id:string)=>{const row=f.document.createElement('div');row.setAttribute('data-queued-message-id',id);rows.append(row);return row;};
  add('a'); const b=add('b');
  const drops:HTMLElement[]=[];
  f.dom.window.HTMLElement.prototype.animate=function(){if(this.hasAttribute('data-bb-chat-ui-info-queue-drop')) drops.push(this);return {cancel(){}} as Animation;};
  const stop=injectComposerInfo(f.document);
  add('c'); await f.tick(); assert.equal(drops.length,1,'row-first arrivals are immediate');
  count.textContent='3'; await f.tick(); assert.equal(drops.length,1,'the later counter does not repeat the same arrival');
  count.textContent='4'; await f.tick(); assert.equal(drops.length,2);
  add('d'); await f.tick(); assert.equal(drops.length,2,'the later row does not repeat the count-first arrival');
  b.remove(); add('e'); count.textContent='3'; await f.tick(); assert.equal(drops.length,3,'an arrival concurrent with dispatch still flies');
  assert.equal(drops.at(-1)?.style.position,'fixed','flight escapes composer clipping and stacking');
  assert.equal(drops.at(-1)?.parentNode,f.document.body);
  stop();assert.equal(f.document.querySelector('[data-bb-chat-ui-info-queue-drop]'),null);f.dom.window.close();
});

test("queue rerendering does not turn existing messages into extra droplets", async () => {
  const f=fixture(); f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings','{"showQueue":"상단 표시"}');
  const queue=f.document.querySelector('section[aria-label="Queued messages"]')!;
  queue.querySelector('header button')!.innerHTML='<span data-queued-messages-count>2</span>';
  const count=queue.querySelector('[data-queued-messages-count]')!; const rows=queue.querySelector('#queue')!;
  const add=(id:string)=>{const row=f.document.createElement('div');row.setAttribute('data-queued-message-id',id);rows.append(row);return row;};
  const a=add('a'); add('b');
  let flights=0;
  f.dom.window.HTMLElement.prototype.animate=function(){if(this.hasAttribute('data-bb-chat-ui-info-queue-drop')) flights++;return {cancel(){}} as Animation;};
  const stop=injectComposerInfo(f.document);
  a.remove(); await f.tick();
  add('a'); add('c'); count.textContent='3'; await f.tick();
  assert.equal(flights,1,'restoring an existing row alongside one new send flies only once');
  rows.replaceChildren(); count.textContent='0'; await f.tick();
  add('a'); add('b'); add('c'); add('d'); count.textContent='4'; await f.tick();
  assert.equal(flights,2,'rebuilding all rows and the counter does not replay old messages');
  const parent=queue.parentNode!;
  queue.remove(); await f.tick(); parent.appendChild(queue); await f.tick();
  assert.equal(flights,2,'temporarily remounting the queue is not another send');
  add('e'); await f.tick(); assert.equal(flights,3,'a real row-first send still flies immediately');
  rows.querySelector('[data-queued-message-id="e"]')!.remove(); await f.tick();
  add('e'); count.textContent='5'; await f.tick();
  assert.equal(flights,3,'a rerender between the row and counter preserves their shared arrival');
  add('f'); add('g'); count.textContent='7'; await f.tick();
  assert.equal(flights,5,'two real messages still receive two droplets');
  stop();f.dom.window.close();
});
