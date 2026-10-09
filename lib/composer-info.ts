import { exposedInfo, infoKinds, listedInfo, type InfoKind } from "./composer-info-settings.ts";
import { DARK_GLASS_FACE, LIGHT_GLASS_FACE } from "./glass-surface.ts";
import { HEAD_DIFF_MARK, openChangesPanel } from "./workspace-diff-pill.ts";
import { childInitial, type ChildState, type ChildSummary } from "./composer-child.ts";

const STACK = "[data-promptbox-shell] > .grid";
const MARK = "data-bb-chat-ui-info";
const UNIT = `${MARK}-unit`;
const WRAP = `${MARK}-wrap`;
const OPEN = `${MARK}-open`;
const SOURCE = `${MARK}-settings`;
const REQUEST = ['tool-use-ask', 'plugin-request-banner', 'plan-review-request', 'approval-banner', 'user-question-banner', 'plan-review-banner'].map(id => `[data-testid="${id}"]`).join(", ");
const NATIVE = `section[aria-label], .agentation-staging-shell, [${MARK}-kind]`;
const DETAIL = `${STACK}[${MARK}-stack] [${UNIT}][${OPEN}]:not([hidden])`;

// The orb is always reachable. Fit measured pills into one row, with essentials first.
export function fitComposerInfo(items: readonly { key: string; width: number }[], width: number): string[] {
  let used = 0;
  const result: string[] = [];
  const rank = (key: string) => key === "diff" ? 0 : key === "children" ? 1 : 2;
  for (const item of [...items].sort((a, b) => rank(a.key) - rank(b.key))) {
    const needed = item.width + (used ? 8 : 0);
    if (used + needed > Math.max(0, width - 40)) continue;
    used += needed;
    result.push(item.key);
  }
  return result;
}

export const composerInfoCss = `
[${MARK}-stack] { position:relative; display:block !important; overflow:visible !important; }
[${MARK}-stack]::after { display:none !important; }
[${WRAP}] { display:contents !important; }
[${UNIT}] { display:none !important; }
[${MARK}-bar] { position:relative; display:flex; align-items:center; gap:8px; height:32px; min-width:0; padding-right:40px; }
[${MARK}-bar][hidden] { display:none; }
[${MARK}-bar] button { font:inherit; cursor:pointer; color:var(--foreground); }
[${MARK}-bar] button:focus-visible { outline:2px solid var(--ring); outline-offset:3px; }
[${MARK}-trigger], [${MARK}-all] { display:inline-flex; flex:none; align-items:center; justify-content:center; gap:6px; height:32px; max-width:100%; padding:4px 11px; border:0; border-radius:999px; font-size:12px !important; line-height:18px; white-space:nowrap; background:${LIGHT_GLASS_FACE}; backdrop-filter:blur(14px) saturate(1.25); box-shadow:0 6px 18px -12px color-mix(in oklab,var(--foreground) 22%,transparent),inset 0 1px 3px color-mix(in oklab,var(--popover) 35%,transparent); transition:transform 260ms cubic-bezier(.2,.9,.22,1.25); }
.dark [${MARK}-trigger], .dark [${MARK}-all] { background:${DARK_GLASS_FACE}; }
[${MARK}-trigger]:hover, [${MARK}-all]:hover { transform:translateY(-1px); }
[${MARK}-trigger]:active, [${MARK}-all]:active { transform:scale(.95); }
[${MARK}-trigger][aria-expanded=true], [${MARK}-all][aria-expanded=true] { box-shadow:inset 0 0 0 1px var(--border),0 6px 18px -12px var(--foreground); }
[${MARK}-trigger][hidden] { display:none; }
[${MARK}-trigger] > span:not([${MARK}-avatars]) { overflow:hidden; text-overflow:ellipsis; }
[${MARK}-trigger] svg { width:16px; height:16px; flex-shrink:0; }
[${MARK}-trigger] [data-bb-chat-ui-branch] { display:inline-flex; flex-shrink:0; color:var(--color-purple-500,var(--foreground)); }
[${MARK}-trigger="diff"] { min-width:0; }
[${MARK}-all] { position:absolute; right:0; width:32px; padding:0; }
[${MARK}-bar][${MARK}-jump] { padding-right:80px; }
[${MARK}-bar][${MARK}-jump] [${MARK}-all] { right:40px; }
[${MARK}-orb] { display:grid; grid-template-columns:repeat(2,4px); gap:3px; }
[${MARK}-orb] i { width:4px; height:4px; border-radius:50%; background:currentColor; }
[${MARK}-badge] { position:absolute; right:-3px; top:-4px; font-size:9px; min-width:14px; line-height:14px; padding:0 3px; border-radius:999px; background:var(--surface-raised-solid); color:var(--subtle-foreground); box-shadow:0 0 0 2px var(--background); }
[${MARK}-trigger="children"] { padding:0 7px 0 0; min-height:34px; border-radius:0; background:transparent !important; backdrop-filter:none; box-shadow:none !important; }
[${MARK}-trigger="children"]:hover { transform:none; }
[${MARK}-avatars] { display:flex; align-items:center; }
[${MARK}-avatar] { position:relative; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; width:30px; height:30px; margin-left:-8px; border-radius:50%; background:var(--surface-raised-solid); box-shadow:0 0 0 2px var(--background),inset 0 1px 2px #fff2; font-size:10px; font-weight:600; line-height:1; transition:transform 400ms cubic-bezier(.2,.9,.22,1.25); }
[${MARK}-avatar]:first-child { margin-left:0; }
[${MARK}-avatar]:nth-child(3n+1) { background:color-mix(in oklch,var(--background) 76%,oklch(.75 .13 250) 24%); }
[${MARK}-avatar]:nth-child(3n+2) { background:color-mix(in oklch,var(--background) 78%,oklch(.75 .1 155) 22%); }
[${MARK}-avatar]:nth-child(3n) { background:color-mix(in oklch,var(--background) 78%,oklch(.78 .09 60) 22%); }
[${MARK}-trigger="children"]:hover [${MARK}-avatar] { transform:translateY(-2px); margin-right:1px; }
[${MARK}-avatar-more] { font-size:10px; padding-left:7px; color:var(--subtle-foreground); }
[${MARK}-avatar-dot] { position:absolute; right:0; bottom:0; width:6px; height:6px; border-radius:50%; background:var(--success-text,#80b995); box-shadow:0 0 0 2px var(--background); }
[${MARK}-avatar][data-state="run"] [${MARK}-avatar-dot] { animation:bb-info-breathe 2.6s ease-in-out infinite; }
[${MARK}-avatar][data-state="wait"] [${MARK}-avatar-dot] { background:var(--warning-text,#cfb577); }
[${MARK}-avatar][data-state="error"] [${MARK}-avatar-dot] { background:var(--destructive-text,#d99090); }
[${MARK}-avatar][data-state="done"] [${MARK}-avatar-dot] { display:flex; align-items:center; justify-content:center; width:11px; height:11px; right:-2px; bottom:-2px; }
[${MARK}-avatar-dot] svg { width:8px; height:8px; color:var(--background); }
[${MARK}-avatar][data-new] { animation:bb-info-bubble 700ms cubic-bezier(.22,1,.36,1); }
[${MARK}-menu], ${DETAIL} { position:absolute !important; display:block !important; left:0 !important; right:0 !important; top:auto !important; bottom:40px !important; transform:none !important; width:100% !important; max-width:none !important; min-height:0 !important; height:auto !important; max-height:min(50dvh,26rem) !important; overflow:auto !important; margin:0 !important; order:0 !important; border:1px solid var(--border-seam) !important; border-radius:16px !important; background:var(--surface-raised-solid) !important; color:var(--foreground); box-shadow:0 14px 40px -16px color-mix(in oklab,var(--foreground) 25%,transparent) !important; z-index:52; animation:bb-info-enter 320ms cubic-bezier(.22,1,.36,1); }
[${MARK}-menu] { padding:12px; }
[${MARK}-menu] header { display:flex; align-items:center; justify-content:space-between; font-size:12px; padding-bottom:8px; }
[${MARK}-menu] p { font-size:11px; color:var(--subtle-foreground); margin:0 0 8px; }
[${MARK}-menu] > div { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr)); gap:6px; }
[${MARK}-choice] { display:flex; min-width:0; align-items:center; gap:8px; border:0; border-radius:10px; background:var(--surface-recessed); padding:9px 10px; text-align:left; font-size:12px !important; }
[${MARK}-choice] span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
[${MARK}-choice] svg { width:16px; height:16px; flex-shrink:0; }
[${MARK}-choice][${MARK}-unavailable] { color:var(--subtle-foreground); }
[${MARK}-choice] small { margin-left:auto; flex-shrink:0; font-size:10px; color:var(--subtle-foreground); }
[${MARK}-diff] p { white-space:pre-wrap; }
[${MARK}-action="diff"] { border:0; border-radius:10px; padding:9px 12px; background:var(--surface-recessed); font-size:12px !important; }
${DETAIL} [data-queued-messages-scroll-frame] { position:static !important; width:100% !important; height:auto !important; max-height:22rem; }
${DETAIL} header[data-queued-messages-mode] { position:relative !important; width:100% !important; max-width:none !important; height:32px !important; padding:0 12px !important; justify-content:space-between; background:transparent !important; }
${DETAIL} header[data-queued-messages-mode]::before { content:none; }
${DETAIL} header[data-queued-messages-mode] button[aria-expanded], ${DETAIL} header[data-queued-messages-mode] button svg { color:var(--foreground) !important; }
${DETAIL} header[data-queued-messages-mode] > div:first-child, ${DETAIL} header[data-queued-messages-mode] > button { display:flex !important; }
${STACK}[${MARK}-request] [${UNIT}][${UNIT}], [${MARK}-request] [${MARK}-menu] { display:none !important; }
[data-promptbox-shell]:has(> [${MARK}-request]) [data-follow-up-composer-anchor] { display:none !important; }
[data-scroll-footer]:has([${MARK}-request]) button[aria-label="Scroll to latest event"] { display:none !important; }
[${MARK}-stack] [${MARK}-supplements] { display:contents; }
[${MARK}-kind] { font-size:12px; padding:12px; }
[${MARK}-kind] h3 { margin:0 0 8px; font-size:12px; font-weight:600; }
[${MARK}-kind] p { white-space:pre-wrap; margin:6px 0; }
[${MARK}-kind] button { border-radius:8px; padding:5px 8px; background:var(--surface-recessed); }
[${MARK}-kind="children"] { padding:12px 14px 14px; border-radius:18px !important; }
[${MARK}-kind="children"] h3 { display:flex; align-items:center; gap:7px; min-height:28px; margin:0 0 8px; }
[${MARK}-kind="children"] h3 [data-icon-root] { width:14px; height:14px; }
[${MARK}-kind="children"] [${MARK}-dismiss] { margin-left:auto; width:24px; height:24px; padding:0; border-radius:50%; border:0; background:transparent; color:var(--subtle-foreground); font-size:16px; }
[${MARK}-child-row] { display:flex; align-items:center; gap:8px; padding:7px 0; min-width:0; }
[${MARK}-child-row] + [${MARK}-child-row] { border-top:1px solid var(--border-hairline,var(--border)); }
[${MARK}-child-row] [${MARK}-avatar] { width:27px; height:27px; margin-left:0; }
[${MARK}-child-main] { flex:1; min-width:0; }
[${MARK}-child-main] button { padding:0; border:0; border-radius:0; background:transparent; max-width:100%; text-align:left; font-size:12px; }
[${MARK}-child-meta], [${MARK}-child-status] { font-size:10px; color:var(--subtle-foreground); }
[${MARK}-child-status] { white-space:nowrap; }
${DETAIL}.agentation-staging-shell { display:grid !important; grid-template-areas:"heading" "body" "actions"; padding:12px 14px 14px !important; border:0 !important; border-radius:18px !important; gap:0; }
${DETAIL}.agentation-staging-shell > div:first-child { display:contents !important; }
${DETAIL}.agentation-staging-shell > div:first-child > div:first-child { grid-area:heading; display:flex; align-items:center; gap:7px; width:100%; min-height:28px; padding-bottom:8px; }
${DETAIL}.agentation-staging-shell > div:first-child > div:first-child p { flex:1; margin:0; font-size:12px; font-weight:600; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] { width:24px; height:24px; margin-left:auto; background:transparent; border-radius:50%; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] svg,
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] [data-icon-root] { display:none; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"]::after { content:"×"; font-size:16px; color:var(--subtle-foreground); }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child { grid-area:actions; display:flex; flex-wrap:wrap; justify-content:flex-start; gap:6px; margin-top:8px; }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child > button { font-size:11px; min-height:28px; border:1px solid var(--border); border-radius:7px; padding:5px 9px; background:var(--surface-recessed); color:var(--foreground); }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child > button:first-child { order:2; }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child > button:last-child { order:1; }
${DETAIL}.agentation-staging-shell > .grid { grid-area:body; width:100%; }
${DETAIL}.agentation-staging-shell > .grid > div > div { padding:0 !important; }
${DETAIL}.agentation-staging-shell ul { max-height:none !important; margin:0 !important; padding:0 !important; border:0 !important; overflow:visible !important; }
${DETAIL}.agentation-staging-shell li { display:flex !important; align-items:center; gap:8px; min-width:0; padding:7px 0; margin:0 !important; }
${DETAIL}.agentation-staging-shell li + li { border-top:1px solid var(--border-hairline,var(--border)); }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] { display:grid !important; grid-template-areas:"comment comment" "location target"; grid-template-columns:auto minmax(0,1fr); gap:0 6px; flex:1; min-width:0; }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] > span { max-width:none !important; font:inherit; }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] > span:nth-child(1) { grid-area:location; font-size:10px; color:var(--subtle-foreground); }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] > span:nth-child(2) { grid-area:target; font-size:10px; color:var(--subtle-foreground); }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] > span:nth-child(3) { display:none; }
${DETAIL}.agentation-staging-shell li > span[aria-hidden="true"] > span:nth-child(4) { grid-area:comment; font-size:12px; font-weight:400; white-space:normal; overflow-wrap:anywhere; }
${DETAIL}.agentation-staging-shell li::before { content:""; flex-shrink:0; width:14px; height:14px; background:var(--subtle-foreground); mask:var(--bb-chat-ui-feedback-icon) center/contain no-repeat; }
@keyframes bb-info-enter { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }
@keyframes bb-info-bubble { 0% { transform:translateY(12px) scale(.25); } 45% { transform:translateY(-4px) scale(1.18); } 65% { transform:scale(.94); } 82% { transform:scale(1.03); } 100% { transform:none; } }
@keyframes bb-info-breathe { 50% { opacity:.4; } }
@media (prefers-reduced-motion:reduce) { [${MARK}-bar] *, [${MARK}-stack] [${UNIT}][${OPEN}] { animation:none !important; transition:none !important; } }
`;

interface InfoItem { key: InfoKind; node: HTMLElement; trigger: HTMLElement | null; label: string; }
function kindsOf(node: HTMLElement): InfoKind[] {
  const explicit = node.getAttribute(`${MARK}-kind`) as InfoKind | null;
  if (explicit && infoKinds.some(kind => kind.key === explicit)) return [explicit];
  if (node.matches(".agentation-staging-shell")) return ["annotations"];
  const label = node.getAttribute("aria-label") ?? "";
  if (label === "Child threads") return ["children"];
  if (label === "Thread context before sending") {
    const kinds: InfoKind[] = [];
    if (node.querySelector('#thread-prompt-banner-git-toggle')) kinds.push("diff");
    if (node.querySelector('[aria-label^="Pull request "]')) kinds.push("pullRequest");
    if (node.querySelector('#thread-prompt-banner-parent-thread-toggle, a[href*="/threads/"]')) kinds.push("parent");
    return kinds.length ? kinds : ["other"];
  }
  if (label === "Goal") return ["goal"];
  if (label === "Prompt mode") return ["plan"];
  if (label.startsWith("To-do list")) return ["todos"];
  if (label === "Queued messages") return ["queue"];
  if (label === "Model fallback") return ["fallback"];
  if (/background/i.test(label)) return ["background"];
  if (/workflow/i.test(label) || node.querySelector('[aria-label^="Workflow:"]')) return ["workflow"];
  if (node.querySelector('#machine-status-toggle') || /machine/i.test(label)) return ["machine"];
  if (label === "Thread history" || /archiv|unavailable|environment.*(gone|removed)|read.only/i.test(label) || node.querySelector('#thread-prompt-banner-status-toggle')) return node.querySelector('#thread-prompt-banner-parent-thread-toggle') ? ["status", "parent"] : ["status"];
  return ["other"];
}
function nativeTrigger(node: HTMLElement, key: InfoKind): HTMLElement | null {
  const selector = key === "diff" ? '#thread-prompt-banner-git-toggle'
    : key === "children" ? '#thread-prompt-banner-child-threads-toggle'
    : key === "parent" ? '#thread-prompt-banner-parent-thread-toggle'
    : key === "pullRequest" ? '[aria-label^="Pull request "]'
    : '[aria-expanded][aria-controls], button[aria-expanded]';
  return node.querySelector(selector);
}

export function injectComposerInfo(document: Document): () => void {
  const view = document.defaultView;
  if (!view) return () => {};
  const style = document.createElement("style");
  style.id = "bb-chat-ui-composer-info";
  style.textContent = composerInfoCss;
  document.head.append(style);
  const states = new Map<HTMLElement, ReturnType<typeof mount>>();
  let disposed = false;
  let frame = 0;
  let serial = 0;

  function mount(stack: HTMLElement) {
    stack.setAttribute(`${MARK}-stack`, "");
    const bar = document.createElement("div");
    bar.setAttribute(`${MARK}-bar`, "");
    const pills = document.createElement("div");
    pills.style.display = "contents";
    const orb = document.createElement("button");
    orb.type = "button";
    orb.setAttribute(`${MARK}-all`, "");
    orb.setAttribute("aria-expanded", "false");
    const symbol = document.createElement("span");
    symbol.setAttribute(`${MARK}-orb`, "");
    symbol.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) symbol.append(document.createElement("i"));
    const badge = document.createElement("span");
    badge.setAttribute(`${MARK}-badge`, "");
    badge.setAttribute("aria-hidden", "true");
    orb.append(symbol, badge);
    bar.append(pills, orb);
    stack.append(bar);
    let items: InfoItem[] = [];
    let listed = listedInfo();
    const owned = new Set<HTMLElement>();
    const wrappers = new Set<HTMLElement>();
    const buttons = new Map<InfoKind, HTMLButtonElement>();
    let active: InfoKind | "all" | null = null;
    let activeNode: HTMLElement | null = null;
    let menu: HTMLElement | null = null;
    let lastTrigger: HTMLElement | null = null;
    let signature = "";
    let childStates = new Map<string, ChildState>();
    let diffSupplement: HTMLElement | null = null;
    const editing = () => stack.querySelector('[data-queued-message-inline-editor]') !== null;
    const reduced = () => view!.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pulse = () => {
      if (reduced()) return;
      orb.animate?.([{ transform:"scale(1)" }, { transform:"scale(1.15)" }, { transform:"scale(.96)" }, { transform:"scale(1)" }], { duration:500, easing:"cubic-bezier(.22,1,.36,1)" });
    };
    const mark = (node: HTMLElement, attr: string, collection: Set<HTMLElement>) => {
      collection.add(node);
      if (!node.hasAttribute(attr)) node.setAttribute(attr, "");
    };
    const labelOf = (key: InfoKind) => infoKinds.find(kind => kind.key === key)!.label;
    const annotationCount = (item: InfoItem) => {
      const list = item.node.querySelector("ul");
      return list ? String(list.children.length) : item.node.querySelector(".tabular-nums")?.textContent?.trim() ?? "!";
    };
    const catalog = () => infoKinds.filter(kind => listed.includes(kind.key)).flatMap<InfoItem | { key:InfoKind; label:string }>(kind => {
      const available = items.filter(item => item.key === kind.key);
      return available.length ? available : [{ key:kind.key, label:kind.label }];
    });
    const describe = (item: InfoItem) => {
      if (item.key === "annotations") return `${annotationCount(item)} staged`;
      const text = item.key === "diff" ? item.trigger?.textContent : item.trigger?.getAttribute("aria-label") ?? item.trigger?.textContent;
      return text?.trim().replace(/\s+/g, " ").slice(0, 200) || item.node.getAttribute("aria-label") || item.label;
    };
    const describeDiff = (item: InfoItem) => {
      const branch = item.trigger?.querySelector<HTMLElement>('[data-bb-chat-ui-branch]')?.title
        || (item.node === diffSupplement && item.trigger?.title !== "Code Diff" ? item.trigger?.title : null);
      return `${describe(item)}${branch ? `\nBranch · ${branch}` : ""}`;
    };
    const decorate = (button: HTMLElement, item: InfoItem, summary: boolean) => {
      const text = document.createElement("span");
      text.textContent = summary && item.key === "diff" ? describe(item) : item.label;
      if (summary && item.key === "todos") text.textContent = item.trigger?.textContent?.trim().replace(/\s+/g, " ").slice(0, 30) || item.label;
      if (summary && item.key === "queue") text.textContent = item.node.querySelector('span.tabular-nums')?.textContent?.trim() || item.label;
      if (summary && item.key === "annotations") text.textContent = annotationCount(item);
      const icon = (item.key === "annotations" ? stack.querySelector(`[${MARK}-icon="annotations"] svg, [${MARK}-icon="annotations"] [data-icon-root]`) : null)
        ?? item.trigger?.querySelector("svg, [data-icon-root]") ?? item.node.querySelector("svg, [data-icon-root]");
      button.replaceChildren();
      if (summary && item.key === "children") {
        const avatars = document.createElement("span");
        avatars.setAttribute(`${MARK}-avatars`, "");
        let children: ChildSummary[] = [];
        try { children = JSON.parse(stack.querySelector(`[${MARK}-children]`)?.getAttribute(`${MARK}-children`) ?? "[]"); } catch { /* Host card remains usable. */ }
        if (!children.length) children = [{ id:"native", title:describe(item).replace(/^.*?:\s*/, ""), state:describe(item).startsWith("Active child") ? "run" : "wait" }];
        const stateOf = (child: ChildSummary): ChildState => child.state ?? (child.running ? "run" : "done");
        const nextStates = new Map(children.map(child => [child.id, stateOf(child)]));
        for (const [index, child] of children.slice(-3).entries()) {
          const avatar = document.createElement("span");
          avatar.setAttribute(`${MARK}-avatar`, "");
          avatar.title = child.title;
          avatar.textContent = childInitial(child.title);
          avatar.setAttribute("data-child", child.id);
          avatar.setAttribute("data-state", stateOf(child));
          avatar.style.zIndex = String(4 - index);
          const dot = document.createElement("span"); dot.setAttribute(`${MARK}-avatar-dot`, "");
          if (stateOf(child) === "done") {
            const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            check.setAttribute("viewBox", "0 0 24 24"); check.setAttribute("fill", "none"); check.setAttribute("stroke", "currentColor"); check.setAttribute("stroke-width", "1.5"); check.setAttribute("stroke-linecap", "round"); check.setAttribute("stroke-linejoin", "round");
            const path = document.createElementNS(check.namespaceURI, "path"); path.setAttribute("d", "M5 14L8.5 17.5L19 6.5"); check.append(path); dot.append(check);
          }
          avatar.append(dot);
          if (!childStates.has(child.id)) avatar.setAttribute("data-new", "");
          else if (childStates.get(child.id) !== "done" && stateOf(child) === "done" && !reduced()) avatar.animate?.([{ transform:"scale(1)" }, { transform:"scale(1.1)" }, { transform:"scale(1)" }], { duration:450, easing:"cubic-bezier(.22,1,.36,1)" });
          avatars.append(avatar);
        }
        text.textContent = children.length > 3 ? `+${children.length - 3}` : String(children.length);
        text.setAttribute(`${MARK}-avatar-more`, "");
        button.append(avatars, text);
        childStates = nextStates;
      } else {
        if (icon) {
          const clone = icon.cloneNode(true) as Element;
          clone.removeAttribute("id");
          clone.setAttribute("aria-hidden", "true");
          button.append(clone);
        }
        if (summary && item.key === "diff") {
          const parts = text.textContent?.match(/^(\+\d+)\s*([-−]\d+)\s*·?\s*(.*)$/);
          if (parts) {
            text.replaceChildren();
            const added = document.createElement("span"); added.className = "text-diff-added"; added.textContent = parts[1];
            const removed = document.createElement("span"); removed.className = "text-diff-removed"; removed.textContent = parts[2];
            text.append(added, " ", removed, ` · ${parts[3]}`);
          }
        }
        button.append(text);
        if (summary && item.key === "diff") {
          const branch = item.trigger?.querySelector('[data-bb-chat-ui-branch]');
          if (branch) button.append(branch.cloneNode(true));
        }
      }
      button.title = `${item.label} · ${describe(item)}${item.key === "diff" && item.trigger?.title ? ` · ${item.trigger.title}` : ""}`;
      button.setAttribute("aria-label", button.title);
    };
    const close = (restoreFocus = false, force = false) => {
      if (!force && editing()) return false;
      const item = items.find(item => item.node === activeNode && item.key === active);
      activeNode?.removeAttribute(OPEN);
      if (!editing() && active !== "diff" && item?.trigger?.getAttribute("aria-expanded") === "true") item.trigger.click();
      menu?.remove();
      menu = null;
      active = null;
      activeNode = null;
      orb.setAttribute("aria-expanded", "false");
      for (const button of buttons.values()) button.setAttribute("aria-expanded", "false");
      if (restoreFocus) (lastTrigger?.isConnected ? lastTrigger : orb).focus();
      return true;
    };
    const open = (key: InfoKind | "all", trigger: HTMLElement, selected?: InfoItem) => {
      if (editing() || stack.hasAttribute(`${MARK}-request`)) return;
      if (key !== "all" && !listed.includes(key)) return;
      if (active === key && (!selected || selected.node === activeNode)) { close(true); return; }
      close();
      lastTrigger = trigger;
      if (key === "all") {
        active = "all";
        menu = document.createElement("section");
        menu.id = `bb-composer-info-menu-${++serial}`;
        menu.setAttribute(`${MARK}-menu`, "");
        menu.setAttribute("aria-label", "전체 정보");
        const header = document.createElement("header");
        header.textContent = "전체 정보";
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.textContent = "×";
        dismiss.setAttribute("aria-label", "전체 정보 닫기");
        dismiss.addEventListener("click", () => close(true));
        header.append(dismiss);
        const caption = document.createElement("p");
        caption.textContent = "하나를 선택해 펼치기 · 상단 표시는 Chat UI 설정에서 선택";
        const grid = document.createElement("div");
        for (const item of catalog()) {
          const choice = document.createElement("button");
          choice.type = "button";
          choice.setAttribute(`${MARK}-choice`, item.key);
          if ("node" in item) {
            decorate(choice, item, false);
            if (items.filter(other => other.key === item.key).length > 1) choice.querySelector("span")!.textContent = `${item.label} · ${describe(item)}`;
          } else {
            choice.setAttribute(`${MARK}-unavailable`, "");
            const label = document.createElement("span"); label.textContent = item.label;
            const state = document.createElement("small"); state.textContent = "현재 없음";
            choice.append(label, state);
          }
          choice.addEventListener("click", () => {
            open(item.key, orb, "node" in item ? item : undefined);
            (menu ?? activeNode)?.querySelector<HTMLElement>('button, a, input, [tabindex="0"]')?.focus();
          });
          grid.append(choice);
        }
        menu.append(header, caption, grid);
        bar.append(menu);
        orb.setAttribute("aria-controls", menu.id);
        orb.setAttribute("aria-expanded", "true");
        return;
      }
      const item = selected ?? items.find(item => item.key === key);
      if (!item || key === "diff") {
        active = key;
        activeNode = item?.node ?? null;
        menu = document.createElement("section");
        menu.id = `bb-composer-info-detail-${++serial}`;
        menu.setAttribute(`${MARK}-menu`, "");
        menu.setAttribute(item ? `${MARK}-diff` : `${MARK}-empty`, key);
        menu.setAttribute("aria-label", labelOf(key));
        const header = document.createElement("header");
        header.textContent = labelOf(key);
        const dismiss = document.createElement("button");
        dismiss.type = "button"; dismiss.textContent = "×";
        dismiss.setAttribute("aria-label", `${labelOf(key)} 닫기`);
        dismiss.addEventListener("click", () => close(true));
        header.append(dismiss);
        const caption = document.createElement("p"); caption.textContent = item ? describeDiff(item) : "현재 정보 없음";
        menu.append(header, caption);
        if (item) {
          const action = document.createElement("button");
          action.type = "button";
          action.setAttribute(`${MARK}-action`, "diff");
          action.textContent = "Diff 패널 열기";
          action.addEventListener("click", () => {
            const current = items.find(item => item.key === "diff");
            close();
            if (current?.trigger?.id === "thread-prompt-banner-git-toggle") current.trigger.click();
            else openChangesPanel(document, stack);
          });
          menu.append(action);
          buttons.get(key)?.setAttribute("aria-expanded", "true");
        }
        bar.append(menu);
        orb.setAttribute("aria-controls", menu.id);
        orb.setAttribute("aria-expanded", "true");
        return;
      }
      active = key;
      activeNode = item.node;
      item.node.setAttribute(OPEN, "");
      if (item.trigger?.getAttribute("aria-expanded") === "false") item.trigger.click();
      buttons.get(key)?.setAttribute("aria-expanded", "true");
    };
    orb.addEventListener("click", () => open("all", orb));
    const fit = () => {
      const widths = [...buttons].map(([key, button]) => {
        button.hidden = false;
        return { key, width:button.getBoundingClientRect().width };
      });
      const width = stack.getBoundingClientRect().width;
      const visible = new Set(fitComposerInfo(widths, width > 0 ? width - (bar.hasAttribute(`${MARK}-jump`) ? 40 : 0) : Number.POSITIVE_INFINITY));
      for (const [key, button] of buttons) button.hidden = !visible.has(key);
    };
    const resize = typeof view!.ResizeObserver === "function" ? new view!.ResizeObserver(fit) : null;
    resize?.observe(stack);
    const sync = () => {
      const source = stack.querySelector(`[${SOURCE}]`);
      if (!source) return;
      const feedback = source.querySelector(`[${MARK}-icon="annotations"] svg`);
      if (feedback) {
        const mask = `url("data:image/svg+xml,${encodeURIComponent(new view!.XMLSerializer().serializeToString(feedback))}")`;
        if (stack.style.getPropertyValue("--bb-chat-ui-feedback-icon") !== mask) stack.style.setProperty("--bb-chat-ui-feedback-icon", mask);
      }
      bar.toggleAttribute(`${MARK}-jump`, stack.closest('[data-scroll-footer]')?.querySelector('button[aria-label="Scroll to latest event"]') !== null && !!stack.closest('[data-scroll-footer]'));
      const found: InfoItem[] = [];
      const currentOwned = new Set<HTMLElement>();
      const currentWrappers = new Set<HTMLElement>();
      const walk = (node: HTMLElement) => {
        if (node === bar || node.hidden || node.matches(REQUEST) || node.matches("section") && node.querySelector(REQUEST)) return;
        if (node.matches(NATIVE)) {
          mark(node, UNIT, currentOwned);
          for (const key of kindsOf(node)) found.push({ key, node, trigger:nativeTrigger(node, key), label:labelOf(key) });
        } else if (node.querySelector(`${NATIVE}, ${REQUEST}, [${SOURCE}], [${MARK}-supplements]`)) {
          mark(node, WRAP, currentWrappers);
          for (const child of Array.from(node.children)) walk(child as HTMLElement);
        } else if (node.textContent?.trim() || node.querySelector("img, button")) {
          mark(node, UNIT, currentOwned);
          found.push({ key:"other", node, trigger:nativeTrigger(node, "other"), label:node.getAttribute("aria-label") || "플러그인 정보" });
        }
      };
      for (const child of Array.from(stack.children)) walk(child as HTMLElement);
      for (const node of owned) if (!currentOwned.has(node)) { node.removeAttribute(UNIT); node.removeAttribute(OPEN); }
      for (const node of wrappers) if (!currentWrappers.has(node)) node.removeAttribute(WRAP);
      owned.clear(); currentOwned.forEach(node => owned.add(node));
      wrappers.clear(); currentWrappers.forEach(node => wrappers.add(node));
      // Child rows use the SDK design; other families keep their native editable controls.
      const hasChildRows = found.some(item => item.key === "children" && item.node.hasAttribute(`${MARK}-kind`));
      const native = found.filter(item => !item.node.hasAttribute(`${MARK}-kind`) && !(hasChildRows && item.key === "children"));
      items = [...native, ...found.filter(item => item.node.hasAttribute(`${MARK}-kind`) && !native.some(other => other.key === item.key))];
      if (!items.some(item => item.key === "diff")) {
        try {
          const summary = JSON.parse(stack.querySelector(`[${HEAD_DIFF_MARK}]`)?.getAttribute(HEAD_DIFF_MARK) || "null");
          if (summary && Number.isFinite(summary.files) && Number.isFinite(summary.insertions) && Number.isFinite(summary.deletions)) {
            if (!diffSupplement) {
              diffSupplement = document.createElement("section");
              diffSupplement.setAttribute(UNIT, "");
              const button = document.createElement("button");
              button.type = "button";
              diffSupplement.append(button);
              bar.append(diffSupplement);
            }
            const button = diffSupplement.querySelector("button")!;
            const text = `+${summary.insertions} −${summary.deletions} · ${summary.files} files`;
            if (button.textContent !== text) button.textContent = text;
            button.title = summary.branch ?? "Code Diff";
            items.unshift({ key:"diff", node:diffSupplement, trigger:button, label:"Code Diff" });
          }
        } catch { /* A disconnected environment has no invented Diff tally. */ }
      }
      const request = stack.querySelector(REQUEST) !== null;
      if (request !== stack.hasAttribute(`${MARK}-request`)) stack.toggleAttribute(`${MARK}-request`, request);
      if (request || activeNode && !items.some(item => item.node === activeNode)) close(false, true);
      let settings = {};
      try { settings = JSON.parse(source.getAttribute(SOURCE) || "{}"); } catch { /* Defaults work while settings load. */ }
      listed = listedInfo(settings);
      if (active && active !== "all" && !listed.includes(active)) close();
      if (!listed.length) close();
      bar.hidden = request || !listed.length && !editing();
      const exposed = exposedInfo(settings);
      if (active === "annotations" && items.find(item => item.node === activeNode && item.key === active)?.trigger?.getAttribute("aria-expanded") === "false") close(true);
      const next = JSON.stringify([settings, items.map(item => [item.key, describe(item)]), stack.querySelector(`[${MARK}-children]`)?.getAttribute(`${MARK}-children`)]);
      if (signature !== next) {
        if (signature) pulse();
        signature = next;
        for (const [key, button] of buttons) if (!exposed.includes(key) || !items.some(item => item.key === key)) { button.remove(); buttons.delete(key); }
        for (const key of exposed) {
          const item = items.find(item => item.key === key);
          if (!item) continue;
          let button = buttons.get(key);
          if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.setAttribute(`${MARK}-trigger`, key);
            button.setAttribute("aria-label", item.label);
            button.addEventListener("click", () => open(key, button!));
            buttons.set(key, button);
          }
          button.setAttribute("aria-expanded", String(active === key));
          decorate(button, item, true);
          pills.append(button);
        }
        if (active === "all") { close(); open("all", orb); }
        else if (active === "diff" && menu?.hasAttribute(`${MARK}-diff`)) {
          const item = items.find(item => item.key === "diff");
          if (item) menu.querySelector("p")!.textContent = describeDiff(item);
        }
        else if (active && !activeNode && items.some(item => item.key === active)) {
          const key = active;
          close(); open(key, orb);
          (bar.querySelector<HTMLElement>(`[${MARK}-menu]`) ?? stack.querySelector<HTMLElement>(`[${OPEN}]`))?.querySelector<HTMLElement>('button, a, input, [tabindex="0"]')?.focus();
        }
        const count = catalog().length;
        badge.textContent = String(count);
        orb.setAttribute("aria-label", `전체 정보 ${count}개`);
        orb.title = `전체 정보 · ${count}개`;
      }
      fit();
    };
    return { sync, bar, close, editing, resize, cleanup() {
      close(false, true);
      resize?.disconnect();
      bar.remove();
      stack.removeAttribute(`${MARK}-stack`);
      stack.removeAttribute(`${MARK}-request`);
      stack.style.removeProperty("--bb-chat-ui-feedback-icon");
      for (const node of owned) { node.removeAttribute(UNIT); node.removeAttribute(OPEN); }
      for (const node of wrappers) node.removeAttribute(WRAP);
    } };
  }
  function sync() {
    frame = 0;
    if (disposed) return;
    for (const [stack, state] of states) if (!stack.isConnected || !stack.querySelector(`[${SOURCE}]`)) { state.cleanup(); states.delete(stack); }
    for (const stack of Array.from(document.querySelectorAll<HTMLElement>(STACK))) {
      if (!stack.querySelector(`[${SOURCE}]`)) continue;
      const state = states.get(stack) ?? mount(stack);
      states.set(stack, state);
      state.sync();
    }
  }
  const schedule = () => { if (!frame && !disposed) frame = view.requestAnimationFrame(sync); };
  const observer = new view.MutationObserver(schedule);
  observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:[SOURCE, HEAD_DIFF_MARK, `${MARK}-children`, "aria-label", "aria-expanded", "data-testid"] });
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    for (const [stack, state] of states) if (stack.contains(event.target as Node) || event.target === document) state.close(true);
  };
  const onDismiss = (event: MouseEvent) => {
    const button = (event.target as Element).closest?.(`[${MARK}-dismiss]`);
    if (button) for (const [stack, state] of states) if (stack.contains(button)) state.close(true);
  };
  const onOutside = (event: PointerEvent) => {
    const target = event.target as Element;
    if (target.closest?.('[data-radix-popper-content-wrapper], [role="menu"], [role="dialog"]')) return;
    for (const [stack, state] of states) if (!stack.contains(event.target as Node)) state.close();
  };
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onDismiss);
  document.addEventListener("pointerdown", onOutside);
  view.addEventListener("resize", schedule);
  sync();
  return () => {
    disposed = true;
    observer.disconnect();
    if (frame) view.cancelAnimationFrame(frame);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onDismiss);
    document.removeEventListener("pointerdown", onOutside);
    view.removeEventListener("resize", schedule);
    for (const state of states.values()) state.cleanup();
    states.clear();
    style.remove();
  };
}
