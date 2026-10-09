export type ChildState = "run" | "wait" | "done" | "error";
export interface ChildSummary { id:string; title:string; state?:ChildState; running?:boolean; }

export function childInitial(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "↗";
  if (words[0].length <= 2 && /^[a-z\d]+$/i.test(words[0])) return words[0].toUpperCase();
  return (words.length > 1 ? Array.from(words[0])[0] + Array.from(words[1])[0] : Array.from(words[0]).slice(0, 2).join("")).toUpperCase();
}

export function childState(status: string, needsInput: boolean): ChildState {
  if (needsInput || status === "waiting-for-host") return "wait";
  if (status === "error") return "error";
  return status === "idle" ? "done" : "run";
}
