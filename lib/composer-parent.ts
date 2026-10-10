export interface ParentThread {
  id: string;
  title: string | null;
  titleFallback: string | null;
  providerId: string;
}

export interface ParentSummary {
  id: string;
  title: string;
  providerId: string;
}

export function parentSummary(
  requestThreadId: string,
  current: { id: string; parentThreadId: string | null },
  parent: ParentThread | null,
): ParentSummary | null {
  if (requestThreadId !== current.id || current.parentThreadId == null || parent == null || parent.id !== current.parentThreadId) return null;
  return { id: parent.id, title: parent.title ?? parent.titleFallback ?? "Parent", providerId: parent.providerId };
}

export function parentEventMatters(changes: readonly string[]): boolean {
  return changes.some(change => change === "title-changed" || change === "thread-deleted");
}

export async function loadParent(
  get: (threadId: string, signal: AbortSignal) => Promise<ParentThread>,
  requestThreadId: string,
  current: { id: string; parentThreadId: string | null },
  signal: AbortSignal,
): Promise<ParentSummary | null> {
  if (requestThreadId !== current.id || current.parentThreadId == null) return null;
  try {
    return parentSummary(requestThreadId, current, await get(current.parentThreadId, signal));
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}
