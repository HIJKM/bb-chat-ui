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

test("pills bubble once on first visible appearance, preserving avatar motion and cancelling on unload", async () => {
  const f = fixture();
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'상단 표시', showQueue:'상단 표시' }));
  const entries: { key:string; frames:Keyframe[]; cancelled:boolean }[] = [];
  f.dom.window.HTMLElement.prototype.animate = function(frames) {
    const key = this.getAttribute('data-bb-chat-ui-info-trigger');
    const entry = { key:key ?? 'orb', frames:frames as Keyframe[], cancelled:false };
    entries.push(entry);
    return { cancel:() => { entry.cancelled = true; } } as Animation;
  };
  const stop = injectComposerInfo(f.document);
  const pills = () => entries.filter(entry => entry.key !== 'orb');
  assert.deepEqual(pills().map(entry => entry.key), ['diff', 'goal', 'queue']);
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-avatar][data-new]'), 'avatars retain their existing individual bubbles');
  assert.ok(pills()[0].frames.some(frame => frame.transform === 'translateY(-4px) scale(1.18)'));
  f.document.querySelector('#thread-prompt-banner-git-toggle')!.textContent = '+14 −4 · 3 files';
  await f.tick();
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'끄기', showQueue:'상단 표시' }));
  await f.tick();
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showGoal:'상단 표시', showQueue:'상단 표시' }));
  await f.tick();
  f.dom.window.dispatchEvent(new f.dom.window.Event('resize')); await f.tick();
  assert.deepEqual(pills().map(entry => entry.key), ['diff', 'goal', 'queue'], 'refresh, re-enable and resize do not replay entry motion');
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
    f.dom.window.HTMLElement.prototype.animate = function() {
      const key = this.getAttribute('data-bb-chat-ui-info-trigger');
      if (key) animated.push(key);
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

test("Agentation shows icon and count, retains native actions, and closes with the native dismissal", async () => {
  const f = fixture();
  const stack = f.document.querySelector('[data-promptbox-shell] > .grid')!;
  const source = f.document.querySelector('[data-bb-chat-ui-info-settings]')!;
  source.setAttribute('data-bb-chat-ui-info-settings', JSON.stringify({ showAnnotations:'상단 표시' }));
  source.insertAdjacentHTML('beforeend', '<span data-bb-chat-ui-info-icon="annotations"><svg data-sdk-fallback><path d="M1 1h1" /></svg></span>');
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
  assert.ok(pill.querySelector('[data-feedback-icon]'));
  f.click('[data-bb-chat-ui-info-trigger="annotations"]');
  await f.tick();
  assert.ok(shell.hasAttribute('data-bb-chat-ui-info-open'));
  assert.equal(shell.parentElement, parent);
  assert.equal(f.dom.window.getComputedStyle(shell).display, 'grid');
  assert.ok(pill.querySelector('[data-feedback-icon]'), 'expanded native header retains the original feedback glyph');
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
  assert.deepEqual([...icons].map(icon => icon.getAttribute('data-bb-chat-ui-info-trigger')), ['diff','children','annotations']);
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
  assert.ok(popup.textContent?.includes('HEAD 대비 미커밋 변경'));
  const rows = popup.querySelectorAll('[data-bb-chat-ui-info-diff-file]');
  assert.equal(rows.length, 2);
  assert.ok(rows[0].textContent?.includes('app.tsx'));
  assert.ok(rows[0].textContent?.includes('+8'));
  assert.ok(rows[0].textContent?.includes('−2'));
  assert.ok(rows[1].textContent?.includes('통계 없음'));
  assert.ok(popup.textContent?.includes('a7c21f0 · 컴포저 정보 정리'));
  assert.ok(popup.textContent?.includes('main 대비'));
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
  assert.ok(popup.textContent?.includes('PR 후보 · 8 commits · origin/main 대비'));
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

test("first entry waits for SDK Diff data instead of flashing the host Diff before the branch or hidden main", async () => {
  for (const showEmptyIcons of [false,true]) {
    const f = fixture();
    f.document.querySelector('[data-bb-chat-ui-info-settings]')!.setAttribute('data-bb-chat-ui-info-settings',JSON.stringify({ showEmptyIcons }));
    const source = f.document.createElement('span');
    source.setAttribute('data-bb-chat-ui-head-diff','');
    f.document.querySelector('[data-promptbox-shell] > .grid')!.append(source);
    const stop = injectComposerInfo(f.document);
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null,'no provisional host line counts or empty icons during initial loading');
    f.click('[data-bb-chat-ui-info-all]');
    assert.ok(f.document.querySelector('[data-bb-chat-ui-info-choice="diff"]'),'catalog remains available');
    f.click('[data-bb-chat-ui-info-all]');
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({ insertions:0,deletions:0,files:0,branch:'feature/chat',
      presentation:{ mode:'branch',visible:true,branch:'feature/chat',branchLabel:'feature/c…',label:'feature/c… · 8 commits' },
      detail:{ branch:'feature/chat',basis:'HEAD 대비 미커밋 변경',baseRef:'origin/main',files:[],commits:[],commitKind:'pr',commitCount:8 },
    }));
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]')?.textContent,'feature/c… · 8');
    // A new thread's source is empty until its own first result arrives.
    source.setAttribute('data-bb-chat-ui-head-diff',''); await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null);
    source.setAttribute('data-bb-chat-ui-head-diff',JSON.stringify({ insertions:0,deletions:0,files:0,branch:null,
      presentation:{ mode:'unpushed',visible:false,branch:'main',branchLabel:'main',label:'main' },
    }));
    await f.tick();
    assert.equal(f.document.querySelector('[data-bb-chat-ui-info-trigger="diff"]'),null,'clean main stays hidden from entry through first result');
    stop(); f.dom.window.close();
  }
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
  assert.ok(f.document.querySelector('[data-bb-chat-ui-info-diff]')?.textContent?.includes('미푸시 · 0 commits · origin/main 대비'));
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
  assert.ok(popup.textContent?.includes('PR 후보 · 8 commits · origin/main 대비'));
  assert.equal(popup.textContent?.includes('미푸시'), false);
  assert.equal(popup.textContent?.includes('확인 불가'), false);
  assert.equal(popup.querySelectorAll('[data-bb-chat-ui-info-diff-file]').length, 1);
  stop(); f.dom.window.close();
});

test("Diff popover puts a connected commit rail before file rows with semantic status icons", () => {
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
  assert.ok(rail.compareDocumentPosition(files) & f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
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
