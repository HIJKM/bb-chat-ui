import { headDiffDetail, headDiffSummary, type DetailedWorkspace, type DiffCommit } from "./workspace-diff-pill.ts";

interface Workspace extends DetailedWorkspace {
  checkout?: { kind?:string; headSha?:string | null };
  workingTree:DetailedWorkspace["workingTree"] & { hasUncommittedChanges?:boolean };
  mergeBase?: (NonNullable<DetailedWorkspace["mergeBase"]> & { aheadCount?:number }) | null;
}
interface Reader {
  status(args:{ environmentId:string; signal:AbortSignal; mergeBaseBranch?:string }):Promise<{ outcome:string; workspace?:Workspace; reason?:string; failure?:{ code:string } }>;
  diffFiles(args:{ environmentId:string; target:"uncommitted" }):Promise<{ outcome:string; files:readonly { path:string; additions:number; deletions:number }[]; truncated:boolean }>;
  pullRequest(args:{ environmentId:string; signal:AbortSignal }):Promise<{ outcome:string; pullRequest?:{ state:string; baseRefName:string; headRefName:string } }>;
}
interface Comparison { ref:string | null; count:number | null; commits:readonly DiffCommit[]; remoteBaseMissing:boolean; }
export interface DiffPresentation {
  mode:"working" | "unpushed" | "branch" | "detached";
  visible:boolean;
  branch:string | null;
  branchLabel:string | null;
  label:string;
}

export type WorkspaceDiffSnapshot = NonNullable<Awaited<ReturnType<typeof readWorkspaceDiff>>>;

function nonGit(result:Awaited<ReturnType<Reader["status"]>>):boolean {
  return result.outcome === "not_applicable" && result.reason === "non_git_environment"
    || result.outcome === "unavailable" && result.failure?.code === "not_git_repo";
}

export function branchName(ref:string):string {
  return ref.replace(/^refs\/heads\//, "").replace(/^(?:refs\/remotes\/)?origin\//, "");
}

// Build the pill label from HEAD-relative worktree and remote-commit state.
export function diffPresentation(workspace:Workspace, info:{ main:boolean; count:number | null }):DiffPresentation {
  const name = workspace.branch.currentBranch ? branchName(workspace.branch.currentBranch) : null;
  const dirty = workspace.workingTree.hasUncommittedChanges === true || workspace.workingTree.files.length > 0 || workspace.workingTree.insertions > 0 || workspace.workingTree.deletions > 0;
  const letters = Array.from(name ?? "");
  const branchLabel = dirty || !name ? null : letters.length > 10 ? `${letters.slice(0, 9).join("")}…` : name;
  const mode = dirty ? "working" : info.main ? "unpushed" : name ? "branch" : "detached";
  const { insertions, deletions, files } = headDiffSummary(workspace);
  const label = dirty ? `+${insertions} −${deletions} · ${files} ${files === 1 ? "file" : "files"}${workspace.workingTree.truncated ? " · 일부" : ""}`
    : info.main && info.count !== null && info.count > 0 ? `↑${info.count}`
    : name ? `${branchLabel}${!info.main && info.count !== null && info.count > 0 ? ` · ${info.count} commits` : ""}` : "detached HEAD";
  return { mode, visible:dirty || !!name && (!info.main || info.count !== null && info.count > 0), branch:name, branchLabel, label };
}

// SDK missing-ref results can report zero. Only a resolved ref and the same HEAD
// establish a count; never infer it from the (potentially limited) commit list.
function comparison(result:{ workspace?:Workspace } | undefined, ref:string, workspace:Workspace):Comparison {
  const other = result?.workspace;
  const merge = other?.mergeBase;
  const sameHead = other?.branch.currentBranch === workspace.branch.currentBranch
    && (!workspace.checkout?.headSha || other.checkout?.headSha === workspace.checkout.headSha);
  const resolved = sameHead && merge?.baseRef && merge.mergeBaseBranch === ref && Number.isSafeInteger(merge.aheadCount) && merge.aheadCount! >= 0;
  return { ref:ref.replace(/^refs\/remotes\//, ""), count:resolved ? merge!.aheadCount! : null, commits:resolved ? merge!.commits : [], remoteBaseMissing:sameHead && !merge?.baseRef };
}

// Read a coherent HEAD-relative file snapshot and its remote commit comparisons.
export async function readWorkspaceDiff(sdk:Reader, environmentId:string, baseBranch:string | undefined, signal:AbortSignal) {
  const prQuery = Promise.allSettled([sdk.pullRequest({ environmentId, signal })]);
  const [status, diff] = await Promise.allSettled([
    sdk.status({ environmentId, signal }),
    sdk.diffFiles({ environmentId, target:"uncommitted" }),
  ]);
  if (signal.aborted || status.status !== "fulfilled" || diff.status !== "fulfilled") return null;
  // undefined confirms absence; null leaves a previous coherent snapshot intact.
  if (nonGit(status.value)) return undefined;
  const workspace = status.value.workspace;
  if (!workspace || status.value.outcome !== "available") return null;
  if (diff.value.outcome !== "available") return null;
  const statusFiles = new Map(workspace.workingTree.files.map(file => [file.path, file]));
  const snapshotWorkspace:Workspace = {
    ...workspace,
    workingTree:{
      ...workspace.workingTree,
      insertions:diff.value.files.reduce((total, file) => total + file.additions, 0),
      deletions:diff.value.files.reduce((total, file) => total + file.deletions, 0),
      files:diff.value.files.map(file => ({
        path:file.path,
        status:statusFiles.get(file.path)?.status ?? "?",
        insertions:file.additions,
        deletions:file.deletions,
      })),
      truncated:diff.value.truncated,
    },
  };
  const [prResult] = await prQuery;
  if (signal.aborted) return null;
  const name = snapshotWorkspace.branch.currentBranch ? branchName(snapshotWorkspace.branch.currentBranch) : null;
  const main = name === "main" || name === "master";
  const pr = prResult.status === "fulfilled" && prResult.value.outcome === "available" ? prResult.value.pullRequest : null;
  const activePr = pr && (pr.state === "open" || pr.state === "draft") && name === pr.headRefName;
  const base = branchName(activePr ? pr.baseRefName : baseBranch || snapshotWorkspace.branch.defaultBranch);
  const prRef = `refs/remotes/origin/${main ? name : base}`;
  const pushRef = name ? `refs/remotes/origin/${name}` : null;
  const refs = name ? [...new Set([prRef, pushRef!])] : [];
  const results = await Promise.allSettled(refs.map(mergeBaseBranch => sdk.status({ environmentId, signal, mergeBaseBranch })));
  if (signal.aborted) return null;
  if (results.some(result => result.status === "fulfilled" && nonGit(result.value))) return undefined;
  // Do not publish a partial refresh as a branch-only/zero state. A missing
  // remote ref in an otherwise successful status remains genuinely unknown.
  if (results.some(result => result.status !== "fulfilled"
    || result.value.outcome !== "available" || !result.value.workspace
    || result.value.workspace.branch.currentBranch !== snapshotWorkspace.branch.currentBranch
    || !!snapshotWorkspace.checkout?.headSha && result.value.workspace.checkout?.headSha !== snapshotWorkspace.checkout.headSha)) return null;
  const compare = (ref:string | null):Comparison => {
    if (!ref) return { ref:null, count:null, commits:[], remoteBaseMissing:false };
    const result = results[refs.indexOf(ref)];
    return comparison(result?.status === "fulfilled" ? result.value : undefined, ref, snapshotWorkspace);
  };
  const candidates = compare(name ? prRef : null);
  const unpushed = compare(pushRef);
  const selected = main ? unpushed : candidates;
  return {
    ...headDiffSummary(snapshotWorkspace),
    presentation:diffPresentation(snapshotWorkspace, { main, count:selected.count }),
    detail:{
      ...headDiffDetail(snapshotWorkspace), branch:name, baseRef:selected.ref, commits:selected.commits,
      commitKind:main ? "unpushed" as const : "pr" as const, commitCount:selected.count,
      remoteBaseMissing:selected.remoteBaseMissing,
      unpushedRef:unpushed.ref, unpushedCount:unpushed.count,
    },
  };
}
