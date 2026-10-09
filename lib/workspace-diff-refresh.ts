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
  const startedAt = Date.now();
  const refresh = async () => {
    if (signal.aborted) return;
    if (fetching) { pending = true; return; }
    fetching = true;
    const current = revision;
    const stale = () => signal.aborted || current !== revision;
    const update = async (summary:string) => {
      if (stale()) return;
      const remaining = published ? 0 : 500 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise<void>(resolve => {
        const finish = () => { clearTimeout(timer); signal.removeEventListener("abort",finish); resolve(); };
        const timer = setTimeout(finish,remaining);
        signal.addEventListener("abort",finish,{ once:true });
      });
      if (stale()) return;
      published = true; publish(summary);
    };
    try {
      if (contextDirty) {
        const thread = await sdk.threads.get({ threadId, signal });
        if (stale()) return;
        const id = thread.environmentId;
        if (!id) { environmentId = null; await update(""); return; }
        const environment = await sdk.environments.get({ environmentId:id, signal });
        if (stale()) return;
        environmentId = id;
        mergeBaseBranch = environment.mergeBaseBranch || undefined;
        contextDirty = false;
      }
      if (!environmentId) return;
      const result = await readWorkspaceDiff(sdk.environments, environmentId, mergeBaseBranch, signal);
      if (!stale()) {
        if (result) await update(JSON.stringify(result));
        else if (result === undefined || !published) await update("");
      }
    } catch {
      // Keep the last summary during a temporary disconnect.
      if (!stale() && !published) await update("");
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
