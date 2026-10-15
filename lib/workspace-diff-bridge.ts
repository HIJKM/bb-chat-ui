import { createElement, useLayoutEffect, useRef } from "react";
import { experimental_Icon, useComposer, useSdk } from "@get-bb/plugin-sdk/app";

import { publishDiffData, clearComposerData } from "./composer-data.ts";
import { HEAD_DIFF_MARK } from "./workspace-diff-pill.ts";
import { startWorkspaceDiffRefresh } from "./workspace-diff-refresh.ts";

export function WorkspaceDiffBridge() {
  const sdk = useSdk();
  const { scope } = useComposer();
  const threadId = scope.kind === "thread" ? scope.threadId : null;
  const source = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = source.current;
    if (!threadId || !node) return;
    publishDiffData(node, { threadId, state: "loading", summary: null });
    const { refresh, stop } = startWorkspaceDiffRefresh(sdk, threadId, summary => {
      publishDiffData(node, { threadId, summary, state: summary ? "ready" : "unavailable" });
    });
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, 5000);
    return () => {
      stop();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
      clearComposerData(node);
    };
  }, [sdk, threadId]);

  if (!threadId) return null;
  return createElement("span", { ref: source, hidden: true, [HEAD_DIFF_MARK]: "" },
    createElement(experimental_Icon, { name: "GitBranch", "aria-hidden": true }));
}
