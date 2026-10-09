import type { useSdk } from "@get-bb/plugin-sdk/app";
import { readWorkspaceDiff } from "./workspace-diff-data.ts";

type Sdk = Pick<ReturnType<typeof useSdk>, "threads" | "environments" | "subscribe">;

export function startWorkspaceDiffRefresh(sdk:Sdk, threadId:string, publish:(summary:string) => void) {
  const controller = new AbortController();
  const { signal } = controller;
  let environmentId:string | null = null;
  let mergeBaseBranch:string | undefined;
  let contextDirty = true;
  let revision = 0;
  let fetching = false;
  let pending = false;
  let published = false;
  const update = (summary:string) => { published = true; publish(summary); };
  const refresh = async () => {
    if (signal.aborted) return;
    if (fetching) { pending = true; return; }
    fetching = true;
    const current = revision;
    const stale = () => signal.aborted || current !== revision;
    try {
      if (contextDirty) {
        const thread = await sdk.threads.get({ threadId, signal });
        if (stale()) return;
        const id = thread.environmentId;
        if (!id) { environmentId = null; update(""); return; }
        const environment = await sdk.environments.get({ environmentId:id, signal });
        if (stale()) return;
        environmentId = id;
        mergeBaseBranch = environment.mergeBaseBranch || undefined;
        contextDirty = false;
      }
      if (!environmentId) return;
      const result = await readWorkspaceDiff(sdk.environments, environmentId, mergeBaseBranch, signal);
      if (!stale()) {
        if (result) update(JSON.stringify(result));
        else if (result === undefined || !published) update("");
      }
    } catch {
      // Keep the last summary during a temporary disconnect.
      if (!stale() && !published) update("");
    } finally {
      fetching = false;
      if (pending && !signal.aborted) { pending = false; void refresh(); }
    }
  };
  const invalidate = () => {
    revision++;
    contextDirty = true;
    void refresh();
  };
  const stopThread = sdk.subscribe({
    event:"thread:changed", threadId,
    callback:event => {
      if (event.id && event.id !== threadId) return;
      if (event.changes.includes("environment-changed")) invalidate();
    },
  });
  const stopEnvironment = sdk.subscribe({
    event:"environment:changed",
    callback:event => {
      if (environmentId && event.id && event.id !== environmentId) return;
      invalidate();
    },
  });
  void refresh();
  return { refresh, stop:() => { controller.abort(); stopThread(); stopEnvironment(); } };
}
