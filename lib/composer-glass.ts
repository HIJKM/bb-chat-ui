const FOOTER = "[data-scroll-footer]:has(.chat-prompt-box)";
const PLATE = ":scope > .relative";
const COMPOSER = "[data-promptbox]";
const FADE_HEIGHT = "--bb-chat-ui-fade-height";
const PLATE_HEIGHT = "--bb-chat-ui-plate-height";
const JUMP_BOTTOM = "--bb-chat-ui-jump-bottom";
const CONTROLS = "data-bb-chat-ui-controls";
const CONTROLS_MOTION = "data-bb-chat-ui-controls-motion";
const PILL = "#thread-prompt-banner-git-toggle";
const JUMP_BUTTON = 'button[aria-label="Scroll to latest event"]';
const STACK = "[data-promptbox-shell] > .grid";

const FACE = `${FOOTER} [data-promptbox],
${FOOTER} ${PILL},
${FOOTER} ${JUMP_BUTTON}`;

const INK = "var(--ink, var(--foreground))";
const LIGHT_EDGE = "color-mix(in oklab, white 85%, transparent)";
const LIGHT_SHADOW = "color-mix(in oklab, var(--ink, var(--foreground)) 22%, transparent)";
const DARK_EDGE = "color-mix(in oklab, white 12%, transparent)";
const DARK_SHADOW = "color-mix(in oklab, black 60%, transparent)";

function darkScope(selectors: string): string {
  return selectors
    .split(",\n")
    .map((selector) => `.dark ${selector}`)
    .join(",\n");
}

export const COMPOSER_GLASS_STYLE_ID = "bb-chat-ui-composer-glass";
export const COMPOSER_RADIUS_FROM = "--bb-chat-ui-radius-from";
export const COMPOSER_RADIUS_TO = "--bb-chat-ui-radius-to";
const COMPOSER_HEIGHT_MS = 360;
const COMPOSER_RADIUS_MS = 480;
const COMPOSER_COLLAPSE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const HOST_HEIGHT_TRANSITION = /height\s+240ms\b/;
const PIN_RELEASE_PX = 8;
const WIDE_RADIUS = "1.375rem";
const PILL_RADIUS = "999px";
const SHADOW_TRANSITION = "box-shadow 320ms cubic-bezier(0.2, 0.8, 0.2, 1)";
const COLLAPSE_TRANSITION = `height ${COMPOSER_HEIGHT_MS}ms ${COMPOSER_COLLAPSE_EASE}, border-radius ${COMPOSER_RADIUS_MS}ms ${COMPOSER_COLLAPSE_EASE}`;

export const composerGlassCss = `
@keyframes bb-chat-ui-composer-radius {
  from { border-radius: var(${COMPOSER_RADIUS_FROM}) !important; }
  to { border-radius: var(${COMPOSER_RADIUS_TO}) !important; }
}

[data-thread-window]:not([data-surface-tone="sidebar"]) {
  --bb-chat-ui-canvas: oklch(0.97 0 0);
  background-color: var(--bb-chat-ui-canvas) !important;
}
[data-thread-window]:not([data-surface-tone="sidebar"]) .thread-scrollbar {
  background-color: var(--bb-chat-ui-canvas) !important;
}
.dark [data-thread-window]:not([data-surface-tone="sidebar"]) {
  --bb-chat-ui-canvas: oklch(0.17 0 0);
}
main[data-sidebar="inset"]:has([data-thread-window]:not([data-surface-tone="sidebar"])) {
  --bb-chat-ui-canvas: oklch(0.97 0 0);
  background-color: var(--bb-chat-ui-canvas) !important;
}
.dark main[data-sidebar="inset"]:has([data-thread-window]:not([data-surface-tone="sidebar"])) {
  --bb-chat-ui-canvas: oklch(0.17 0 0);
}
:has(> [data-thread-window]:not([data-surface-tone="sidebar"])) > header {
  background-color: var(--bb-chat-ui-canvas) !important;
}
header:has(+ :has([data-thread-window]:not([data-surface-tone="sidebar"]))) {
  background-color: var(--bb-chat-ui-canvas) !important;
}
${FOOTER} > .relative {
  background: transparent !important;
}
${FOOTER} [data-overflow-fade="above"] {
  top: auto !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  height: var(--bb-chat-ui-fade-height, 50%) !important;
  background-image: linear-gradient(
    to bottom,
    transparent,
    var(--bb-chat-ui-canvas, var(--background)) 50%
  ) !important;
}
${FACE} {
  background: color-mix(in oklab, white 78%, transparent) !important;
  border-color: transparent !important;
  backdrop-filter: blur(14px) saturate(1.25);
  -webkit-backdrop-filter: blur(14px) saturate(1.25);
  box-shadow:
    0 6px 18px -12px ${LIGHT_SHADOW},
    inset 0 1px 0 ${LIGHT_EDGE};
}
${FOOTER} [data-promptbox] {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-color: transparent !important;
  border-radius: 1.375rem !important;
  transition: ${SHADOW_TRANSITION};
  box-shadow:
    0 12px 32px -14px ${LIGHT_SHADOW},
    inset 0 1px 0 ${LIGHT_EDGE};
}
@media (width < 48rem) {
  ${FOOTER}:has([data-promptbox-compact]) {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    max-height: 100dvh;
  }
  ${FOOTER}:has([data-promptbox-compact]) > .relative,
  ${FOOTER}:has([data-promptbox-compact]) .chat-prompt-box,
  ${FOOTER}:has([data-promptbox-compact]) [data-promptbox-shell] {
    display: flex;
    min-height: 0;
    max-height: 100%;
    flex-direction: column;
    justify-content: flex-end;
  }
  ${FOOTER}:has([data-promptbox-compact]) [data-promptbox-shell] > .grid {
    min-height: 0;
    overflow-y: auto;
  }
  ${FOOTER}:has([data-promptbox-compact]) [data-follow-up-composer-anchor] {
    flex-shrink: 0;
  }
}
@media (width >= 48rem) {
  ${FOOTER}:has([data-promptbox-compact]) {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  ${FOOTER}:has([data-promptbox-compact]) > .relative,
  ${FOOTER}:has([data-promptbox-compact]) .chat-prompt-box,
  ${FOOTER}:has([data-promptbox-compact]) [data-promptbox-shell] {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  ${FOOTER}:has([data-promptbox-compact]) [data-follow-up-composer-anchor] {
    flex-shrink: 0;
  }
}
@media (pointer: fine) {
  ${FOOTER} [data-promptbox] {
    transition:
      ${SHADOW_TRANSITION},
      ${COLLAPSE_TRANSITION};
  }
}
@media (pointer: fine) and (prefers-reduced-motion: reduce) {
  ${FOOTER} [data-promptbox] {
    transition: ${SHADOW_TRANSITION};
  }
}
${FOOTER} [data-promptbox][data-promptbox-compact] {
  border-radius: 999px !important;
}
${FOOTER} [data-promptbox][data-promptbox-compact]:has([aria-label="Exit handoff"]) {
  border-radius: 1.375rem !important;
}
${FOOTER} [data-promptbox] button:not(:has(img)),
${FOOTER} [data-promptbox] [role="button"]:not(:has(img)) {
  border-radius: 999px !important;
}
${FOOTER} [data-promptbox] [data-promptbox-send-menu] {
  border-radius: 999px !important;
}
${FOOTER} [data-promptbox]:focus-within {
  border-color: transparent !important;
  box-shadow:
    0 18px 44px -16px color-mix(in oklab, ${INK} 34%, transparent),
    inset 0 1px 0 ${LIGHT_EDGE};
}
${darkScope(FACE)} {
  background: oklch(0.27 0.008 275 / 0.86) !important;
  border-color: transparent !important;
  box-shadow:
    0 6px 18px -12px ${DARK_SHADOW},
    inset 0 1px 0 ${DARK_EDGE};
}
${darkScope(`${FOOTER} [data-promptbox]`)} {
  border-color: transparent !important;
  box-shadow:
    0 12px 32px -14px ${DARK_SHADOW},
    inset 0 1px 0 ${DARK_EDGE};
}
${darkScope(`${FOOTER} [data-promptbox]:focus-within`)} {
  border-color: transparent !important;
  box-shadow:
    0 18px 44px -16px color-mix(in oklab, ${INK} 34%, transparent),
    inset 0 1px 0 ${DARK_EDGE};
}
@media (width < 48rem) and (pointer: coarse) {
  ${FOOTER} [data-promptbox] {
    box-shadow:
      0 6px 16px -10px ${LIGHT_SHADOW},
      inset 0 1px 0 ${LIGHT_EDGE};
  }
  ${FOOTER} [data-promptbox]:focus-within {
    box-shadow:
      0 8px 20px -12px color-mix(in oklab, ${INK} 34%, transparent),
      inset 0 1px 0 ${LIGHT_EDGE};
  }
  ${darkScope(`${FOOTER} [data-promptbox]`)} {
    box-shadow:
      0 6px 16px -10px ${DARK_SHADOW},
      inset 0 1px 0 ${DARK_EDGE};
  }
  ${darkScope(`${FOOTER} [data-promptbox]:focus-within`)} {
    box-shadow:
      0 8px 20px -12px color-mix(in oklab, ${INK} 34%, transparent),
      inset 0 1px 0 ${DARK_EDGE};
  }
}
${FOOTER} .chat-prompt-box {
  position: relative;
}
${FOOTER} ${JUMP_BUTTON} {
  position: absolute;
  margin-top: 0 !important;
  top: auto;
  bottom: var(${JUMP_BOTTOM}, 0px);
  right: 1rem;
  left: auto;
  transform: none;
  z-index: 21;
}
${FOOTER} ${STACK} {
  position: relative;
  grid-template-columns: minmax(0, 1fr);
  overflow: visible !important;
}
${FOOTER} ${STACK} > * {
  order: 0;
}
${FOOTER} ${STACK}[${CONTROLS}]::after {
  content: "";
  order: 1;
  height: var(--bb-chat-ui-controls-height);
}
${FOOTER} ${STACK} > section[aria-label="To-do list"] {
  order: 2;
}
${FOOTER} ${STACK} section:has(${PILL}) {
  position: absolute;
  bottom: var(--bb-chat-ui-controls-bottom, 0px);
  left: 0;
  max-width: var(--bb-chat-ui-agentation-width, 100%);
}
${FOOTER} ${STACK} :has(> .agentation-staging-shell) {
  position: absolute;
  bottom: calc(var(--bb-chat-ui-controls-bottom, 0px) + var(--bb-chat-ui-agentation-bottom, 0px));
  left: 0;
  width: var(--bb-chat-ui-agentation-width, 100%);
  min-width: 0;
  height: 32px;
  z-index: 40;
  overflow: visible;
}
${FOOTER} ${STACK} .agentation-staging-shell {
  position: absolute;
  bottom: 0;
  left: 0;
  max-width: 100%;
}
${FOOTER} ${STACK} .agentation-staging-shell:not(.agentation-staging-shell--expanded) {
  height: 32px;
  justify-content: center;
}
${FOOTER} ${STACK} .agentation-staging-shell:not(.agentation-staging-shell--expanded) > div:first-child {
  padding-top: 4px;
  padding-bottom: 4px;
}
${FOOTER} ${STACK} .agentation-staging-shell--expanded {
  width: 100%;
  max-width: none;
}
${FOOTER} ${STACK} > section[aria-label="Queued messages"] {
  position: absolute !important;
  bottom: var(--bb-chat-ui-controls-bottom, 0px);
  transform: translateY(calc(-1 * var(--bb-chat-ui-queue-bottom, 0px)));
  right: 0;
  width: 100%;
}
${FOOTER} ${STACK}[${CONTROLS_MOTION}] :has(> .agentation-staging-shell) {
  transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
${FOOTER} ${STACK}[${CONTROLS_MOTION}] > section[aria-label="Queued messages"] {
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  ${FOOTER} ${STACK}[${CONTROLS_MOTION}] :has(> .agentation-staging-shell),
  ${FOOTER} ${STACK}[${CONTROLS_MOTION}] > section[aria-label="Queued messages"] {
    transition: none;
  }
}

`;

export interface PlateHeightTarget {
  style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
  };
}

export function fadeHeight(input: {
  plateBottom: number;
  composerTop: number;
  composerHeight: number;
}): number {
  const height = input.plateBottom - (input.composerTop + input.composerHeight / 2);
  if (!Number.isFinite(height) || height <= 0) return 0;
  return Math.round(height);
}

export function composerCornerRadius(compact: boolean, handoff: boolean): string {
  return compact && !handoff ? PILL_RADIUS : WIDE_RADIUS;
}

export function composerRadiusChange(input: {
  previousCompact: boolean;
  nextCompact: boolean;
  handoff: boolean;
  finePointer: boolean;
  reducedMotion: boolean;
}): { from: string; to: string } | null {
  if (input.previousCompact === input.nextCompact) return null;
  if (!input.finePointer || input.reducedMotion) return null;
  const from = composerCornerRadius(input.previousCompact, input.handoff);
  const to = composerCornerRadius(input.nextCompact, input.handoff);
  if (from === to) return null;
  return { from, to };
}

function unitBezier(p1: number, p2: number, t: number): number {
  const rest = 1 - t;
  return 3 * rest * rest * t * p1 + 3 * rest * t * t * p2 + t * t * t;
}

function collapseProgress(elapsedMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return 1;
  const x = Math.min(1, Math.max(0, elapsedMs / durationMs));
  if (x === 0 || x === 1) return x;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (unitBezier(0.22, 0.36, mid) < x) low = mid;
    else high = mid;
  }
  return unitBezier(1, 1, (low + high) / 2);
}

export function composerCollapseHeight(input: {
  from: number;
  to: number;
  elapsedMs: number;
  durationMs: number;
}): number {
  const progress = collapseProgress(input.elapsedMs, input.durationMs);
  return input.from + (input.to - input.from) * progress;
}

export function composerHeightTransition(current: string): string | null {
  if (!HOST_HEIGHT_TRANSITION.test(current)) return null;
  return current.replace(HOST_HEIGHT_TRANSITION, `height ${COMPOSER_HEIGHT_MS}ms`);
}

function parsePx(value: string): number | null {
  if (!value.endsWith("px")) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export interface ComposerHeightMotion {
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
}

export function planComposerHeight(input: {
  transition: string;
  height: string;
  now: number;
  idleHeight: number;
  motion: ComposerHeightMotion | null;
}): {
  motion: ComposerHeightMotion | null;
  rewrite: { from: number; to: number; transition: string } | null;
  resume: { from: number; to: number; remainingMs: number; transition: string } | null;
} {
  const none = { motion: input.motion, rewrite: null, resume: null };
  const lengthened = composerHeightTransition(input.transition);
  if (lengthened) {
    const to = parsePx(input.height);
    if (to == null || !(input.idleHeight > 0)) return none;
    return {
      motion: {
        from: input.idleHeight,
        to,
        startedAt: input.now,
        durationMs: COMPOSER_HEIGHT_MS,
      },
      rewrite: { from: input.idleHeight, to, transition: lengthened },
      resume: null,
    };
  }
  if (!input.motion || input.height !== "") return none;
  const elapsed = input.now - input.motion.startedAt;
  if (elapsed >= input.motion.durationMs) {
    return { motion: null, rewrite: null, resume: null };
  }
  return {
    motion: input.motion,
    rewrite: null,
    resume: {
      from: input.motion.from,
      to: input.motion.to,
      remainingMs: input.motion.durationMs - elapsed,
      transition: `height ${input.motion.durationMs}ms ${COMPOSER_COLLAPSE_EASE} -${elapsed}ms`,
    },
  };
}

const DESKTOP_LAYOUT_QUERY = "(width >= 48rem)";
const VISUAL_BOTTOM_PX = 8;

export function desktopCollapseStick(input: {
  desktop: boolean;
  scrollGap: number;
  footerBottom: number;
  scrollerBottom: number;
}): boolean {
  if (input.scrollGap <= 4) return true;
  if (!input.desktop) return false;
  return Math.abs(input.scrollerBottom - input.footerBottom) <= VISUAL_BOTTOM_PX;
}

export function composerLift(input: {
  desktop: boolean;
  stick: boolean;
  scrollerBottom: number;
  plateBottom: number;
}): string | null {
  if (!input.desktop || !input.stick) return null;
  const delta = input.scrollerBottom - input.plateBottom;
  if (Math.abs(delta) < 1) return null;
  return `translateY(${delta}px)`;
}

export function nextPinnedScroll(input: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  stick: boolean;
  lastPinned: number | null;
}): { scrollTop: number | null; stick: boolean } {
  if (!input.stick) return { scrollTop: null, stick: false };
  const max = Math.max(0, input.scrollHeight - input.clientHeight);
  const userMovedUp =
    input.lastPinned != null &&
    input.scrollTop < input.lastPinned - PIN_RELEASE_PX &&
    input.scrollTop < max - 1;
  if (userMovedUp) return { scrollTop: null, stick: false };
  if (Math.abs(max - input.scrollTop) < 1) return { scrollTop: null, stick: true };
  return { scrollTop: max, stick: true };
}

export function applyComposerRadius(
  element: {
    style: {
      setProperty(name: string, value: string): void;
      animation: string;
    };
    getBoundingClientRect(): unknown;
  },
  change: { from: string; to: string },
): void {
  element.style.setProperty(COMPOSER_RADIUS_FROM, change.from);
  element.style.setProperty(COMPOSER_RADIUS_TO, change.to);
  element.style.animation = "none";
  element.getBoundingClientRect();
  element.style.animation = `bb-chat-ui-composer-radius ${COMPOSER_RADIUS_MS}ms ${COMPOSER_COLLAPSE_EASE}`;
}

export function applyFadeHeight(node: PlateHeightTarget, height: number): void {
  if (!Number.isFinite(height) || height <= 0) {
    node.style.removeProperty(FADE_HEIGHT);
    return;
  }
  node.style.setProperty(FADE_HEIGHT, `${Math.round(height)}px`);
}

export function composerControlsLayout(input: {
  width: number;
  diffHeight: number;
  agentation: boolean;
  agentationWidth: number;
  queue: boolean;
  jumpHeight: number;
  rightWidth: number;
}): {
  height: number;
  agentationBottom: number;
  queueBottom: number;
  agentationWidth: number;
  queueWidth: number;
} {
  const agentationBottom = input.diffHeight > 0 ? input.diffHeight + 8 : 0;
  const queueBottom = input.jumpHeight > 0 ? input.jumpHeight + 8 : 0;
  const leftHeight = input.agentation ? agentationBottom + 32 : input.diffHeight;
  const rightHeight = input.queue ? queueBottom + 36 : input.jumpHeight;
  const queueOverlapsAgentation = input.queue && input.agentation &&
    agentationBottom + 32 > queueBottom + 36 + 8;
  return {
    height: Math.max(leftHeight, rightHeight),
    agentationBottom,
    queueBottom,
    agentationWidth: Math.max(0, input.width - (input.rightWidth > 0 ? input.rightWidth + 8 : 0)),
    queueWidth: Math.max(0, input.width - (queueOverlapsAgentation ? input.agentationWidth + 8 : 0)),
  };
}

export function injectComposerGlass(document: Document): () => void {
  const style = document.createElement("style");
  style.id = COMPOSER_GLASS_STYLE_ID;
  style.textContent = composerGlassCss;
  document.head.append(style);

  let observed: Element | null = null;
  let observer: ResizeObserver | null = null;
  let stackObserved: Element | null = null;
  let stackMutations: MutationObserver | null = null;
  const radiusWatches = new Set<() => void>();
  const watchedComposers = new WeakSet<HTMLElement>();
  const idleHeights = new WeakMap<HTMLElement, number>();
  const animating = new WeakSet<HTMLElement>();

  const bindComposerRadius = (composer: HTMLElement) => {
    if (watchedComposers.has(composer) || typeof MutationObserver === "undefined") return;
    watchedComposers.add(composer);
    let compact = composer.hasAttribute("data-promptbox-compact");
    let generation = 0;
    let motion: ComposerHeightMotion | null = null;
    let finishTimer = 0;
    let pinFrame = 0;
    let pinning = false;
    let lastPinned: number | null = null;
    let anchorHold: { node: HTMLElement; previous: string } | null = null;
    let liftPlate: HTMLElement | null = null;
    const viewOf = () => composer.ownerDocument.defaultView;

    const clearDesktopHold = () => {
      if (anchorHold) {
        anchorHold.node.style.overflowAnchor = anchorHold.previous;
        anchorHold = null;
      }
      if (liftPlate) {
        liftPlate.style.transform = "";
        liftPlate = null;
      }
    };

    const stopPin = () => {
      const view = viewOf();
      if (pinFrame && view) view.cancelAnimationFrame(pinFrame);
      pinFrame = 0;
      pinning = false;
      lastPinned = null;
      clearDesktopHold();
    };

    const stopFinish = () => {
      const view = viewOf();
      if (finishTimer && view) view.clearTimeout(finishTimer);
      finishTimer = 0;
    };

    const scrollerOf = () => {
      const scroller = composer.closest(".thread-scrollbar");
      return scroller instanceof HTMLElement ? scroller : null;
    };

    const keepScroll = (scroller: HTMLElement | null, scrollTop: number | null) => {
      if (scroller && scrollTop != null) scroller.scrollTop = scrollTop;
    };

    const startPin = () => {
      const view = viewOf();
      const scroller = scrollerOf();
      stopPin();
      if (!view || !scroller) return;
      const desktop = view.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
      const footer = composer.closest("[data-scroll-footer]");
      const footerEl = footer instanceof HTMLElement ? footer : null;
      const scrollerBottom = scroller.getBoundingClientRect().bottom;
      const stick = desktopCollapseStick({
        desktop,
        scrollGap: scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
        footerBottom: footerEl?.getBoundingClientRect().bottom ?? scrollerBottom,
        scrollerBottom,
      });
      if (!stick) return;
      if (desktop) {
        const content = scroller.firstElementChild;
        if (content instanceof HTMLElement) {
          anchorHold = { node: content, previous: content.style.overflowAnchor };
          content.style.overflowAnchor = "none";
        }
        const plate = footerEl?.querySelector(":scope > .relative");
        if (plate instanceof HTMLElement) liftPlate = plate;
      }
      pinning = true;
      lastPinned = scroller.scrollTop;
      const tick = () => {
        pinFrame = 0;
        if (!pinning) return;
        const node = scrollerOf();
        if (!node) {
          pinning = false;
          clearDesktopHold();
          return;
        }
        const planned = nextPinnedScroll({
          scrollTop: node.scrollTop,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
          stick: true,
          lastPinned,
        });
        if (!planned.stick) {
          pinning = false;
          lastPinned = null;
          clearDesktopHold();
          return;
        }
        if (planned.scrollTop != null) node.scrollTop = planned.scrollTop;
        lastPinned = node.scrollTop;
        if (liftPlate) {
          const previousLift = liftPlate.style.transform;
          liftPlate.style.transform = "none";
          const plateBottom = liftPlate.getBoundingClientRect().bottom;
          liftPlate.style.transform = previousLift;
          const lift = composerLift({
            desktop: true,
            stick: true,
            scrollerBottom: node.getBoundingClientRect().bottom,
            plateBottom,
          });
          liftPlate.style.transform = lift ?? "";
        }
        pinFrame = view.requestAnimationFrame(tick);
      };
      pinFrame = view.requestAnimationFrame(tick);
    };

    const finishMotion = () => {
      motion = null;
      animating.delete(composer);
      composer.style.transition = "none";
      composer.style.height = "";
      composer.style.transition = "";
      composer.style.willChange = "";
      composer.style.overflow = "";
      stopPin();
    };

    const changes = new MutationObserver(() => {
      const nextCompact = composer.hasAttribute("data-promptbox-compact");
      const view = viewOf();
      const change = composerRadiusChange({
        previousCompact: compact,
        nextCompact,
        handoff: composer.querySelector('[aria-label="Exit handoff"]') != null,
        finePointer: view?.matchMedia("(pointer: fine)").matches ?? false,
        reducedMotion:
          view?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? false,
      });
      compact = nextCompact;
      if (change != null) {
        const current = ++generation;
        applyComposerRadius(composer, change);
        const onEnd = (event: AnimationEvent) => {
          if (event.animationName !== "bb-chat-ui-composer-radius") return;
          composer.removeEventListener("animationend", onEnd);
          if (current !== generation) return;
          composer.style.animation = "";
        };
        composer.addEventListener("animationend", onEnd);
      }

      const plan = planComposerHeight({
        transition: composer.style.transition,
        height: composer.style.height,
        now: view?.performance.now() ?? 0,
        idleHeight: idleHeights.get(composer) ?? 0,
        motion,
      });
      if (plan.rewrite) {
        stopFinish();
        motion = plan.motion;
        animating.add(composer);
        const scroller = scrollerOf();
        const savedScroll = scroller?.scrollTop ?? null;
        composer.style.transition = "none";
        composer.style.height = `${plan.rewrite.from}px`;
        composer.getBoundingClientRect();
        composer.style.transition = plan.rewrite.transition;
        composer.style.height = `${plan.rewrite.to}px`;
        keepScroll(scroller, savedScroll);
        startPin();
        return;
      }
      if (plan.resume) {
        motion = plan.motion;
        animating.add(composer);
        const scroller = scrollerOf();
        const savedScroll = scroller?.scrollTop ?? null;
        composer.style.transition = "none";
        composer.style.height = `${plan.resume.from}px`;
        composer.getBoundingClientRect();
        composer.style.overflow = "hidden";
        composer.style.willChange = "height";
        composer.style.transition = plan.resume.transition;
        composer.style.height = `${plan.resume.to}px`;
        keepScroll(scroller, savedScroll);
        if (!view) return;
        stopFinish();
        finishTimer = view.setTimeout(() => {
          finishTimer = 0;
          finishMotion();
        }, plan.resume.remainingMs);
        return;
      }
      if (motion && !plan.motion) {
        motion = null;
        animating.delete(composer);
        stopPin();
      }
    });
    changes.observe(composer, {
      attributes: true,
      attributeFilter: ["data-promptbox-compact", "style"],
    });
    radiusWatches.add(() => {
      changes.disconnect();
      stopFinish();
      stopPin();
      animating.delete(composer);
    });
  };

  const sync = () => {
    const footers = document.querySelectorAll(FOOTER);
    for (let index = 0; index < footers.length; index += 1) {
      const footerNode = footers.item(index);
      if (!(footerNode instanceof HTMLElement)) continue;
      const composers = footerNode.querySelectorAll(COMPOSER);
      for (let composerIndex = 0; composerIndex < composers.length; composerIndex += 1) {
        const composer = composers.item(composerIndex);
        if (!(composer instanceof HTMLElement)) continue;
        bindComposerRadius(composer);
        if (!animating.has(composer)) {
          const height = composer.getBoundingClientRect().height;
          if (height > 0) idleHeights.set(composer, height);
        }
      }
    }
    const footer = document.querySelector(FOOTER);
    if (footer instanceof HTMLElement) {
      alignFade(footer);
      alignComposerControls(footer);
    }
    if (footer === observed || typeof ResizeObserver === "undefined") {
      bindStack(footer);
      return;
    }
    observer?.disconnect();
    observed = footer;
    if (footer instanceof HTMLElement) {
      observer = new ResizeObserver(() => {
        sync();
      });
      observer.observe(footer);
    }
    bindStack(footer);
  };

  const bindStack = (footer: Element | null) => {
    const stack = footer?.querySelector(STACK) ?? null;
    if (stack === stackObserved) return;
    stackMutations?.disconnect();
    stackObserved = stack;
    if (!stack || typeof MutationObserver === "undefined") return;
    stackMutations = new MutationObserver(() => {
      sync();
    });
    stackMutations.observe(footer ?? stack, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "data-queued-messages-mode"],
    });
  };

  let mutations: MutationObserver | null = null;
  if (document.body && typeof MutationObserver !== "undefined") {
    mutations = new MutationObserver(() => {
      if (observed?.isConnected && stackObserved?.isConnected) return;
      observed = null;
      stackObserved = null;
      sync();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
  }
  sync();

  return () => {
    mutations?.disconnect();
    stackMutations?.disconnect();
    observer?.disconnect();
    for (const stop of radiusWatches) stop();
    radiusWatches.clear();
    style.remove();
    const frames = document.querySelectorAll("[data-thread-window]");
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames.item(index);
      if (frame instanceof HTMLElement) frame.style.removeProperty(PLATE_HEIGHT);
    }
    const plates = document.querySelectorAll(`${FOOTER} > .relative`);
    for (let index = 0; index < plates.length; index += 1) {
      const plate = plates.item(index);
      if (plate instanceof HTMLElement) plate.style.removeProperty(FADE_HEIGHT);
    }
    for (const stack of Array.from(document.querySelectorAll(STACK))) {
      stack.removeAttribute(CONTROLS);
      stack.removeAttribute(CONTROLS_MOTION);
      if (!(stack instanceof HTMLElement)) continue;
      for (const name of ["controls-height", "controls-bottom", "agentation-bottom", "queue-bottom", "agentation-width", "queue-width"]) {
        stack.style.removeProperty(`--bb-chat-ui-${name}`);
      }
    }
    const columns = document.querySelectorAll(".chat-prompt-box");
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns.item(index);
      if (column instanceof HTMLElement) column.style.removeProperty(JUMP_BOTTOM);
    }
  };
}

function alignFade(footer: HTMLElement): void {
  const plate = footer.querySelector(PLATE);
  if (!(plate instanceof HTMLElement)) return;
  const composer = footer.querySelector(COMPOSER);
  if (!(composer instanceof HTMLElement)) {
    plate.style.removeProperty(FADE_HEIGHT);
    return;
  }
  const plateRect = plate.getBoundingClientRect();
  const composerRect = composer.getBoundingClientRect();
  applyFadeHeight(
    plate,
    fadeHeight({
      plateBottom: plateRect.bottom,
      composerTop: composerRect.top,
      composerHeight: composerRect.height,
    }),
  );
}

function alignComposerControls(footer: HTMLElement): void {
  const column = footer.querySelector(".chat-prompt-box");
  const stack = footer.querySelector(STACK);
  if (!(column instanceof HTMLElement) || !(stack instanceof HTMLElement)) return;
  const button = footer.querySelector(JUMP_BUTTON);
  const jumpVisible = button instanceof HTMLElement && !button.classList.contains("invisible");
  const pill = stack.querySelector(PILL)?.closest("section");
  const agentation = stack.querySelector(".agentation-staging-shell");
  const queue = stack.querySelector('section[aria-label="Queued messages"]');
  const width = stack.getBoundingClientRect().width;
  const layout = composerControlsLayout({
    width,
    diffHeight: pill?.getBoundingClientRect().height ?? 0,
    agentation: agentation !== null,
    agentationWidth: agentation?.getBoundingClientRect().width ?? 0,
    queue: queue !== null,
    jumpHeight: jumpVisible ? button.getBoundingClientRect().height : 0,
    rightWidth: queue ? 36 : jumpVisible ? button.getBoundingClientRect().width : 0,
  });
  if (layout.height > 0) stack.setAttribute(CONTROLS, "");
  else stack.removeAttribute(CONTROLS);
  const values = {
    "--bb-chat-ui-controls-height": layout.height,
    "--bb-chat-ui-agentation-bottom": layout.agentationBottom,
    "--bb-chat-ui-queue-bottom": layout.queueBottom,
    "--bb-chat-ui-agentation-width": layout.agentationWidth,
    "--bb-chat-ui-queue-width": layout.queueWidth,
  };
  for (const [name, value] of Object.entries(values)) {
    const next = `${Math.round(value)}px`;
    if (stack.style.getPropertyValue(name) !== next) stack.style.setProperty(name, next);
  }
  const todo = stack.querySelector('section[aria-label="To-do list"]');
  const anchor = todo ?? footer.querySelector("[data-follow-up-composer-anchor]");
  if (!(anchor instanceof HTMLElement)) return;
  const base = anchor.getBoundingClientRect().top - 8;
  const bottom = `${Math.round(stack.getBoundingClientRect().bottom - base)}px`;
  if (stack.style.getPropertyValue("--bb-chat-ui-controls-bottom") !== bottom) {
    stack.style.setProperty("--bb-chat-ui-controls-bottom", bottom);
  }
  const jumpBottom = `${Math.round(column.getBoundingClientRect().bottom - base)}px`;
  if (column.style.getPropertyValue(JUMP_BOTTOM) !== jumpBottom) {
    column.style.setProperty(JUMP_BOTTOM, jumpBottom);
  }
  if (!stack.hasAttribute(CONTROLS_MOTION)) {
    // Resolve the initial geometry before enabling transitions.
    stack.getBoundingClientRect();
    stack.setAttribute(CONTROLS_MOTION, "");
  }
}
