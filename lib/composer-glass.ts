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

export const composerGlassCss = `
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
  border-color: transparent !important;
  border-radius: 1.375rem !important;
  transition: box-shadow 320ms cubic-bezier(0.2, 0.8, 0.2, 1) !important;
  box-shadow:
    0 12px 32px -14px ${LIGHT_SHADOW},
    inset 0 1px 0 ${LIGHT_EDGE};
}
${FOOTER} [data-promptbox][data-promptbox-compact] {
  border-radius: 999px !important;
}
${FOOTER} [data-promptbox] button,
${FOOTER} [data-promptbox] [role="button"] {
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

  const sync = () => {
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
