import { createElement, useLayoutEffect, useRef } from "react";
import { experimental_Icon, useComposer, useSdk, useSettings } from "@get-bb/plugin-sdk/app";

import { publishDiffData, clearComposerData } from "./composer-data.ts";
import { HEAD_DIFF_MARK } from "./workspace-diff-pill.ts";
import { listedInfo } from "./composer-info-settings.ts";
import { watchWorkspaceDiff } from "./workspace-diff-watch.ts";

export function WorkspaceDiffBridge() {
  const sdk = useSdk();
  const { values, isLoading } = useSettings();
  const enabled = listedInfo(values ?? {}).includes("diff");
  const { scope } = useComposer();
  const threadId = scope.kind === "thread" ? scope.threadId : null;
  const source = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = source.current;
    if (!threadId || !node) return;
    if (isLoading) {
      publishDiffData(node, { threadId, state: "loading", summary: null });
      return () => clearComposerData(node);
    }
    publishDiffData(node, { threadId, state: enabled ? "loading" : "unavailable", summary: null });
    const stop = watchWorkspaceDiff(sdk, threadId, summary => {
      publishDiffData(node, { threadId, summary, state: summary ? "ready" : "unavailable" });
    }, window, enabled);
    return () => {
      stop();
      clearComposerData(node);
    };
  }, [sdk, threadId, enabled, isLoading]);

  if (!threadId) return null;
  return createElement("span", { ref: source, hidden: true, [HEAD_DIFF_MARK]: "" },
    createElement(experimental_Icon, { name: "GitBranch", "aria-hidden": true }));
}
