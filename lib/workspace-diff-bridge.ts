import { createElement, useEffect, useState } from "react";
import { experimental_Icon, useComposer, useSdk } from "@get-bb/plugin-sdk/app";

import { HEAD_DIFF_MARK } from "./workspace-diff-pill.ts";
import { startWorkspaceDiffRefresh } from "./workspace-diff-refresh.ts";

export function WorkspaceDiffBridge() {
  const sdk = useSdk();
  const { scope } = useComposer();
  const threadId = scope.kind === "thread" ? scope.threadId : null;
  const [snapshot, setSnapshot] = useState<{ threadId:string; summary:string } | null>(null);

  useEffect(() => {
    if (!threadId) return;
    const { refresh, stop } = startWorkspaceDiffRefresh(sdk, threadId, summary => {
      setSnapshot(previous => previous?.threadId === threadId && previous.summary === summary ? previous : { threadId, summary });
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
    };
  }, [sdk, threadId]);

  if (!threadId) return null;
  const summary = snapshot?.threadId === threadId ? snapshot.summary : "";
  return createElement("span", { hidden: true, [HEAD_DIFF_MARK]: summary },
    createElement(experimental_Icon, { name: "GitBranch", "aria-hidden": true }));
}
