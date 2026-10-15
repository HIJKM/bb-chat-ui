export const infoKinds = [
  { key: "diff", icon: "GitBranch", setting: "showDiff", label: "Code Diff", default: true },
  { key: "children", icon: "UserRound", setting: "showChildren", label: "Child Thread", default: true },
  { key: "subagents", icon: "bb-chat-ui-subagent", setting: "showSubagents", label: "서브에이전트", default: true },
  { key: "plan", icon: "FileText", setting: "showPlan", label: "Plan", default: true },
  { key: "goal", icon: "Target", setting: "showGoal", label: "Goal", default: true },
  { key: "todos", icon: "ListTodo", setting: "showTodos", label: "할 일", default: true },
  { key: "workflow", icon: "Workflow", setting: "showWorkflow", label: "Workflow", default: true },
  { key: "background", icon: "Terminal", setting: "showBackground", label: "백그라운드 작업", default: true },
  { key: "queue", icon: "bb-chat-ui-queue", setting: "showQueue", label: "대기 메시지", default: true },
  { key: "annotations", icon: "MessageSquarePlus", setting: "showAnnotations", label: "Agentation", default: true },
  { key: "pullRequest", icon: "GitPullRequest", setting: "showPullRequest", label: "Pull request", default: true },
  { key: "parent", icon: "MessageSquare", setting: "showParent", label: "Parent", default: true },
  { key: "machine", icon: "Laptop", setting: "showMachine", label: "실행 환경", default: true },
  { key: "fallback", icon: "AlertTriangle", setting: "showFallback", label: "Model fallback", default: true },
  { key: "status", icon: "bb-chat-ui-status", setting: "showStatus", label: "스레드 상태", default: true },
  { key: "other", icon: "Info", setting: "showOther", label: "기타 플러그인 정보", default: true },
] as const;

export type InfoKind = typeof infoKinds[number]["key"];
export const infoSettingsNotice = "상단 표시는 활동이 있을 때 pill로 표시합니다. 내용이 없거나 공간이 부족하면 아이콘 스택에 들어갑니다. 스택은 최대 3개와 +N을 표시하며, 접힌 활성 정보는 앞쪽에 배치하고 점으로 표시합니다. 목록에만 표시는 스택과 전체 목록에서 열 수 있고, 끄기는 모든 곳에서 숨깁니다. 입력 요청 중에는 요청만 표시합니다.";
export const composerInfoSettings = Object.fromEntries(infoKinds.map(kind => [kind.setting, {
  type: "select" as const,
  label: kind.label,
  description: kind.key === "diff" ? infoSettingsNotice : undefined,
  options: ["상단 표시", "목록에만 표시", "끄기"],
  default: kind.default ? "상단 표시" : "목록에만 표시",
}]));

// Boolean values can still arrive from a frontend loaded before the settings upgrade.
export function exposedInfo(values: Record<string, unknown> = {}): InfoKind[] {
  return infoKinds.filter(kind => {
    const value = values[kind.setting];
    if (typeof value === "boolean") return value;
    if (value === "상단 표시") return true;
    if (value === "목록에만 표시" || value === "끄기") return false;
    return kind.default;
  }).map(kind => kind.key);
}

export function listedInfo(values: Record<string, unknown> = {}): InfoKind[] {
  return infoKinds.filter(kind => values[kind.setting] !== "끄기").map(kind => kind.key);
}

// Off stops dedicated SDK work; catalog-only and legacy checkbox false stay readable.
export function composerInfoReads(values:Record<string,unknown> = {}) {
  const listed=listedInfo(values);
  return {
    timeline:listed.some(kind=>kind==="plan" || kind==="goal" || kind==="todos"),
    children:listed.includes("children"), parent:listed.includes("parent"),
    queue:listed.includes("queue"), pullRequest:listed.includes("pullRequest"),
  };
}
