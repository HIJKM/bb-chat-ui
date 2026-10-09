import { createElement, useEffect, useState } from "react";
import { experimental_Icon, useComposer, useSdk } from "@get-bb/plugin-sdk/app";

import { HEAD_DIFF_MARK } from "./workspace-diff-pill.ts";
import { readWorkspaceDiff } from "./workspace-diff-data.ts";

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
    let mergeBaseBranch: string | undefined;
    let fetching = false;
    let pending = false;
    const refresh = async () => {
      if (signal.aborted) return;
      if (fetching) {
        pending = true;
        return;
      }
      fetching = true;
      try {
        if (!environmentId) {
          const thread = await sdk.threads.get({ threadId, signal });
          const id = thread.environmentId;
          if (!id) return;
          const environment = await sdk.environments.get({ environmentId: id, signal });
          environmentId = id;
          const base = environment.mergeBaseBranch;
          mergeBaseBranch = base && base.length > 0 ? base : undefined;
        }
        const id = environmentId;
        const result = await readWorkspaceDiff(sdk.environments, id, mergeBaseBranch, signal);
        if (signal.aborted || environmentId !== id) return;
        setSummary(result ? JSON.stringify(result) : "");
      } catch {
        // Keep the last summary during a temporary disconnect.
      } finally {
        fetching = false;
        if (pending && !signal.aborted) {
          pending = false;
          void refresh();
        }
      }
    };
    const stopThread = sdk.subscribe({
      event: "thread:changed", threadId,
      callback: () => {
        environmentId = null;
        setSummary("");
        mergeBaseBranch = undefined;
        void refresh();
      },
    });
    const stopEnvironment = sdk.subscribe({
      event: "environment:changed",
      callback: (event) => {
        if (environmentId && event.id && event.id !== environmentId) return;
        environmentId = null;
        setSummary("");
        void refresh();
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
