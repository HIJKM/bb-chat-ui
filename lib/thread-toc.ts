const STYLE_ID = "bb-chat-ui-thread-toc";
const RAIL_MARK = "data-bb-chat-ui-toc-rail";
const ROOT_MARK = "data-bb-chat-ui-toc-root";
const CURRENT_MARK = "data-bb-chat-ui-toc-current";
const SELECTED_MARK = "data-bb-chat-ui-toc-selected";
const USER_TAB_LABEL = "Your messages";
const TICK_MAX_PX = 32;
const TICK_MIN_PX = 10;
const TICK_REACH_PX = 48;
const TICK_GAP_PX = 4;

export const threadTocCss = `
[id^="thread-toc-panel-"] > .rounded-lg > .flex.items-center {
  display: none !important;
}
[id^="thread-toc-panel-"] .bg-gradient-to-b,
[id^="thread-toc-panel-"] .bg-gradient-to-t {
  display: none !important;
}
[id^="thread-toc-panel-"] ul > li {
  display: none !important;
}
[id^="thread-toc-panel-"] ul > li[${CURRENT_MARK}] {
  display: block !important;
}
[id^="thread-toc-panel-"] li button {
  background-color: transparent !important;
}
[id^="thread-toc-panel-"] .max-h-64 {
  max-height: 48rem !important;
}
[id^="thread-toc-panel-"] .line-clamp-2 {
  -webkit-line-clamp: 6;
  line-clamp: 6;
}
[id^="thread-toc-panel-"] > .rounded-lg {
  transform-origin: right center;
  transition: transform 140ms ease-out;
  background: color-mix(in oklab, white 78%, transparent) !important;
  border-color: transparent !important;
  backdrop-filter: blur(14px) saturate(1.25);
  -webkit-backdrop-filter: blur(14px) saturate(1.25);
  box-shadow:
    0 6px 18px -12px color-mix(in oklab, var(--ink, var(--foreground)) 22%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 85%, transparent);
}
.dark [id^="thread-toc-panel-"] > .rounded-lg {
  background: oklch(0.27 0.008 275 / 0.86) !important;
  border-color: transparent !important;
  box-shadow:
    0 6px 18px -12px color-mix(in oklab, black 60%, transparent),
    inset 0 1px 0 color-mix(in oklab, white 12%, transparent);
}
[id^="thread-toc-panel-"]:hover > .rounded-lg {
  transform: scale(1.05);
}
[data-thread-toc] button.no-scrollbar,
[data-thread-toc] button.no-scrollbar > span {
  align-items: flex-end !important;
  gap: ${TICK_GAP_PX}px !important;
}
[data-thread-toc] button.no-scrollbar span.rounded-full {
  width: ${TICK_MIN_PX}px;
  background-color: color-mix(in oklab, var(--foreground) 20%, transparent) !important;
  transition: width 90ms ease-out, background-color 150ms;
}
[data-thread-toc] button.no-scrollbar span.rounded-full[${SELECTED_MARK}] {
  background-color: color-mix(in oklab, var(--foreground) 72%, transparent) !important;
}
`;

const hoveredTickByRoot = new WeakMap<HTMLElement, number>();

export function tickWidth(distancePx: number): number {
  const distance = Math.max(0, distancePx);
  if (distance >= TICK_REACH_PX) return TICK_MIN_PX;
  const closeness = 1 - distance / TICK_REACH_PX;
  return TICK_MIN_PX + (TICK_MAX_PX - TICK_MIN_PX) * closeness * closeness;
}

export function listIndexForTick(
  tickIndex: number,
  tickCount: number,
  listCount: number,
): number {
  if (listCount <= 1 || tickCount <= 1) return 0;
  const index = Math.round(
    (tickIndex * (listCount - 1)) / (tickCount - 1),
  );
  return Math.min(listCount - 1, Math.max(0, index));
}

export function injectThreadToc(document: Document): () => void {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = threadTocCss;
  document.head.append(style);

  const cleanups: Array<() => void> = [];
  const paint = () => {
    for (const node of Array.from(
      document.querySelectorAll("[data-thread-toc] button.no-scrollbar"),
    )) {
      if (node instanceof HTMLButtonElement) bindRail(node, cleanups);
    }
    for (const node of Array.from(
      document.querySelectorAll("[data-thread-toc]"),
    )) {
      if (node instanceof HTMLElement) syncHoveredMessage(node);
    }
  };
  const observer = new MutationObserver(paint);
  observer.observe(document.body, { childList: true, subtree: true });
  paint();

  return () => {
    observer.disconnect();
    for (const cleanup of cleanups) cleanup();
    style.remove();
  };
}

function bindRail(button: HTMLButtonElement, cleanups: Array<() => void>) {
  if (button.hasAttribute(RAIL_MARK)) return;
  button.setAttribute(RAIL_MARK, "");
  const root = button.closest("[data-thread-toc]");
  const onMove = (event: MouseEvent) => {
    applyTickWidths(button, event.clientY);
    if (!(root instanceof HTMLElement)) return;
    hoveredTickByRoot.set(root, nearestTickIndex(button, event.clientY));
    syncHoveredMessage(root);
  };
  button.addEventListener("mouseenter", onMove);
  button.addEventListener("mousemove", onMove);
  cleanups.push(() => {
    button.removeEventListener("mouseenter", onMove);
    button.removeEventListener("mousemove", onMove);
    button.removeAttribute(RAIL_MARK);
    clearTickWidths(button);
    if (root instanceof HTMLElement) hoveredTickByRoot.delete(root);
  });
  if (root instanceof HTMLElement) bindRootLeave(root, cleanups);
}

function bindRootLeave(root: HTMLElement, cleanups: Array<() => void>) {
  if (root.hasAttribute(ROOT_MARK)) return;
  root.setAttribute(ROOT_MARK, "");
  const onLeave = (event: MouseEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && root.contains(next)) return;
    releaseTocFocus(root);
    clearTickWidths(root);
    for (const tick of tickElements(root)) tick.removeAttribute(SELECTED_MARK);
    for (const item of Array.from(root.querySelectorAll(`[${CURRENT_MARK}]`))) {
      item.removeAttribute(CURRENT_MARK);
    }
    hoveredTickByRoot.delete(root);
  };
  root.addEventListener("mouseleave", onLeave, true);
  cleanups.push(() => {
    root.removeEventListener("mouseleave", onLeave, true);
    root.removeAttribute(ROOT_MARK);
  });
}

function syncHoveredMessage(root: HTMLElement) {
  const tickIndex = hoveredTickByRoot.get(root);
  if (tickIndex !== undefined) markSelectedTick(root, tickIndex);
  const panel = root.querySelector('[id^="thread-toc-panel-"]');
  if (!(panel instanceof HTMLElement)) return;
  showOnlyUserMessages(panel);
  if (tickIndex === undefined) return;
  const ticks = tickElements(root);
  const items = Array.from(panel.querySelectorAll("ul > li"));
  const listIndex = listIndexForTick(tickIndex, ticks.length, items.length);
  for (const [index, item] of items.entries()) {
    if (!(item instanceof HTMLElement)) continue;
    if (index === listIndex) item.setAttribute(CURRENT_MARK, "");
    else item.removeAttribute(CURRENT_MARK);
  }
  const scroller = panel.querySelector(".overflow-y-auto");
  if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
  const tick = ticks[tickIndex];
  if (tick) placePanelBesideTick(panel, tick);
}

function releaseTocFocus(root: HTMLElement) {
  const active = root.ownerDocument.activeElement;
  if (active instanceof HTMLElement && root.contains(active)) active.blur();
}

function markSelectedTick(root: HTMLElement, tickIndex: number) {
  for (const [index, tick] of tickElements(root).entries()) {
    if (index === tickIndex) tick.setAttribute(SELECTED_MARK, "");
    else tick.removeAttribute(SELECTED_MARK);
  }
}

function showOnlyUserMessages(panel: HTMLElement) {
  const tab = Array.from(panel.querySelectorAll("button[aria-pressed]")).find(
    (button) => button.textContent?.trim() === USER_TAB_LABEL,
  );
  if (!(tab instanceof HTMLButtonElement)) return;
  if (tab.getAttribute("aria-pressed") === "true") return;
  tab.click();
}

function placePanelBesideTick(panel: HTMLElement, tick: HTMLElement) {
  const parent = panel.offsetParent;
  if (!(parent instanceof HTMLElement)) return;
  const parentRect = parent.getBoundingClientRect();
  const tickRect = tick.getBoundingClientRect();
  const tickCenter = tickRect.top - parentRect.top + tickRect.height / 2;
  const rawTop = tickCenter - panel.offsetHeight / 2;
  const maxTop = Math.max(0, parent.clientHeight - panel.offsetHeight);
  panel.style.top = `${Math.round(Math.min(Math.max(0, rawTop), maxTop))}px`;
}

function nearestTickIndex(button: HTMLButtonElement, clientY: number): number {
  const ticks = tickElements(button);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [index, tick] of ticks.entries()) {
    const rect = tick.getBoundingClientRect();
    const distance = Math.abs(clientY - (rect.top + rect.height / 2));
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

function applyTickWidths(button: HTMLButtonElement, clientY: number) {
  for (const tick of tickElements(button)) {
    const rect = tick.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    tick.style.width = `${Math.round(tickWidth(Math.abs(clientY - center)))}px`;
  }
}

function clearTickWidths(root: ParentNode) {
  for (const tick of tickElements(root)) {
    tick.style.removeProperty("width");
  }
}

function tickElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll("span.rounded-full")).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
}
