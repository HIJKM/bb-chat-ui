import { exposedInfo, infoKinds, listedInfo, type InfoKind } from "./composer-info-settings.ts";
import { HEAD_DIFF_MARK, openChangesPanel, type HeadDiffDetail } from "./workspace-diff-pill.ts";
import type { WorkspaceDiffSnapshot } from "./workspace-diff-data.ts";
import { commitIcon, fileStatusIcon } from "./composer-diff-icons.ts";
import { childInitial, type ChildState, type ChildSummary } from "./composer-child.ts";
import { DARK_GLASS_FACE, LIGHT_GLASS_FACE } from "./glass-surface.ts";

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
[${MARK}-stack] { --bb-chat-ui-info-face:${LIGHT_GLASS_FACE}; --bb-chat-ui-info-edge:color-mix(in oklab,var(--popover) 35%,transparent); --bb-chat-ui-info-shadow:color-mix(in oklab,var(--ink,var(--foreground)) 22%,transparent); position:relative; display:block !important; overflow:visible !important; }
.dark [${MARK}-stack] { --bb-chat-ui-info-face:${DARK_GLASS_FACE}; --bb-chat-ui-info-edge:color-mix(in oklab,var(--foreground) 8%,transparent); --bb-chat-ui-info-shadow:color-mix(in oklab,black 60%,transparent); }
[${MARK}-stack]::after { display:none !important; }
[${WRAP}] { display:contents !important; }
[${UNIT}] { display:none !important; }
[${MARK}-bar] { position:relative; display:flex; align-items:center; gap:8px; height:32px; min-width:0; padding-right:40px; }
[${MARK}-bar][hidden] { display:none; }
[${MARK}-bar] button { font:inherit; cursor:pointer; color:var(--foreground); }
[${MARK}-bar] button:focus-visible { outline:2px solid var(--ring); outline-offset:3px; }
[${MARK}-trigger], [${MARK}-all] { display:inline-flex; flex:none; align-items:center; justify-content:center; gap:6px; height:32px; max-width:100%; padding:4px 11px; border:0; border-radius:999px; font-size:12px !important; line-height:18px; white-space:nowrap; background:var(--bb-chat-ui-info-face); backdrop-filter:blur(14px) saturate(1.25); box-shadow:0 6px 18px -12px color-mix(in oklab,var(--foreground) 22%,transparent),inset 0 1px 3px color-mix(in oklab,var(--popover) 35%,transparent); transition:transform 260ms cubic-bezier(.2,.9,.22,1.25); }
[${MARK}-trigger], [${MARK}-all], [${MARK}-choice], [${MARK}-menu] button, ${DETAIL} button { background:var(--bb-chat-ui-info-face) !important; border:0 !important; backdrop-filter:blur(14px) saturate(1.25); -webkit-backdrop-filter:blur(14px) saturate(1.25); box-shadow:0 6px 18px -12px var(--bb-chat-ui-info-shadow),inset 0 1px 3px var(--bb-chat-ui-info-edge); }
[${MARK}-menu] header button { width:24px; height:24px; padding:0; border-radius:50%; }
[${MARK}-panel-source] { display:none !important; }
[${MARK}-panel-heading] { display:flex; align-items:center; gap:6px; }
[${MARK}-panel-action], [${MARK}-action="diff"] { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; width:24px; height:24px; padding:0 !important; border-radius:50% !important; color:var(--subtle-foreground); }
[${MARK}-panel-action] svg, [${MARK}-action="diff"] svg { width:14px; height:14px; }
[${MARK}-trigger]:hover, [${MARK}-all]:hover { transform:translateY(-1px); }
[${MARK}-trigger]:active, [${MARK}-all]:active { transform:scale(.95); }
[${MARK}-trigger][aria-expanded=true], [${MARK}-all][aria-expanded=true] { box-shadow:0 6px 18px -12px var(--bb-chat-ui-info-shadow),inset 0 1px 3px var(--bb-chat-ui-info-edge),inset 0 0 0 1px var(--border); }
[${MARK}-trigger][hidden] { display:none; }
[${MARK}-trigger][${MARK}-unavailable] { width:32px; min-height:32px; padding:0; border-radius:50%; color:var(--subtle-foreground); background:var(--bb-chat-ui-info-face) !important; backdrop-filter:blur(14px) saturate(1.25); -webkit-backdrop-filter:blur(14px) saturate(1.25); box-shadow:0 6px 18px -12px var(--bb-chat-ui-info-shadow),inset 0 1px 3px var(--bb-chat-ui-info-edge) !important; }
[${MARK}-trigger] > span:not([${MARK}-avatars]) { overflow:hidden; text-overflow:ellipsis; }
[${MARK}-trigger] svg { width:16px; height:16px; flex-shrink:0; }
[${MARK}-diff-summary], [${MARK}-commit-count] { display:inline-flex; align-items:center; min-width:0; }
[${MARK}-commit-count] { flex-shrink:0; gap:4px; white-space:nowrap; }
[${MARK}-commit-count] svg { width:14px; height:14px; }
[${MARK}-trigger] [data-bb-chat-ui-branch] { display:inline-flex; flex-shrink:0; color:var(--color-purple-500,#a855f7); }
[${MARK}-diff-content] [${MARK}-diff-branch] { display:flex; align-items:center; gap:6px; color:var(--color-purple-500,#a855f7); }
[${MARK}-diff-branch] code { min-width:0; overflow-wrap:anywhere; white-space:normal; }
[${MARK}-diff-branch] svg, [${MARK}-diff-branch] [data-icon-root] { width:16px; height:16px; flex-shrink:0; }
[${MARK}-trigger="diff"] { min-width:0; }
[${MARK}-all] { position:absolute; right:0; width:32px; padding:0; }
[${MARK}-bar][${MARK}-jump] { padding-right:80px; }
[${MARK}-bar][${MARK}-jump] [${MARK}-all] { right:40px; }
[${MARK}-orb] { display:grid; grid-template-columns:repeat(2,4px); gap:3px; }
[${MARK}-orb] i { width:4px; height:4px; border-radius:50%; background:currentColor; }
[${MARK}-badge] { position:absolute; right:-3px; top:-4px; font-size:9px; min-width:14px; line-height:14px; padding:0 3px; border-radius:999px; background:var(--bb-chat-ui-info-face); color:var(--subtle-foreground); box-shadow:0 0 0 2px var(--bb-chat-ui-glass-base,var(--background)); }
[${MARK}-avatar], [${MARK}-badge] { backdrop-filter:blur(14px) saturate(1.25); -webkit-backdrop-filter:blur(14px) saturate(1.25); }
[${MARK}-trigger="children"] { padding:0 7px 0 0; min-height:34px; border-radius:0; background:transparent !important; backdrop-filter:none; -webkit-backdrop-filter:none; box-shadow:none !important; }
[${MARK}-trigger="children"]:hover { transform:none; }
[${MARK}-avatars] { display:flex; align-items:center; isolation:isolate; }
[${MARK}-avatar], [${MARK}-avatar-more] { position:relative; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; width:30px; height:30px; margin-left:-8px; border-radius:50%; background:var(--bb-chat-ui-info-face); box-shadow:0 0 0 2px var(--bb-chat-ui-glass-base,var(--background)),inset 0 1px 3px var(--bb-chat-ui-info-edge); font-size:10px; font-weight:600; line-height:1; transition:transform 400ms cubic-bezier(.2,.9,.22,1.25); }
[${MARK}-avatar]:first-child { margin-left:0; }
[${MARK}-avatar]:nth-child(3n+1) { background:color-mix(in oklch,var(--bb-chat-ui-info-face) 76%,oklch(.75 .13 250) 24%); }
[${MARK}-avatar]:nth-child(3n+2) { background:color-mix(in oklch,var(--bb-chat-ui-info-face) 78%,oklch(.75 .1 155) 22%); }
[${MARK}-avatar]:nth-child(3n) { background:color-mix(in oklch,var(--bb-chat-ui-info-face) 78%,oklch(.78 .09 60) 22%); }
[${MARK}-trigger="children"]:hover [${MARK}-avatar], [${MARK}-trigger="children"]:hover [${MARK}-avatar-more] { transform:translateY(-2px); margin-right:1px; }
[${MARK}-avatar-more] { color:var(--subtle-foreground); backdrop-filter:blur(14px) saturate(1.25); -webkit-backdrop-filter:blur(14px) saturate(1.25); }
[${MARK}-avatar-dot] { position:absolute; right:0; bottom:0; width:6px; height:6px; border-radius:50%; background:var(--success-text,#80b995); box-shadow:0 0 0 2px var(--bb-chat-ui-glass-base,var(--background)); }
[${MARK}-avatar][data-state="run"] [${MARK}-avatar-dot] { animation:bb-info-breathe 2.6s ease-in-out infinite; }
[${MARK}-avatar][data-state="wait"] [${MARK}-avatar-dot] { background:var(--warning-text,#cfb577); }
[${MARK}-avatar][data-state="error"] [${MARK}-avatar-dot] { background:var(--destructive-text,#d99090); }
[${MARK}-avatar][data-state="done"] [${MARK}-avatar-dot] { display:flex; align-items:center; justify-content:center; width:11px; height:11px; right:-2px; bottom:-2px; }
[${MARK}-avatar-dot] svg { width:8px; height:8px; color:var(--bb-chat-ui-glass-base,var(--background)); }
[${MARK}-avatar][data-new] { animation:bb-info-bubble 460ms cubic-bezier(.36,0,.18,1) backwards; }
[${MARK}-menu], ${DETAIL} { position:absolute !important; display:block !important; left:0 !important; right:0 !important; top:auto !important; bottom:40px !important; transform:none !important; width:100% !important; max-width:none !important; min-height:0 !important; height:auto !important; max-height:min(50dvh,26rem) !important; overflow:auto !important; margin:0 !important; order:0 !important; border:0 !important; border-radius:18px !important; background:var(--bb-chat-ui-info-face) !important; backdrop-filter:blur(14px) saturate(1.25); -webkit-backdrop-filter:blur(14px) saturate(1.25); color:var(--foreground); box-shadow:0 12px 32px -14px var(--bb-chat-ui-info-shadow),inset 0 1px 3px var(--bb-chat-ui-info-edge) !important; z-index:52; animation:bb-info-enter 320ms cubic-bezier(.22,1,.36,1); }
[${MARK}-menu] { padding:12px; }
[${MARK}-menu], ${DETAIL} { overscroll-behavior:contain !important; }
[${MARK}-menu] header { display:flex; align-items:center; gap:6px; font-size:12px; padding-bottom:8px; }
[${MARK}-menu] header button:last-child { margin-left:auto; }
[${MARK}-menu] p { font-size:11px; color:var(--subtle-foreground); margin:0 0 8px; }
[${MARK}-menu] > div { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr)); gap:6px; }
[${MARK}-choice] { display:flex; min-width:0; align-items:center; gap:8px; border:0; border-radius:10px; background:var(--bb-chat-ui-info-face); padding:9px 10px; text-align:left; font-size:12px !important; }
[${MARK}-choice] span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
[${MARK}-choice] svg { width:16px; height:16px; flex-shrink:0; }
[${MARK}-choice][${MARK}-unavailable] { color:var(--subtle-foreground); }
[${MARK}-choice] small { margin-left:auto; flex-shrink:0; font-size:10px; color:var(--subtle-foreground); }
[${MARK}-scroll-hint] { position:absolute; pointer-events:none; z-index:53; backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }
[${MARK}-scroll-hint][hidden] { display:none; }
[${MARK}-scroll-hint="top"] { border-radius:18px 18px 0 0; background:linear-gradient(to bottom,var(--bb-chat-ui-info-face),transparent); mask-image:linear-gradient(to bottom,black,transparent); -webkit-mask-image:linear-gradient(to bottom,black,transparent); }
[${MARK}-scroll-hint="bottom"] { border-radius:0 0 18px 18px; background:linear-gradient(to top,var(--bb-chat-ui-info-face),transparent); mask-image:linear-gradient(to top,black,transparent); -webkit-mask-image:linear-gradient(to top,black,transparent); }
[${MARK}-diff] p { white-space:pre-wrap; }
[${MARK}-diff-content] { display:block !important; }
[${MARK}-diff-file], [${MARK}-diff-commit] { display:flex; align-items:center; gap:8px; padding:7px 0; font-size:12px; min-width:0; }
[${MARK}-diff-file] > svg { width:16px; height:16px; flex-shrink:0; }
[${MARK}-diff-commit] { padding:0; min-height:32px; }
[${MARK}-diff-graph] { position:relative; align-self:stretch; width:16px; flex-shrink:0; color:var(--subtle-foreground); }
[${MARK}-diff-graph]::before, [${MARK}-diff-graph]::after { content:""; position:absolute; left:7.5px; width:1px; background:color-mix(in oklab,var(--subtle-foreground) 40%,transparent); }
[${MARK}-diff-graph]::before { top:0; bottom:calc(50% + 4px); }
[${MARK}-diff-graph]::after { top:calc(50% + 4px); bottom:0; }
[${MARK}-diff-commit]:first-child [${MARK}-diff-graph]::before, [${MARK}-diff-commit]:last-child [${MARK}-diff-graph]::after { display:none; }
[${MARK}-diff-graph] svg { position:absolute; width:12px; height:12px; left:2px; top:calc(50% - 6px); fill:none; stroke:currentColor; stroke-width:1.5; }
[${MARK}-diff-file] code, [${MARK}-diff-commit] code { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:11px/1.6 var(--font-mono,monospace); }
[${MARK}-diff-file] > span { flex-shrink:0; font-size:11px; }
[${MARK}-diff-content] h4 { font-size:10px; font-weight:400; color:var(--subtle-foreground); margin:9px 0 3px; }
[${MARK}-diff-meta] { display:flex; flex-wrap:wrap; align-items:center; gap:4px; font-size:11px !important; color:var(--subtle-foreground); }
[${MARK}-diff-meta] code { font:inherit; overflow-wrap:anywhere; }
${DETAIL}[aria-label="Queued messages"] { --bb-chat-ui-queue-height:min(36dvh,16rem); display:flex !important; flex-direction:column; max-height:var(--bb-chat-ui-queue-height) !important; overflow:hidden !important; padding:8px !important; gap:0 !important; }
${DETAIL}[aria-label="Queued messages"] > * { min-height:0; }
${DETAIL} [data-queued-messages-scroll-frame] { position:static !important; display:grid !important; grid-template-rows:minmax(0,1fr); flex:0 1 auto !important; width:100% !important; height:auto !important; min-height:0 !important; max-height:var(--bb-chat-ui-queue-height); overflow:hidden !important; }
${DETAIL} [data-queued-messages-scroll] { height:auto !important; min-height:0 !important; max-height:var(--bb-chat-ui-queue-height); padding:4px; overflow-y:auto !important; overflow-x:hidden !important; overscroll-behavior:contain; }
${DETAIL} header[data-queued-messages-mode] { display:none !important; }
${DETAIL}[aria-label="Queued messages"] > div:has(> button[aria-label="Collapse queued messages"]) { display:none !important; }
${STACK}[${MARK}-request] [${UNIT}][${UNIT}], [${MARK}-request] [${MARK}-menu] { display:none !important; }
[data-promptbox-shell]:has(> [${MARK}-request]) [data-follow-up-composer-anchor] { display:none !important; }
[data-scroll-footer]:has([${MARK}-request]) button[aria-label="Scroll to latest event"] { display:none !important; }
[${MARK}-stack] [${MARK}-supplements] { display:contents; }
[${MARK}-kind] { font-size:12px; padding:12px; }
[${MARK}-kind] h3 { margin:0 0 8px; font-size:12px; font-weight:600; }
[${MARK}-kind] p { white-space:pre-wrap; margin:6px 0; }
[${MARK}-kind] button { border-radius:8px; padding:5px 8px; background:var(--bb-chat-ui-info-face); }
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
${DETAIL}.agentation-staging-shell > div:first-child > div:first-child > [data-icon="ChatFeedback"] { display:none !important; }
${DETAIL}.agentation-staging-shell > div:first-child > div:first-child::before { content:""; flex-shrink:0; width:14px; height:14px; background:currentColor; mask:var(--bb-chat-ui-feedback-icon) center/contain no-repeat; }
${DETAIL}.agentation-staging-shell > div:first-child > div:first-child p { flex:1; margin:0; font-size:12px; font-weight:600; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] { width:24px; height:24px; margin-left:auto; background:transparent; border-radius:50%; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] svg,
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"] [data-icon-root] { display:none; }
${DETAIL}.agentation-staging-shell button[aria-label="Collapse staged annotations"]::after { content:"×"; font-size:16px; color:var(--subtle-foreground); }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child { grid-area:actions; display:flex; flex-wrap:wrap; justify-content:flex-start; gap:6px; margin-top:8px; }
${DETAIL}.agentation-staging-shell > div:first-child > div:last-child > button { font-size:11px; min-height:28px; border:1px solid var(--border); border-radius:7px; padding:5px 9px; background:var(--bb-chat-ui-info-face); color:var(--foreground); }
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
@keyframes bb-info-bubble { 0% { transform:translateY(8px) scale(.85); } 60% { transform:translateY(-2px) scale(1.1); } 100% { transform:none; } }
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
    const appeared = new Set<InfoKind>();
    const entryAnimations = new Set<Animation>();
    let active: InfoKind | "all" | null = null;
    let activeNode: HTMLElement | null = null;
    let menu: HTMLElement | null = null;
    let lastTrigger: HTMLElement | null = null;
    let signature = "";
    let childStates = new Map<string, ChildState>();
    let diffSupplement: HTMLElement | null = null;
    const panelActions = new Map<HTMLElement, HTMLButtonElement>();
    const panelHeadings = new Set<HTMLElement>();
    const generatedHeadings = new Set<HTMLElement>();
    const panelAction = (label:string, run:() => void) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(`${MARK}-panel-action`, "");
      button.setAttribute("aria-label", label); button.title = label;
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor"); icon.setAttribute("stroke-width", "1.5");
      icon.setAttribute("stroke-linecap", "round"); icon.setAttribute("stroke-linejoin", "round");
      icon.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(icon.namespaceURI, "path");
      path.setAttribute("d", "M15 3h6v6m0-6L10 14M11 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-4");
      icon.append(path); button.append(icon);
      button.addEventListener("click", run);
      return button;
    };
    const syncPanelActions = () => {
      const current = new Set<HTMLElement>();
      for (const item of items) {
        if (item.key === "diff") continue;
        for (const source of Array.from(item.node.querySelectorAll<HTMLElement>(`button:not([${MARK}-panel-action]), a[href]`))) {
          const label = [source.getAttribute("aria-label"), source.getAttribute("title"), source.textContent]
            .map(text => text?.trim().replace(/\s+/g, " ") ?? "")
            .find(text => /^(?:(?:사이드|사이드바|측면|옆)\s*패널(?:에서)?\s*열기|플러그인\s*페이지(?:에서)?\s*열기|open (?:in )?(?:the )?(?:side ?panel|sidebar|plugin page))$/i.test(text));
          if (!label) continue;
          current.add(source);
          let heading = item.node.querySelector<HTMLElement>("h3, h4, header");
          if (!heading || heading.closest("button, a")) {
            heading = document.createElement("h3"); heading.textContent = item.label;
            item.node.prepend(heading); generatedHeadings.add(heading);
          }
          if (!heading.hasAttribute(`${MARK}-panel-heading`)) {
            heading.setAttribute(`${MARK}-panel-heading`, ""); panelHeadings.add(heading);
          }
          let action = panelActions.get(source);
          if (!action) {
            action = panelAction(label, () => { if (close()) source.click(); });
            panelActions.set(source, action); source.setAttribute(`${MARK}-panel-source`, "");
          }
          if (action.parentElement !== heading) heading.insertBefore(action, heading.querySelector(`[${MARK}-dismiss]`));
          if (action.title !== label) action.title = label;
          if (action.getAttribute("aria-label") !== label) action.setAttribute("aria-label", label);
          const disabled = source.hasAttribute("disabled") || source.getAttribute("aria-disabled") === "true";
          if (action.disabled !== disabled) action.disabled = disabled;
        }
      }
      for (const [source, action] of panelActions) if (!current.has(source)) {
        action.remove(); source.removeAttribute(`${MARK}-panel-source`); panelActions.delete(source);
      }
      for (const heading of panelHeadings) if (!heading.querySelector(`[${MARK}-panel-action]`)) {
        heading.removeAttribute(`${MARK}-panel-heading`); panelHeadings.delete(heading);
        if (generatedHeadings.delete(heading)) heading.remove();
      }
    };
    const scrollHints = (["top", "bottom"] as const).map(edge => {
      const hint = document.createElement("span");
      hint.setAttribute(`${MARK}-scroll-hint`, edge);
      hint.setAttribute("aria-hidden", "true");
      hint.hidden = true;
      bar.append(hint);
      return hint;
    });
    let edgeRoot: HTMLElement | null = null;
    let edgeScroller: HTMLElement | null = null;
    const updateScrollHints = () => {
      const root = menu ?? activeNode;
      const scrollable = (node: HTMLElement) => {
        if (node.matches('textarea, input, [contenteditable="true"]')) return false;
        const css = view!.getComputedStyle(node);
        return /auto|scroll|overlay/.test(css.overflowY || css.overflow) && node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1;
      };
      const scroller = root && (scrollable(root) ? root : Array.from(root.querySelectorAll<HTMLElement>("*")).filter(scrollable).sort((a, b) => b.clientHeight - a.clientHeight)[0]) || null;
      if (edgeRoot !== root || edgeScroller !== scroller) {
        edgeResize?.disconnect();
        edgeRoot = root;
        edgeScroller = scroller;
        if (root) {
          edgeResize?.observe(root);
          for (const child of Array.from(root.children)) edgeResize?.observe(child);
          if (scroller && scroller !== root) edgeResize?.observe(scroller);
        }
      }
      scrollHints.forEach(hint => { hint.hidden = true; });
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const anchor = bar.getBoundingClientRect();
      const height = Math.min(24, rect.height / 4);
      scrollHints.forEach((hint, index) => {
        hint.style.left = `${rect.left - anchor.left}px`;
        hint.style.width = `${rect.width}px`;
        hint.style.height = `${height}px`;
        hint.style.top = `${(index ? rect.bottom - height : rect.top) - anchor.top}px`;
        hint.hidden = index ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 : scroller.scrollTop <= 1;
      });
    };
    const edgeResize = typeof view!.ResizeObserver === "function" ? new view!.ResizeObserver(updateScrollHints) : null;
    stack.addEventListener("scroll", updateScrollHints, true);
    const scrollRoot = (event:Event) => {
      const root = menu ?? activeNode;
      return event.target && root?.contains(event.target as Node) ? root : null;
    };
    const canScroll = (event:Event, root:HTMLElement, dx:number, dy:number) => {
      for (let node = event.target as HTMLElement | null; node; node = node.parentElement) {
        const css = view!.getComputedStyle(node);
        const available = (overflow:string, delta:number, position:number, size:number, total:number) =>
          /auto|scroll|overlay/.test(overflow) && (delta < 0 ? position > 0 : delta > 0 && position + size < total - 1);
        if (available(css.overflowY || css.overflow, dy, node.scrollTop, node.clientHeight, node.scrollHeight)
          || available(css.overflowX || css.overflow, dx, node.scrollLeft, node.clientWidth, node.scrollWidth)) return true;
        if (node === root) break;
      }
      return false;
    };
    const onWheel = (event:WheelEvent) => {
      const root = scrollRoot(event);
      if (!root || event.ctrlKey) return;
      event.stopPropagation();
      if (!canScroll(event, root, event.deltaX, event.deltaY)) event.preventDefault();
    };
    let touch:{ x:number; y:number } | null = null;
    const onTouchStart = (event:TouchEvent) => {
      touch = null;
      if (!scrollRoot(event) || event.touches.length !== 1) return;
      touch = { x:event.touches[0].clientX, y:event.touches[0].clientY };
      event.stopPropagation();
    };
    const onTouchMove = (event:TouchEvent) => {
      const root = scrollRoot(event);
      if (!root || !touch || event.touches.length !== 1) { touch = null; return; }
      const next = { x:event.touches[0].clientX, y:event.touches[0].clientY };
      event.stopPropagation();
      if (!canScroll(event, root, touch.x - next.x, touch.y - next.y)) event.preventDefault();
      touch = next;
    };
    const endTouch = () => { touch = null; };
    stack.addEventListener("wheel", onWheel, { passive:false });
    stack.addEventListener("touchstart", onTouchStart, { passive:true });
    stack.addEventListener("touchmove", onTouchMove, { passive:false });
    stack.addEventListener("touchend", endTouch);
    stack.addEventListener("touchcancel", endTouch);
    const editing = () => stack.querySelector('[data-queued-message-inline-editor]') !== null;
    const reduced = () => view!.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pulse = () => {
      if (reduced()) return;
      orb.animate?.([
        { transform:"scale(1)", offset:0, easing:"cubic-bezier(.36,0,.18,1)" },
        { transform:"scale(1.1)", offset:.6, easing:"cubic-bezier(.36,0,.18,1)" },
        { transform:"scale(1)", offset:1 },
      ], { duration:360 });
    };
    const mark = (node: HTMLElement, attr: string, collection: Set<HTMLElement>) => {
      collection.add(node);
      if (!node.hasAttribute(attr)) node.setAttribute(attr, "");
    };
    const labelOf = (key: InfoKind) => infoKinds.find(kind => kind.key === key)!.label;
    const emptyIcon = (key: InfoKind) => stack.querySelector(`[${MARK}-icon="${key}"] svg, [${MARK}-icon="${key}"] [data-icon-root]`);
    const readDiff = ():Partial<WorkspaceDiffSnapshot> | null => {
      try { return JSON.parse(stack.querySelector(`[${HEAD_DIFF_MARK}]`)?.getAttribute(HEAD_DIFF_MARK) || "null"); }
      catch { return null; }
    };
    const commitCount = (count:number) => {
      const chip = document.createElement("span"); chip.setAttribute(`${MARK}-commit-count`, "");
      chip.setAttribute("role", "img"); chip.setAttribute("aria-label", `커밋 ${count}개`);
      chip.append(commitIcon(document), String(count));
      return chip;
    };
    const annotationCount = (item: InfoItem) => {
      const list = item.node.querySelector("ul");
      return list ? String(list.children.length) : item.node.querySelector(".tabular-nums")?.textContent?.trim() ?? "!";
    };
    const queueCount = (item: InfoItem) => {
      const current = item.node.querySelector('header [data-queued-messages-count]');
      const counters = current ? [current] : Array.from(item.node.querySelectorAll('header span.tabular-nums')).reverse();
      for (const counter of counters) {
        const copy = counter.cloneNode(true) as Element;
        copy.querySelectorAll('[aria-hidden="true"], [data-queued-messages-previous-count], .bb-count-roll-out').forEach(node => node.remove());
        const count = copy.textContent?.trim() ?? "";
        if (/^\d+$/.test(count)) return count;
      }
      return "";
    };
    const catalog = () => infoKinds.filter(kind => listed.includes(kind.key)).flatMap<InfoItem | { key:InfoKind; label:string }>(kind => {
      const available = items.filter(item => item.key === kind.key);
      return available.length ? available : [{ key:kind.key, label:kind.label }];
    });
    const describe = (item: InfoItem) => {
      if (item.key === "annotations") return `${annotationCount(item)} staged`;
      if (item.key === "queue" && queueCount(item)) return `${queueCount(item)} queued`;
      if (item.key === "diff" && readDiff()?.presentation) return readDiff()!.presentation!.label;
      const text = item.key === "diff" ? item.trigger?.textContent : item.trigger?.getAttribute("aria-label") ?? item.trigger?.textContent;
      return text?.trim().replace(/\s+/g, " ").slice(0, 200) || item.node.getAttribute("aria-label") || item.label;
    };
    const describeDiff = (item: InfoItem) => {
      const branch = item.trigger?.querySelector<HTMLElement>('[data-bb-chat-ui-branch]')?.title
        || (item.node === diffSupplement && item.trigger?.title !== "Code Diff" ? item.trigger?.title : null);
      return `${describe(item)}${branch ? `\nBranch · ${branch}` : ""}`;
    };
    const renderDiff = (container: HTMLElement, item: InfoItem) => {
      const summary = document.createElement("p"); summary.textContent = describeDiff(item);
      container.replaceChildren(summary);
      let detail: HeadDiffDetail | undefined;
      try { detail = JSON.parse(stack.querySelector(`[${HEAD_DIFF_MARK}]`)?.getAttribute(HEAD_DIFF_MARK) || "{}").detail; } catch { /* Summary remains usable while data loads. */ }
      if (!detail || !Array.isArray(detail.files) || !Array.isArray(detail.commits)) return;
      container.replaceChildren();
      const branch = document.createElement("p"); branch.setAttribute(`${MARK}-diff-branch`, "");
      const icon = emptyIcon("diff")?.cloneNode(true) as Element | undefined;
      icon?.setAttribute("aria-hidden", "true");
      const name = document.createElement("code"); name.textContent = detail.branch ?? "detached HEAD";
      if (icon) branch.append(icon);
      branch.append(name); container.append(branch);
      const snapshot = readDiff();
      const basis = document.createElement("p");
      basis.setAttribute(`${MARK}-diff-meta`, "head");
      basis.title = detail.basis;
      basis.setAttribute("aria-label", `${detail.basis} · +${snapshot?.insertions ?? 0} −${snapshot?.deletions ?? 0} · ${detail.files.length} files`);
      const added = document.createElement("span"); added.className = "text-diff-added"; added.textContent = `+${snapshot?.insertions ?? 0}`;
      const removed = document.createElement("span"); removed.className = "text-diff-removed"; removed.textContent = `−${snapshot?.deletions ?? 0}`;
      basis.append("HEAD · ", added, " ", removed, ` · ${detail.files.length} files`);
      container.append(basis);
      const files = document.createElement("div"); files.setAttribute(`${MARK}-diff-files`, "");
      if (detail.files.length) {
        const heading = document.createElement("h4"); heading.textContent = `변경 파일 · ${detail.files.length}`; files.append(heading);
      }
      for (const file of detail.files) {
        const row = document.createElement("div"); row.setAttribute(`${MARK}-diff-file`, "");
        const path = document.createElement("code"); path.textContent = file.path; path.title = file.path;
        const status = fileStatusIcon(document, file.status);
        const stats = document.createElement("span");
        if (file.insertions === null && file.deletions === null) stats.textContent = "통계 없음";
        else {
          const added = document.createElement("span"); added.className = "text-diff-added"; added.textContent = file.insertions === null ? "—" : `+${file.insertions}`;
          const removed = document.createElement("span"); removed.className = "text-diff-removed"; removed.textContent = file.deletions === null ? "—" : `−${file.deletions}`;
          stats.append(added, " ", removed);
        }
        row.append(status, path, stats); files.append(row);
      }
      container.append(files);
      if (detail.commitKind || detail.commits.length) {
        const label = document.createElement("h4");
        label.setAttribute(`${MARK}-diff-meta`, "commits");
        label.title = detail.commitKind
          ? `${detail.commitKind === "pr" ? "PR 후보" : "미푸시"} · ${detail.commitCount == null ? "확인 불가" : `${detail.commitCount} commits`} · ${detail.baseRef ?? "기준 없음"} 대비`
          : `브랜치 커밋 · ${detail.baseRef ?? "Merge base"} 대비`;
        label.setAttribute("aria-label", label.title);
        const comparison = document.createElement("code"); comparison.textContent = `${detail.baseRef ?? "?"} → HEAD`;
        const count = detail.commitCount == null ? document.createElement("span") : commitCount(detail.commitCount);
        if (detail.commitCount == null) {
          count.setAttribute(`${MARK}-commit-count`, "");
          count.setAttribute("role", "img"); count.setAttribute("aria-label", "커밋 수 확인 불가");
          count.append(commitIcon(document), "—");
        }
        label.append(comparison, " · ", count);
        container.append(label);
        const commits = document.createElement("div"); commits.setAttribute(`${MARK}-diff-commits`, "");
        for (const commit of [...detail.commits].sort((a,b) => (b.authoredAt ?? 0) - (a.authoredAt ?? 0))) {
          const row = document.createElement("div"); row.setAttribute(`${MARK}-diff-commit`, "");
          const graph = document.createElement("span"); graph.setAttribute(`${MARK}-diff-graph`, ""); graph.setAttribute("aria-hidden", "true");
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "svg"); dot.setAttribute("viewBox", "0 0 24 24");
          const circle = document.createElementNS(dot.namespaceURI, "circle");
          circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12"); circle.setAttribute("r", "7"); dot.append(circle); graph.append(dot);
          const text = document.createElement("code"); text.textContent = `${commit.shortSha} · ${commit.subject}`; text.title = `${commit.sha} · ${commit.subject}`;
          row.append(graph, text); commits.append(row);
        }
        container.append(commits);
      }
      if (detail.commitKind === "pr" && detail.unpushedCount != null) {
        const push = document.createElement("p");
        push.textContent = `미푸시 · ${detail.unpushedCount} commits · ${detail.unpushedRef ?? "기준 없음"} 대비`;
        container.append(push);
      }
    };
    const decorate = (button: HTMLElement, item: InfoItem, summary: boolean) => {
      const text = document.createElement("span");
      let childCount = 0;
      text.textContent = summary && item.key === "diff" ? describe(item) : item.label;
      if (summary && item.key === "todos") text.textContent = item.trigger?.textContent?.trim().replace(/\s+/g, " ").slice(0, 30) || item.label;
      if (summary && item.key === "queue") text.textContent = queueCount(item) || item.label;
      if (summary && item.key === "annotations") text.textContent = annotationCount(item);
      const presentation = item.key === "diff" ? readDiff()?.presentation : null;
      const icon = (summary && presentation && presentation.mode !== "working" ? emptyIcon("diff") : null)
        ?? (item.key === "annotations" ? emptyIcon("annotations") : null)
        ?? (item.key === "queue" ? emptyIcon("queue") : null)
        ?? (!summary ? emptyIcon(item.key) : null)
        ?? item.trigger?.querySelector("svg, [data-icon-root]") ?? item.node.querySelector("svg, [data-icon-root]") ?? emptyIcon(item.key);
      button.replaceChildren();
      if (summary && item.key === "children") {
        const avatars = document.createElement("span");
        avatars.setAttribute(`${MARK}-avatars`, "");
        let children: ChildSummary[] = [];
        try { children = JSON.parse(stack.querySelector(`[${MARK}-children]`)?.getAttribute(`${MARK}-children`) ?? "[]"); } catch { /* Host card remains usable. */ }
        if (!children.length) children = [{ id:"native", title:describe(item).replace(/^.*?:\s*/, ""), state:describe(item).startsWith("Active child") ? "run" : "wait" }];
        childCount = children.length;
        const stateOf = (child: ChildSummary): ChildState => child.state ?? (child.running ? "run" : "done");
        const nextStates = new Map(children.map(child => [child.id, stateOf(child)]));
        for (const [index, child] of children.slice(-3).entries()) {
          const avatar = document.createElement("span");
          avatar.setAttribute(`${MARK}-avatar`, "");
          avatar.title = child.title;
          avatar.textContent = childInitial(child.title);
          avatar.setAttribute("data-child", child.id);
          avatar.setAttribute("data-state", stateOf(child));
          avatar.style.zIndex = String(index + 1);
          const dot = document.createElement("span"); dot.setAttribute(`${MARK}-avatar-dot`, "");
          if (stateOf(child) === "done") {
            const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            check.setAttribute("viewBox", "0 0 24 24"); check.setAttribute("fill", "none"); check.setAttribute("stroke", "currentColor"); check.setAttribute("stroke-width", "1.5"); check.setAttribute("stroke-linecap", "round"); check.setAttribute("stroke-linejoin", "round");
            const path = document.createElementNS(check.namespaceURI, "path"); path.setAttribute("d", "M5 14L8.5 17.5L19 6.5"); check.append(path); dot.append(check);
          }
          avatar.append(dot);
          if (!childStates.has(child.id)) {
            avatar.setAttribute("data-new", "");
            avatar.style.animationDelay = `${index * 45}ms`;
          }
          else if (childStates.get(child.id) !== "done" && stateOf(child) === "done" && !reduced()) avatar.animate?.([
            { transform:"scale(1)", offset:0, easing:"cubic-bezier(.36,0,.18,1)" },
            { transform:"scale(1.1)", offset:.6, easing:"cubic-bezier(.36,0,.18,1)" },
            { transform:"scale(1)", offset:1 },
          ], { duration:360 });
          avatars.append(avatar);
        }
        if (children.length > 3) {
          text.textContent = `+${children.length - 3}`;
          text.setAttribute(`${MARK}-avatar-more`, "");
          text.style.zIndex = "4";
          avatars.append(text);
        }
        button.append(avatars);
        childStates = nextStates;
      } else {
        if (icon) {
          const clone = icon.cloneNode(true) as Element;
          clone.removeAttribute("id");
          clone.setAttribute("aria-hidden", "true");
          if (summary && presentation && presentation.mode !== "working" && presentation.branch) clone.setAttribute("data-bb-chat-ui-branch", "");
          button.append(clone);
        }
        if (summary && item.key === "diff") {
          const count = readDiff()?.detail?.commitCount;
          if (presentation?.mode === "branch" && count != null && count > 0) {
            text.setAttribute(`${MARK}-diff-summary`, "");
            text.textContent = presentation.branchLabel;
            text.append(" · ", commitCount(count));
          }
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
          if (presentation?.mode === "working" && presentation.branch) {
            const branch = emptyIcon("diff")?.cloneNode(true) as Element | undefined;
            if (branch) { branch.setAttribute("data-bb-chat-ui-branch", ""); branch.setAttribute("aria-hidden", "true"); button.append(branch); }
          } else if (!presentation) {
            const branch = item.trigger?.querySelector('[data-bb-chat-ui-branch]');
            if (branch) button.append(branch.cloneNode(true));
          }
        }
      }
      button.title = `${item.label} · ${describe(item)}${childCount ? ` · ${childCount}개` : ""}${presentation?.branch ? ` · ${presentation.branch}` : item.key === "diff" && item.trigger?.title ? ` · ${item.trigger.title}` : ""}`;
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
      updateScrollHints();
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
            const icon = emptyIcon(item.key)?.cloneNode(true) as Element | undefined;
            icon?.removeAttribute("id");
            icon?.setAttribute("aria-hidden", "true");
            const label = document.createElement("span"); label.textContent = item.label;
            const state = document.createElement("small"); state.textContent = "현재 없음";
            if (icon) choice.append(icon);
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
        updateScrollHints();
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
        const title = document.createElement("span"); title.textContent = labelOf(key);
        header.append(title);
        const dismiss = document.createElement("button");
        dismiss.type = "button"; dismiss.textContent = "×";
        dismiss.setAttribute("aria-label", `${labelOf(key)} 닫기`);
        dismiss.addEventListener("click", () => close(true));
        header.append(dismiss);
        const caption = document.createElement(item ? "div" : "p");
        if (item) { caption.setAttribute(`${MARK}-diff-content`, ""); renderDiff(caption, item); }
        else caption.textContent = "현재 정보 없음";
        menu.append(header, caption);
        if (item) {
          const action = panelAction("Diff 패널 열기", () => {
            const current = items.find(item => item.key === "diff");
            close();
            if (current?.trigger?.id === "thread-prompt-banner-git-toggle") current.trigger.click();
            else openChangesPanel(document, stack);
          });
          action.setAttribute(`${MARK}-action`, "diff");
          header.insertBefore(action, dismiss);
        }
        buttons.get(key)?.setAttribute("aria-expanded", "true");
        bar.append(menu);
        orb.setAttribute("aria-controls", menu.id);
        orb.setAttribute("aria-expanded", "true");
        updateScrollHints();
        return;
      }
      active = key;
      activeNode = item.node;
      item.node.setAttribute(OPEN, "");
      if (item.trigger?.getAttribute("aria-expanded") === "false") item.trigger.click();
      buttons.get(key)?.setAttribute("aria-expanded", "true");
      updateScrollHints();
    };
    orb.addEventListener("click", () => open("all", orb));
    const fit = () => {
      const widths = [...buttons].map(([key, button]) => {
        button.hidden = false;
        // Entry transforms change visual bounds, but must not change which pills fit.
        return { key, width:button.offsetWidth || button.getBoundingClientRect().width };
      });
      const width = stack.getBoundingClientRect().width;
      const visible = new Set(fitComposerInfo(widths, width > 0 ? width - (bar.hasAttribute(`${MARK}-jump`) ? 40 : 0) : Number.POSITIVE_INFINITY));
      for (const [key, button] of buttons) button.hidden = !visible.has(key);
      if (bar.hidden) return;
      let entryDelay = 0;
      for (const [key, button] of buttons) {
        if (button.hidden || appeared.has(key)) continue;
        appeared.add(key);
        if (reduced()) continue;
        if (button.querySelector(`[${MARK}-avatars]`)) {
          const avatars = button.querySelectorAll<HTMLElement>(`[${MARK}-avatar][data-new]`);
          avatars.forEach((avatar, index) => { avatar.style.animationDelay = `${entryDelay + index * 45}ms`; });
          entryDelay += Math.max(1, avatars.length) * 45;
          continue;
        }
        const animation = button.animate?.([
          { transform:"translateY(8px) scale(.85)", offset:0, easing:"cubic-bezier(.36,0,.18,1)" },
          { transform:"translateY(-2px) scale(1.1)", offset:.6, easing:"cubic-bezier(.36,0,.18,1)" },
          { transform:"none", offset:1 },
        ], { duration:460, delay:entryDelay, fill:"backwards" });
        entryDelay += 45;
        if (animation) {
          entryAnimations.add(animation);
          animation.onfinish = animation.oncancel = () => entryAnimations.delete(animation);
        }
      }
    };
    const resize = typeof view!.ResizeObserver === "function" ? new view!.ResizeObserver(fit) : null;
    resize?.observe(stack);
    const sync = () => {
      const source = stack.querySelector(`[${SOURCE}]`);
      if (!source) return;
      const feedback = emptyIcon("annotations");
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
      syncPanelActions();
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
            const text = summary.presentation?.label ?? `+${summary.insertions} −${summary.deletions} · ${summary.files} files`;
            if (button.textContent !== text) button.textContent = text;
            button.title = summary.branch ?? "Code Diff";
            items.unshift({ key:"diff", node:diffSupplement, trigger:button, label:"Code Diff" });
          }
        } catch { /* A disconnected environment has no invented Diff tally. */ }
      }
      const request = stack.querySelector(REQUEST) !== null;
      if (request !== stack.hasAttribute(`${MARK}-request`)) stack.toggleAttribute(`${MARK}-request`, request);
      if (request || activeNode && !items.some(item => item.node === activeNode)) close(false, true);
      let settings: Record<string, unknown> = {};
      try { settings = JSON.parse(source.getAttribute(SOURCE) || "{}"); } catch { /* Defaults work while settings load. */ }
      listed = listedInfo(settings);
      if (active && active !== "all" && !listed.includes(active)) close();
      if (!listed.length) close();
      bar.hidden = request || !listed.length && !editing();
      const diff = readDiff();
      const awaitingDiff = !!stack.querySelector(`[${HEAD_DIFF_MARK}]`) && !diff;
      const exposed = exposedInfo(settings).filter(key => key !== "diff" || !awaitingDiff && diff?.presentation?.visible !== false);
      const showEmpty = settings.showEmptyIcons === true;
      if (active === "annotations" && items.find(item => item.node === activeNode && item.key === active)?.trigger?.getAttribute("aria-expanded") === "false") close(true);
      const next = JSON.stringify([settings, items.map(item => [item.key, describe(item)]), stack.querySelector(`[${MARK}-children]`)?.getAttribute(`${MARK}-children`), stack.querySelector(`[${HEAD_DIFF_MARK}]`)?.getAttribute(HEAD_DIFF_MARK), stack.style.getPropertyValue("--bb-chat-ui-feedback-icon")]);
      if (signature !== next) {
        if (signature) pulse();
        signature = next;
        for (const [key, button] of buttons) if (!exposed.includes(key) || !showEmpty && !items.some(item => item.key === key)) { button.remove(); buttons.delete(key); }
        for (const key of exposed) {
          const item = items.find(item => item.key === key);
          if (!item && !showEmpty) continue;
          let button = buttons.get(key);
          if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.setAttribute(`${MARK}-trigger`, key);
            button.addEventListener("click", () => open(key, button!));
            buttons.set(key, button);
          }
          button.setAttribute("aria-expanded", String(active === key));
          button.toggleAttribute(`${MARK}-unavailable`, !item);
          if (item) decorate(button, item, true);
          else {
            const icon = emptyIcon(key)?.cloneNode(true) as Element | undefined;
            icon?.setAttribute("aria-hidden", "true");
            button.replaceChildren(...(icon ? [icon] : []));
            button.title = `${labelOf(key)} · 현재 없음`;
            button.setAttribute("aria-label", button.title);
          }
          pills.append(button);
        }
        if (active === "all") { close(); open("all", orb); }
        else if (active === "diff" && menu?.hasAttribute(`${MARK}-diff`)) {
          const item = items.find(item => item.key === "diff");
          if (item) renderDiff(menu.querySelector(`[${MARK}-diff-content]`)!, item);
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
      updateScrollHints();
    };
    return { sync, bar, close, editing, resize, cleanup() {
      close(false, true);
      for (const animation of entryAnimations) animation.cancel();
      entryAnimations.clear();
      resize?.disconnect();
      edgeResize?.disconnect();
      stack.removeEventListener("scroll", updateScrollHints, true);
      stack.removeEventListener("wheel", onWheel);
      stack.removeEventListener("touchstart", onTouchStart);
      stack.removeEventListener("touchmove", onTouchMove);
      stack.removeEventListener("touchend", endTouch);
      stack.removeEventListener("touchcancel", endTouch);
      bar.remove();
      stack.removeAttribute(`${MARK}-stack`);
      stack.removeAttribute(`${MARK}-request`);
      stack.style.removeProperty("--bb-chat-ui-feedback-icon");
      for (const [source, action] of panelActions) { action.remove(); source.removeAttribute(`${MARK}-panel-source`); }
      for (const heading of panelHeadings) heading.removeAttribute(`${MARK}-panel-heading`);
      for (const heading of generatedHeadings) heading.remove();
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
  observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:[SOURCE, HEAD_DIFF_MARK, `${MARK}-children`, "aria-label", "aria-expanded", "aria-disabled", "disabled", "title", "href", "data-testid"] });
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
