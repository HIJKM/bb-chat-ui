const STYLE_ID = "bb-chat-ui-queued-messages";
const QUEUE = 'section[aria-label="Queued messages"]';
const LABEL_ATTR = "data-bb-chat-ui-queue-label";
const COLLAPSE_LABEL = "Collapse queued messages";

export const queuedMessagesCss = `
${QUEUE}:has([data-queued-messages-mode]) {
  position: static !important;
  align-self: stretch;
  width: 100%;
  margin: 0 !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  height: auto !important;
  padding-bottom: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
}
${QUEUE}:has([data-queued-messages-mode]) [data-queued-messages-scroll-frame] {
  display: grid !important;
  flex: none !important;
  grid-template-rows: 1fr;
  height: auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  opacity: 1;
  transition: grid-template-rows 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease;
}
${QUEUE}:has([data-queued-messages-mode="collapsed"]) [data-queued-messages-scroll-frame] {
  grid-template-rows: 0fr;
  opacity: 0;
}
${QUEUE}:has([data-queued-messages-mode]) [data-queued-messages-scroll] {
  height: auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
@media (prefers-reduced-motion: reduce) {
  ${QUEUE}:has([data-queued-messages-mode]) [data-queued-messages-scroll-frame] {
    transition: none;
  }
}
${QUEUE} header[data-queued-messages-mode] {
  order: 1;
  width: fit-content;
  margin-left: auto;
  height: 36px !important;
  padding: 0 11px 0 15px !important;
  border: 0 !important;
  border-radius: 18px !important;
  background: var(--foreground) !important;
  opacity: 1;
  gap: 6px;
}
${QUEUE} header[data-queued-messages-mode][data-bb-chat-ui-queue-label]::before {
  content: attr(data-bb-chat-ui-queue-label);
  color: var(--background);
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.1px;
}
${QUEUE} header[data-queued-messages-mode] > div:first-child,
${QUEUE} header[data-queued-messages-mode] > button {
  display: none !important;
}
${QUEUE} header[data-queued-messages-mode] button {
  width: auto !important;
  color: var(--background) !important;
  opacity: 1 !important;
}
${QUEUE} header[data-queued-messages-mode] button svg {
  opacity: 1 !important;
  color: var(--background) !important;
}
${QUEUE} [data-queued-message-group-divider] {
  display: none !important;
}
${QUEUE} [data-queued-message-row] button[aria-label^="Reorder"] {
  display: none !important;
}
${QUEUE} [data-queued-message-row] button[aria-label$=" actions"] {
  display: none !important;
}
${QUEUE} [data-queued-message-row] {
  border: 0 !important;
  background: transparent !important;
  padding: 4px 0 !important;
}
${QUEUE} [data-queued-message-row] > .flex {
  width: 100%;
  align-items: center !important;
  justify-content: flex-start;
  flex-direction: row-reverse;
  gap: 8px;
}
${QUEUE} [data-queued-message-row] > .flex > .min-w-0 {
  flex: 0 1 auto;
  max-width: 70%;
  overflow: visible !important;
  background: var(--surface-recessed);
  color: var(--foreground);
  border: 1px solid var(--border-seam);
  border-radius: calc(var(--radius) + 4px);
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  line-height: 1.625;
  opacity: 1;
}
${QUEUE} [data-queued-message-row] .truncate {
  overflow: visible !important;
  text-overflow: unset !important;
  white-space: normal !important;
  font-size: 0.875rem !important;
  line-height: 1.625 !important;
}
${QUEUE} [data-queued-message-actions] {
  position: static !important;
  top: auto !important;
  right: auto !important;
  transform: none !important;
  translate: none !important;
  align-self: center !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  display: flex !important;
  background: transparent !important;
}
${QUEUE} [data-queued-message-actions] button[aria-label^="Delete"] {
  order: 1;
}
${QUEUE} [data-queued-message-actions] button[aria-label^="Send"],
${QUEUE} [data-queued-message-actions] button[aria-label^="Steer"] {
  order: 2;
}
${QUEUE} [data-queued-message-actions] button[aria-label^="Edit"] {
  order: 3;
}
`;

export function readQueueCount(text: string | null): string {
  const count = text?.trim() ?? "";
  return /^\d+$/.test(count) ? count : "";
}

export function queuePillLabel(
  mode: string | null,
  count: string,
  caret?: string | null,
): string {
  if (caret === COLLAPSE_LABEL) return "접기";
  if (caret == null && (mode === "drawer" || mode === "workspace")) return "접기";
  return count.length > 0 ? `대기 메시지 ${count}개` : "대기 메시지";
}

export function shouldFoldQueue(input: {
  mode: string | null;
  canCollapse: boolean;
  editing: boolean;
  folded: boolean;
}): boolean {
  if (input.folded || input.editing || !input.canCollapse) return false;
  return input.mode === "drawer";
}

function syncSection(
  section: HTMLElement,
  folded: WeakSet<HTMLElement>,
): HTMLButtonElement | null {
  const header = section.querySelector("header[data-queued-messages-mode]");
  if (!(header instanceof HTMLElement)) return null;
  const mode = header.getAttribute("data-queued-messages-mode");
  const count = readQueueCount(
    header.querySelector("span.tabular-nums")?.textContent ?? null,
  );
  const caret = header.querySelector("button[aria-expanded]");
  const label = queuePillLabel(mode, count, caret?.getAttribute("aria-label"));
  if (header.getAttribute(LABEL_ATTR) !== label) {
    header.setAttribute(LABEL_ATTR, label);
  }
  const editing =
    section.querySelector("[data-queued-message-inline-editor]") !== null;
  const collapse = section.querySelector(
    `button[aria-label="${COLLAPSE_LABEL}"]`,
  );
  const canCollapse = collapse instanceof HTMLButtonElement;
  if (
    !shouldFoldQueue({
      mode,
      canCollapse,
      editing,
      folded: folded.has(section),
    }) ||
    !(collapse instanceof HTMLButtonElement)
  ) {
    return null;
  }
  folded.add(section);
  return collapse;
}

export function injectQueuedMessages(document: Document): () => void {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = queuedMessagesCss;
  document.head.append(style);

  const folded = new WeakSet<HTMLElement>();
  const sync = () => {
    const sections = document.querySelectorAll(QUEUE);
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections.item(index);
      if (!(section instanceof HTMLElement)) continue;
      if (!section.querySelector("[data-queued-messages-mode]")) continue;
      const collapse = syncSection(section, folded);
      collapse?.click();
    }
  };

  let mutations: MutationObserver | null = null;
  if (document.body && typeof MutationObserver !== "undefined") {
    mutations = new MutationObserver(() => {
      sync();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
  }
  sync();

  return () => {
    mutations?.disconnect();
    style.remove();
    const headers = document.querySelectorAll(`header[${LABEL_ATTR}]`);
    for (let index = 0; index < headers.length; index += 1) {
      headers.item(index)?.removeAttribute(LABEL_ATTR);
    }
  };
}
