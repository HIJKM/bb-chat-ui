const CARD = "data-bb-chat-ui-subagent-card";
// Live rows use the presentation label "Running subagent" with no colon. The older
// activity copy "Running subagent:" remains valid. Finished rows stay on the pill
// until the next user message, because the live label disappears as soon as the call ends.
const LIVE = /^(?:Running|Launching) subagent\b:?\s*(.*)$/;
const DONE = /^(?:Subagent finished|Launched subagent)\b:?\s*(.*)$/;
const LIVE_COUNT = /(?:Running|Launching) (\d+) subagents?\b/;
const DONE_COUNT = /\bRan (\d+) subagents?\b/;

export interface SubagentHit {
    status: "running" | "done" | "failed" | "interrupted";
    label: string;
    node: HTMLElement | null;
}

function plain(value: string | null | undefined): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
}

function rowText(node: HTMLElement): string {
    const title = plain(node.getAttribute("title"));
    if (title) return title;
    const text = plain(node.textContent);
    return text.length <= 240 ? text : "";
}

function skipped(node: HTMLElement): boolean {
    return !!node.closest("[data-bb-chat-ui-info-stack], [data-promptbox-shell]");
}

function inLatestTurn(root: ParentNode, node: HTMLElement): boolean {
    const markers = Array.from(root.querySelectorAll<HTMLElement>("[data-message-column]"));
    const last = markers[markers.length - 1];
    if (!last || last.contains(node)) return !last;
    return (last.compareDocumentPosition(node) & 4) !== 0;
}

function innermost(hits: SubagentHit[]): SubagentHit[] {
    return hits.filter(hit => !hits.some(other => other.node && hit.node && other.node !== hit.node && hit.node.contains(other.node)));
}

export function readSubagentLines(root: ParentNode): SubagentHit[] {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("span, div, p, button, li, a"));
    const live: SubagentHit[] = [];
    const done: SubagentHit[] = [];
    const liveCounts: SubagentHit[] = [];
    const doneCounts: SubagentHit[] = [];
    for (const node of nodes) {
        if (skipped(node) || !inLatestTurn(root, node)) continue;
        const text = rowText(node);
        if (!text) continue;
        const running = text.match(LIVE);
        if (running) {
            live.push({ status: "running", label: running[1] || "실행 중", node });
            continue;
        }
        const finished = text.match(DONE);
        if (finished) {
            done.push({ status: "done", label: finished[1] || "완료", node });
            continue;
        }
        const runningCount = text.match(LIVE_COUNT);
        if (runningCount) {
            liveCounts.push({ status: "running", label: `${runningCount[1]}명 실행 중`, node });
            continue;
        }
        const finishedCount = text.match(DONE_COUNT);
        if (finishedCount) doneCounts.push({ status: "done", label: `${finishedCount[1]}명 완료`, node });
    }
    const lines = innermost(live);
    if (lines.length) return lines;
    const finished = innermost(done);
    if (finished.length) return finished;
    const runningCounts = innermost(liveCounts);
    if (runningCounts.length) return runningCounts;
    return innermost(doneCounts);
}

function summaryOf(hits: SubagentHit[]): string {
    if (hits.length === 1) return hits[0].label;
    return hits.every(hit => hit.status === "done") ? `${hits.length}명 완료` : `${hits.length}명 실행 중`;
}

export function syncSubagentCards(document: Document): void {
    for (const stack of Array.from(document.querySelectorAll<HTMLElement>("[data-promptbox-shell] > .grid"))) {
        const root = stack.closest("[data-page-scroll-viewport]") ?? stack.closest("[data-scroll-footer]")?.parentElement ?? document;
        const hits = readSubagentLines(root);
        let card = stack.querySelector<HTMLElement>(`[${CARD}]`);
        if (!hits.length) {
            card?.remove();
            continue;
        }
        if (!card) {
            card = document.createElement("section");
            card.setAttribute(CARD, "");
            card.setAttribute("data-bb-chat-ui-info-kind", "subagents");
            card.setAttribute("aria-label", "서브에이전트");
            const title = document.createElement("h3");
            title.textContent = "서브에이전트";
            card.append(title);
            stack.append(card);
        }
        const summary = summaryOf(hits);
        if (card.getAttribute("data-bb-chat-ui-subagent-summary") !== summary) card.setAttribute("data-bb-chat-ui-subagent-summary", summary);
        const signature = hits.map(hit => `${hit.status}\n${hit.label}`).join("\n");
        if (card.getAttribute("data-bb-chat-ui-subagent-signature") === signature) continue;
        card.setAttribute("data-bb-chat-ui-subagent-signature", signature);
        const title = card.querySelector("h3") ?? document.createElement("h3");
        title.textContent = "서브에이전트";
        const list = document.createElement("div");
        list.setAttribute("data-bb-chat-ui-subagent-list", "");
        for (const hit of hits) {
            const row = document.createElement("button");
            row.type = "button";
            row.setAttribute("data-bb-chat-ui-subagent", hit.status);
            row.setAttribute("data-bb-chat-ui-subagent-label", hit.label);
            row.textContent = hit.label;
            const source = hit.node;
            if (source) row.addEventListener("click", () => source.scrollIntoView({ block: "center" }));
            list.append(row);
        }
        card.replaceChildren(title, list);
    }
}

export function clearSubagentCards(document: Document): void {
    for (const card of Array.from(document.querySelectorAll(`[${CARD}]`))) card.remove();
}
