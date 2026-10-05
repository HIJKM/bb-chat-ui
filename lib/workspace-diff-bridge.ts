import { createElement, useEffect, useState } from "react";
import { experimental_Icon, useComposer, useSdk } from "@get-bb/plugin-sdk/app";

import { HEAD_DIFF_MARK, headDiffSummary } from "./workspace-diff-pill.ts";

export function WorkspaceDiffBridge() {
  const sdk = useSdk();
  const { scope } = useComposer();
  const threadId = scope.kind === "thread" ? scope.threadId : null;
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    setSummary("");
    if (!threadId) return;
    const controller = new AbortController();
    const { signal } = controller;
    let environmentId: string | null = null;
    let fetching = false;
    const refresh = async () => {
      if (fetching || signal.aborted) return;
      fetching = true;
      try {
        if (!environmentId) {
          const thread = await sdk.threads.get({ threadId, signal });
          environmentId = thread.environmentId;
        }
        if (!environmentId) return;
        const result = await sdk.environments.status({ environmentId, signal });
        if (signal.aborted) return;
        setSummary(result.outcome === "available"
          ? JSON.stringify(headDiffSummary(result.workspace)) : "");
      } catch {
        // Keep the last summary during a temporary disconnect.
      } finally {
        fetching = false;
      }
    };
    const stopThread = sdk.subscribe({
      event: "thread:changed", threadId,
      callback: () => { environmentId = null; void refresh(); },
    });
    const stopEnvironment = sdk.subscribe({
      event: "environment:changed",
      callback: (event) => {
        if (!event.id || event.id === environmentId) void refresh();
      },
    });
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, 5000);
    void refresh();
    return () => {
      controller.abort();
      stopThread();
      stopEnvironment();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [sdk, threadId]);

  if (!threadId) return null;
  return createElement("span", { hidden: true, [HEAD_DIFF_MARK]: summary },
    createElement(experimental_Icon, { name: "GitBranch", "aria-hidden": true }));
}
