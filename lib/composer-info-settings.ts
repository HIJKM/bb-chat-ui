export const infoKinds = [
  { key: "diff", setting: "showDiff", label: "Code Diff", default: true },
  { key: "children", setting: "showChildren", label: "Child Thread", default: true },
  { key: "plan", setting: "showPlan", label: "Plan", default: false },
  { key: "goal", setting: "showGoal", label: "Goal", default: false },
  { key: "todos", setting: "showTodos", label: "할 일", default: false },
  { key: "workflow", setting: "showWorkflow", label: "Workflow", default: false },
  { key: "background", setting: "showBackground", label: "백그라운드 작업", default: false },
  { key: "queue", setting: "showQueue", label: "대기 메시지", default: false },
  { key: "annotations", setting: "showAnnotations", label: "Agentation", default: false },
  { key: "pullRequest", setting: "showPullRequest", label: "Pull request", default: false },
  { key: "parent", setting: "showParent", label: "상위 스레드", default: false },
  { key: "machine", setting: "showMachine", label: "실행 환경", default: false },
  { key: "fallback", setting: "showFallback", label: "Model fallback", default: false },
  { key: "status", setting: "showStatus", label: "스레드 상태", default: false },
  { key: "other", setting: "showOther", label: "기타 플러그인 정보", default: false },
] as const;

export type InfoKind = typeof infoKinds[number]["key"];
export const infoSettingsNotice = "각 정보의 표시 방식을 선택하세요. 상단 표시는 공간이 부족하면 자동으로 전체 정보 버튼 안에 접힙니다. 목록에만 표시는 현재 정보가 없어도 목록에 남습니다. 끄기는 상단과 목록에서 모두 숨깁니다. 입력 요청 중에는 요청만 표시합니다.";
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
