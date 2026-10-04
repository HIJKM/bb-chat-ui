const STYLE_ID = "bb-chat-ui-user-attachments";
const USER_BUBBLE =
  '[data-message-column] > .group\\/message.ml-auto > .flex > .rounded-xl:has(> .mt-2.space-y-2)';
const FILE_CHIP = `${USER_BUBBLE} > .mt-2.space-y-2 > .flex:not(:has(img)) > :is(a, button, span)`;
const FILE_ICON = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="black" fill-rule="evenodd" d="M3.5 1.5h5.4L13 5.6V14c0 .3-.2.5-.5.5h-9c-.3 0-.5-.2-.5-.5V2c0-.3.2-.5.5-.5h.5zm5.2.9.1.1V5.5h3.1L8.7 2.4z"/></svg>`,
);
const FILE_ICON_MASK = `url("data:image/svg+xml,${FILE_ICON}") center / contain no-repeat`;

export function userAttachmentsCss(): string {
  return `
${USER_BUBBLE} {
  display: contents;
}
${USER_BUBBLE} > .mt-2.space-y-2 {
  display: contents;
}
${USER_BUBBLE} > .mt-2.space-y-2 > .flex {
  order: -1;
  align-self: flex-end;
  max-width: 100%;
}
${USER_BUBBLE} > .mt-2.space-y-2 > .flex:last-child {
  margin-bottom: 8px;
}
${FILE_CHIP} {
  box-sizing: border-box;
  gap: 6px;
  min-height: 64px;
  padding: 6px 14px 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  line-height: 1.25;
}
${FILE_CHIP}::before {
  content: "";
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  background-color: currentColor;
  -webkit-mask: ${FILE_ICON_MASK};
  mask: ${FILE_ICON_MASK};
}
${USER_BUBBLE} > .break-words {
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  align-self: flex-end;
  background: var(--surface-recessed);
  border: 1px solid var(--border-seam);
  border-radius: calc(var(--radius) + 4px);
  padding: 0.625rem 1rem;
}
${USER_BUBBLE}:not(:has(> .break-words)) > p {
  display: none;
}
${USER_BUBBLE}:has(> .mt-1) > .break-words {
  padding-bottom: 1.75rem;
}
${USER_BUBBLE} > .mt-1 {
  align-self: flex-end;
  position: relative;
  z-index: 1;
  margin-top: -1.5rem;
  margin-right: 1rem;
  margin-bottom: 0.625rem;
}
${USER_BUBBLE}:has(> span.line-clamp-1) > .break-words {
  padding-top: 1.75rem;
}
${USER_BUBBLE} > span.line-clamp-1 {
  align-self: flex-end;
  position: relative;
  z-index: 1;
  max-width: calc(100% - 2rem);
  margin-right: 1rem;
  margin-bottom: -1.5rem;
  margin-left: 1rem;
}
${USER_BUBBLE} > .break-words[style*="mask-image"] {
  mask-image: none !important;
  -webkit-mask-image: none !important;
}
${USER_BUBBLE} > .break-words[style*="mask-image"] > * {
  mask-image: linear-gradient(to bottom, black calc(100% - 2.5rem), transparent);
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 2.5rem), transparent);
}
`;
}

export function injectUserAttachments(document: Document): () => void {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = userAttachmentsCss();
  document.head.append(style);
  return () => {
    style.remove();
  };
}
