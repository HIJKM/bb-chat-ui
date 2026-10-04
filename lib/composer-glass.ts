const FOOTER = "[data-scroll-footer]:has(.chat-prompt-box)";
const PLATE = ":scope > .relative";
const COMPOSER = "[data-promptbox]";
const FADE_HEIGHT = "--bb-chat-ui-fade-height";
const PLATE_HEIGHT = "--bb-chat-ui-plate-height";
const JUMP_TOP = "--bb-chat-ui-jump-top";
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
  top: var(${JUMP_TOP}, 0px);
  right: 1rem;
  left: auto;
  transform: none;
  z-index: 21;
}
${FOOTER}:has(${JUMP_BUTTON}:not(.invisible)) section:has(${PILL}) {
  padding-right: 2.5rem;
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

export const JUMP_ABOVE_COMPOSER_PX = 8;

export function jumpButtonTopAboveComposer(input: {
  columnTop: number;
  composerTop: number;
  buttonHeight: number;
}): number {
  const buttonHeight = input.buttonHeight > 0 ? input.buttonHeight : 32;
  return Math.round(
    input.composerTop - buttonHeight - JUMP_ABOVE_COMPOSER_PX - input.columnTop,
  );
}

export function jumpButtonTop(input: {
  columnTop: number;
  pillTop: number;
  pillHeight: number;
  buttonHeight: number;
}): number {
  const buttonHeight = input.buttonHeight > 0 ? input.buttonHeight : 32;
  return Math.round(
    input.pillTop + input.pillHeight / 2 - buttonHeight / 2 - input.columnTop,
  );
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
      alignJumpButton(footer);
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
    stackMutations.observe(stack, { childList: true, subtree: true });
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
    const columns = document.querySelectorAll(".chat-prompt-box");
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns.item(index);
      if (column instanceof HTMLElement) column.style.removeProperty(JUMP_TOP);
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

function alignJumpButton(footer: HTMLElement): void {
  const column = footer.querySelector(".chat-prompt-box");
  if (!(column instanceof HTMLElement)) return;
  const button = footer.querySelector(JUMP_BUTTON);
  if (!(button instanceof HTMLElement)) {
    column.style.removeProperty(JUMP_TOP);
    return;
  }
  const columnRect = column.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const pill = footer.querySelector(PILL);
  if (pill instanceof HTMLElement) {
    const pillRect = pill.getBoundingClientRect();
    column.style.setProperty(
      JUMP_TOP,
      `${jumpButtonTop({
        columnTop: columnRect.top,
        pillTop: pillRect.top,
        pillHeight: pillRect.height,
        buttonHeight: buttonRect.height,
      })}px`,
    );
    return;
  }
  const composer = footer.querySelector(COMPOSER);
  if (!(composer instanceof HTMLElement)) {
    column.style.removeProperty(JUMP_TOP);
    return;
  }
  const composerRect = composer.getBoundingClientRect();
  column.style.setProperty(
    JUMP_TOP,
    `${jumpButtonTopAboveComposer({
      columnTop: columnRect.top,
      composerTop: composerRect.top,
      buttonHeight: buttonRect.height,
    })}px`,
  );
}
