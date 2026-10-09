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
export const infoSettingsNotice = "컴포저 위에 꺼내 둘 정보를 선택하세요. 공간이 부족하면 일부가 자동으로 전체 정보 버튼 안에 접힙니다. 선택하지 않은 정보도 그 버튼에서 모두 열 수 있습니다. 입력 요청 중에는 요청만 표시합니다.";
export const composerInfoSettings = Object.fromEntries(infoKinds.map(kind => [kind.setting, {
  type: "boolean" as const,
  label: `상단 표시 · ${kind.label}`,
  description: kind.key === "diff" ? infoSettingsNotice : undefined,
  default: kind.default,
}]));

export function exposedInfo(values: Record<string, unknown> = {}): InfoKind[] {
  return infoKinds.filter(kind => typeof values[kind.setting] === "boolean"
    ? values[kind.setting] : kind.default).map(kind => kind.key);
}
