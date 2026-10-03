const FOOTER = "[data-scroll-footer]:has(.chat-prompt-box)";
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
${FOOTER} > .relative {
  background: transparent !important;
}
${FOOTER} [data-overflow-fade="above"] {
  top: auto !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  height: calc(100% + var(--bb-chat-ui-plate-height, 12rem)) !important;
  background-image: linear-gradient(
    to bottom,
    transparent,
    var(--background)
  ) !important;
}
${FACE} {
  background: color-mix(in oklab, white 78%, transparent) !important;
  border-color: color-mix(in oklab, ${INK} 10%, transparent) !important;
  backdrop-filter: blur(14px) saturate(1.25);
  -webkit-backdrop-filter: blur(14px) saturate(1.25);
  box-shadow:
    0 6px 18px -12px ${LIGHT_SHADOW},
    inset 0 1px 0 ${LIGHT_EDGE};
}
${FOOTER} [data-promptbox] {
  border-radius: 1.375rem !important;
  box-shadow:
    0 12px 32px -14px ${LIGHT_SHADOW},
    inset 0 1px 0 ${LIGHT_EDGE};
}
${FOOTER} [data-promptbox][data-promptbox-compact] {
  border-radius: 999px !important;
}
${FOOTER} [data-promptbox]:focus-within {
  border-color: color-mix(in oklab, ${INK} 24%, transparent) !important;
  box-shadow:
    0 18px 44px -16px color-mix(in oklab, ${INK} 34%, transparent),
    inset 0 1px 0 ${LIGHT_EDGE};
}
${darkScope(FACE)} {
  background: oklch(0.27 0.008 275 / 0.86) !important;
  border-color: ${DARK_EDGE} !important;
  box-shadow:
    0 6px 18px -12px ${DARK_SHADOW},
    inset 0 1px 0 ${DARK_EDGE};
}
${darkScope(`${FOOTER} [data-promptbox]`)} {
  box-shadow:
    0 12px 32px -14px ${DARK_SHADOW},
    inset 0 1px 0 ${DARK_EDGE};
}
${darkScope(`${FOOTER} [data-promptbox]:focus-within`)} {
  border-color: color-mix(in oklab, ${INK} 24%, transparent) !important;
  box-shadow:
    0 18px 44px -16px color-mix(in oklab, ${INK} 34%, transparent),
    inset 0 1px 0 ${DARK_EDGE};
}
${FOOTER} .chat-prompt-box {
  position: relative;
}
${FOOTER}:has(${PILL}) ${JUMP_BUTTON} {
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

export function applyPlateHeight(node: PlateHeightTarget, height: number): void {
  if (!Number.isFinite(height) || height <= 0) {
    node.style.removeProperty(PLATE_HEIGHT);
    return;
  }
  node.style.setProperty(PLATE_HEIGHT, `${Math.ceil(height)}px`);
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
    const frame = footer?.closest("[data-thread-window]");
    if (footer instanceof HTMLElement && frame instanceof HTMLElement) {
      applyPlateHeight(frame, footer.getBoundingClientRect().height);
    }
    if (footer instanceof HTMLElement) alignJumpButton(footer);
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
    const columns = document.querySelectorAll(".chat-prompt-box");
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns.item(index);
      if (column instanceof HTMLElement) column.style.removeProperty(JUMP_TOP);
    }
  };
}

function alignJumpButton(footer: HTMLElement): void {
  const column = footer.querySelector(".chat-prompt-box");
  if (!(column instanceof HTMLElement)) return;
  const pill = footer.querySelector(PILL);
  const button = footer.querySelector(JUMP_BUTTON);
  if (!(pill instanceof HTMLElement) || !(button instanceof HTMLElement)) {
    column.style.removeProperty(JUMP_TOP);
    return;
  }
  const columnRect = column.getBoundingClientRect();
  const pillRect = pill.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const top = jumpButtonTop({
    columnTop: columnRect.top,
    pillTop: pillRect.top,
    pillHeight: pillRect.height,
    buttonHeight: buttonRect.height,
  });
  column.style.setProperty(JUMP_TOP, `${top}px`);
}
