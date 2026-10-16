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
        <div>Working <span title="Running subagent review the diff (explore)">Running subagent review the diff (explore) 1.2s</span> and more</div>
        <span title="Subagent finished old notes">Subagent finished old notes</span>
        <span>Running subagent: quoted form</span>
        <div data-promptbox-shell><span>Running subagent inside composer</span></div>
    `));
    const hits = readSubagentLines(document.getElementById("thread")!);
    assert.deepEqual(hits.map(hit => hit.label), ["review the diff (explore)", "quoted form"]);
    assert.equal(hits[0].node?.tagName, "SPAN");
});

test("a collapsed running count is used when individual lines are absent", () => {
    const { document } = page(thread(`<div><span title="Explored 3 files, Running 2 subagents">Explored 3 files, Running 2 subagents</span></div>`));
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
        document.getElementById("source")!.textContent = "Edited a file";
        syncSubagentCards(document);
        assert.equal(document.querySelector("[data-bb-chat-ui-subagent-card]"), null);
    } finally {
        stop();
        dom.window.close();
        Reflect.deleteProperty(globalThis, "document");
    }
});

test("the latest turn keeps a finished subagent and earlier turns stay hidden", () => {
    const { document } = page(thread(`
        <span title="Subagent finished Task: older">Subagent finished Task: older</span>
        <div data-message-column>다시 해봐</div>
        <span title="Subagent finished Task: 서브에이전트 필 다시 확인">Subagent finished Task: 서브에이전트 필 다시 확인 4s</span>
    `));
    const hits = readSubagentLines(document.getElementById("thread")!);
    assert.deepEqual(hits.map(hit => [hit.status, hit.label]), [["done", "Task: 서브에이전트 필 다시 확인"]]);
});

test("a collapsed finished count is kept for the latest turn", () => {
    const { document } = page(thread(`
        <div data-message-column>이전</div>
        <span title="Ran 1 subagent">Ran 1 subagent</span>
        <div data-message-column>이번</div>
        <span title="Explored 3 files, Ran 2 subagents">Explored 3 files, Ran 2 subagents</span>
    `));
    assert.deepEqual(readSubagentLines(document).map(hit => hit.label), ["2명 완료"]);
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
