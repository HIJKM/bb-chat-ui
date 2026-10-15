import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { injectComposerInfo } from "./composer-info.ts";
import { clearSubagentCards, readSubagentLines, syncSubagentCards } from "./composer-subagents.ts";

function page(body: string) {
    const dom = new JSDOM(`<html><body>${body}</body></html>`);
    return { dom, document: dom.window.document };
}

const thread = (activity: string) => `
    <div id="thread">
        <div>${activity}</div>
        <div data-scroll-footer>
            <div data-promptbox-shell><div class="grid">
                <span hidden data-bb-chat-ui-info-settings="{}"></span>
            </div></div>
        </div>
    </div>`;

test("running subagent lines are the innermost rows and finished lines stay out", () => {
    const { document } = page(thread(`
        <div>Working <span>Running subagent: review the diff (explore)</span> and more</div>
        <span>Ran subagent: old notes</span>
        <div data-promptbox-shell><span>Running subagent: inside composer</span></div>
    `));
    const hits = readSubagentLines(document.getElementById("thread")!);
    assert.deepEqual(hits.map(hit => hit.label), ["review the diff (explore)"]);
    assert.equal(hits[0].node?.tagName, "SPAN");
});

test("a collapsed running count is used when individual lines are absent", () => {
    const { document } = page(thread(`<div><span>Running 2 subagents</span></div>`));
    assert.deepEqual(readSubagentLines(document).map(hit => hit.label), ["2명 실행 중"]);
});

test("the composer pill shows one running description and lists each row", () => {
    const { dom, document } = page(thread(`<span id="source">Running subagent: review the diff</span>`));
    Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: document });
    let scrolled = false;
    document.getElementById("source")!.scrollIntoView = () => { scrolled = true; };
    const stop = injectComposerInfo(document);
    try {
        const pill = document.querySelector('[data-bb-chat-ui-info-trigger="subagents"]');
        assert.equal(pill?.textContent, "review the diff");
        assert.match(pill?.getAttribute("aria-label") ?? "", /review the diff/);
        pill!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
        const row = document.querySelector<HTMLButtonElement>("[data-bb-chat-ui-subagent]");
        assert.equal(row?.textContent, "review the diff");
        row!.click();
        assert.equal(scrolled, true);
        document.getElementById("source")!.textContent = "Ran subagent: review the diff";
        syncSubagentCards(document);
        assert.equal(document.querySelector("[data-bb-chat-ui-subagent-card]"), null);
    } finally {
        stop();
        dom.window.close();
        Reflect.deleteProperty(globalThis, "document");
    }
});

test("several running subagents collapse to a count and clear with the cards", () => {
    const { document } = page(thread(`
        <span>Running subagent: first pass</span>
        <span>Running subagent: second pass</span>
    `));
    syncSubagentCards(document);
    const card = document.querySelector("[data-bb-chat-ui-subagent-card]");
    assert.equal(card?.getAttribute("data-bb-chat-ui-subagent-summary"), "2명 실행 중");
    assert.equal(card?.querySelectorAll("[data-bb-chat-ui-subagent]").length, 2);
    clearSubagentCards(document);
    assert.equal(document.querySelector("[data-bb-chat-ui-subagent-card]"), null);
});
