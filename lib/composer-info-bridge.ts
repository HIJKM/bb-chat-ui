import { createElement, Fragment, useEffect, useState } from "react";
import { experimental_Icon, UrlLink, useBbNavigate, useComposer, useSdk, useSettings } from "@get-bb/plugin-sdk/app";
import { infoKinds } from "./composer-info-settings.ts";
import { childInitial, childState } from "./composer-child.ts";

type Sdk = ReturnType<typeof useSdk>;
type Timeline = Awaited<ReturnType<Sdk["threads"]["timeline"]>>;
type Children = Awaited<ReturnType<Sdk["threads"]["list"]>>;
type Queue = Awaited<ReturnType<Sdk["threads"]["queuedMessages"]["list"]>>;
type PullRequest = Awaited<ReturnType<Sdk["environments"]["pullRequest"]>>;
interface Snapshot { threadId: string; timeline: Timeline; children: Children; queue: Queue; pullRequest: PullRequest | null; }
const mark = "data-bb-chat-ui-info";

export function ComposerInfoBridge() {
  const sdk = useSdk();
  const navigate = useBbNavigate();
  const { scope } = useComposer();
  const { values } = useSettings();
  const threadId = scope.kind === "thread" ? scope.threadId : null;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!threadId) return;
    const controller = new AbortController();
    const { signal } = controller;
    let timer = 0;
    let fetching = false;
    let again = false;
    let childIds = new Set<string>();
    const refresh = async () => {
      if (signal.aborted) return;
      if (fetching) { again = true; return; }
      fetching = true;
      try {
        const timelinePromise = sdk.threads.timeline({ threadId, summaryOnly:"true", signal });
        const readOnlyPromise = (async () => {
          const thread = await sdk.threads.get({ threadId, include:"environment", signal });
          const environment = "environment" in thread ? thread.environment : null;
          if (thread.archivedAt === null && environment?.status !== "destroyed" && environment?.hostLifecycle !== "removed") return { queue:[] as Queue, pullRequest:null };
          const results = await Promise.allSettled([
            sdk.threads.queuedMessages.list({ threadId, signal }),
            thread.environmentId ? sdk.environments.pullRequest({ environmentId:thread.environmentId, signal }) : Promise.resolve(null),
          ]);
          return { queue:results[0].status === "fulfilled" ? results[0].value : [], pullRequest:results[1].status === "fulfilled" ? results[1].value : null };
        })();
        const childrenPromise = (async () => {
          const children: Children = [];
          for (let offset = 0; !signal.aborted; offset += 100) {
            const page = await sdk.threads.list({ parentThreadId:threadId, limit:100, offset, signal });
            children.push(...page);
            if (page.length < 100) break;
          }
          return children;
        })();
        const [timeline, children, readOnly] = await Promise.all([timelinePromise, childrenPromise, readOnlyPromise]);
        if (!signal.aborted) { childIds = new Set(children.map(child => child.id)); setSnapshot({ threadId, timeline, children, ...readOnly }); setError(false); }
      } catch {
        if (!signal.aborted) setError(true);
      } finally {
        fetching = false;
        if (again && !signal.aborted) { again = false; schedule(); }
      }
    };
    const schedule = () => {
      if (timer || signal.aborted) return;
      timer = window.setTimeout(() => { timer = 0; void refresh(); }, 250);
    };
    // Include child changes, and coalesce rapid stream updates into one request.
    const stop = sdk.subscribe({ event:"thread:changed", callback:event => {
      if (event.changes.some(change => change === "thread-created" || change === "parent-changed")) { schedule(); return; }
      if (event.id !== threadId && (!event.id || !childIds.has(event.id))) return;
      if (event.changes.some(change => change !== "events-appended" && change !== "read-state-changed" && change !== "tabs-changed" && change !== "terminals-changed")) { schedule(); return; }
      const types = event.metadata?.eventTypes;
      if (event.changes.includes("events-appended") && (!types || types.some(type => ["thread/goal/updated", "thread/goal/cleared", "turn/plan/updated", "thread/extensionState/updated", "turn/completed"].includes(type)))) schedule();
    } });
    const stopConnection = sdk.subscribe({ event:"realtime:connection", callback:event => {
      if (event.state === "connected" && event.reconnected) schedule();
    } });
    window.addEventListener("focus", schedule);
    void refresh();
    return () => { controller.abort(); stop(); stopConnection(); window.clearTimeout(timer); window.removeEventListener("focus", schedule); };
  }, [sdk, threadId]);
  if (!threadId) return null;
  const data = snapshot?.threadId === threadId ? snapshot : null;
  const timeline = data?.timeline;
  const children = data?.children ?? [];
  const pullRequest = data?.pullRequest?.outcome === "available" ? data.pullRequest.pullRequest : null;
  const section = (kind: string, title: string, icon: "ListTodo" | "Target" | "UserRound" | "CircleAlert", content: ReturnType<typeof createElement>) => createElement("section", {
    key:kind, [`${mark}-kind`]:kind, "aria-label":title,
  }, createElement("h3", null, createElement(experimental_Icon, { name:icon, "aria-hidden":true }), " ", title,
    kind === "children" ? createElement("button", { type:"button", [`${mark}-dismiss`]:kind, "aria-label":"Child Threads 닫기" }, "×") : null), content);
  return createElement(Fragment, null,
    createElement("span", {
      hidden:true,
      [`${mark}-settings`]:JSON.stringify(values ?? {}),
      [`${mark}-children`]:JSON.stringify(children.map(child => ({ id:child.id, title:child.title ?? child.titleFallback ?? "Child Thread", state:childState(child.runtime.displayStatus, child.hasPendingInteraction) }))),
    }, ...infoKinds.map(kind => createElement("span", { key:kind.key, [`${mark}-icon`]:kind.key },
      createElement(experimental_Icon, { name:kind.icon, "aria-hidden":true })))),
    createElement("div", { [`${mark}-supplements`]:"" },
      timeline?.activePromptMode ? section("plan", "Plan", "ListTodo", createElement("p", null, timeline.activePromptMode.prompt)) : null,
      timeline?.goal ? section("goal", "Goal", "Target", createElement("div", null,
        createElement("p", null, timeline.goal.objective),
        createElement("p", { className:"text-subtle-foreground" }, `${timeline.goal.status} · ${timeline.goal.tokensUsed.toLocaleString()}${timeline.goal.tokenBudget == null ? "" : ` / ${timeline.goal.tokenBudget.toLocaleString()}`} tokens · ${Math.round(timeline.goal.timeUsedSeconds)}s`))) : null,
      timeline?.pendingTodos ? section("todos", "할 일", "ListTodo", createElement("ul", null, ...timeline.pendingTodos.items.map(item => createElement("li", { key:item.id }, `${item.status === "completed" ? "✓" : item.status === "in_progress" ? "◉" : "○"} ${item.text}`)))) : null,
      children.length ? section("children", "Child Threads", "UserRound", createElement("div", null, ...children.map(child => {
        const title = child.title ?? child.titleFallback ?? "Child Thread";
        const state = childState(child.runtime.displayStatus, child.hasPendingInteraction);
        return createElement("div", { key:child.id, [`${mark}-child-row`]:"" },
          createElement("span", { [`${mark}-avatar`]:"", "data-state":state, "aria-hidden":true }, childInitial(title),
            createElement("span", { [`${mark}-avatar-dot`]:"" }, state === "done" ? createElement(experimental_Icon, { name:"Check" }) : null)),
          createElement("div", { [`${mark}-child-main`]:"" },
            createElement("button", { type:"button", onClick:() => navigate.toThread(child.id) }, title),
            createElement("div", { [`${mark}-child-meta`]:"" }, `${child.providerId} · ${child.runtime.displayStatus}`)),
          createElement("span", { [`${mark}-child-status`]:"" }, state === "run" ? "실행 중" : state === "wait" ? child.hasPendingInteraction ? "입력 대기" : "호스트 대기" : state === "error" ? "오류" : "완료"));
      }))) : null,
      data?.queue.length ? section("queue", "대기 메시지", "ListTodo", createElement("div", null, ...data.queue.map(row => createElement("div", { key:row.id },
        createElement("p", null, row.content.filter(part => part.visibility !== "agent-only").map(part => part.type === "text" ? part.text : part.type === "localFile" ? part.name ?? part.path : part.type === "localImage" ? part.path : "Image").join("\n")),
        createElement("p", { className:"text-subtle-foreground" }, row.failureReason ?? (row.sendAt ? new Date(row.sendAt).toLocaleString() : "Queued")))))) : null,
      pullRequest ? section("pullRequest", "Pull request", "ListTodo", createElement("div", null, createElement(UrlLink, { href:pullRequest.url }, `#${pullRequest.number} · ${pullRequest.title}`), createElement("p", null, `${pullRequest.state} · ${pullRequest.checks.state} · ${pullRequest.review.state}`))) : null,
      error && !data ? section("other", "정보를 불러오지 못했습니다", "CircleAlert", createElement("p", null, "연결이 복구되면 다시 읽습니다. 현재 표시된 BB 정보는 계속 열 수 있습니다.")) : null,
    ));
}
