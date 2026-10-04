const STYLE_ID = "bb-chat-ui-user-attachments";
const USER_BUBBLE =
  '[data-message-column] > .group\\/message.ml-auto > .flex > .rounded-xl:has(> .mt-2.space-y-2)';

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
