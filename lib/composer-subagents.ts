const CARD = "data-bb-chat-ui-subagent-card";
// Live rows use the presentation label "Running subagent" with no colon. The older
// activity copy "Running subagent:" remains valid.
const LINE = /^(?:Running|Launching) subagent\b:?\s*(.*)$/;
const COUNT = /(?:Running|Launching) (\d+) subagents?\b/;

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

export function readSubagentLines(root: ParentNode): SubagentHit[] {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("span, div, p, button, li, a"));
    const hits: SubagentHit[] = [];
    const counts: SubagentHit[] = [];
    for (const node of nodes) {
        if (skipped(node)) continue;
        const text = rowText(node);
        if (!text) continue;
        const line = text.match(LINE);
        if (line) {
            hits.push({ status: "running", label: line[1] || "실행 중", node });
            continue;
        }
        const count = text.match(COUNT);
        if (count) counts.push({ status: "running", label: `${count[1]}명 실행 중`, node });
    }
    const inner = hits.filter(hit => !hits.some(other => other.node && hit.node && other.node !== hit.node && hit.node.contains(other.node)));
    const running = inner.filter(hit => hit.status === "running");
    if (running.length) return running;
    return counts.filter(hit => !counts.some(other => other.node && hit.node && other.node !== hit.node && hit.node.contains(other.node)));
}

function summaryOf(hits: SubagentHit[]): string {
    return hits.length === 1 ? hits[0].label : `${hits.length}명 실행 중`;
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
