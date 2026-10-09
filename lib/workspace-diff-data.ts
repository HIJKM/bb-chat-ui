import { headDiffDetail, headDiffSummary, type DetailedWorkspace, type DiffCommit } from "./workspace-diff-pill.ts";

interface Workspace extends DetailedWorkspace {
  checkout?: { kind?:string; headSha?:string | null };
  workingTree:DetailedWorkspace["workingTree"] & { hasUncommittedChanges?:boolean };
  mergeBase?: (NonNullable<DetailedWorkspace["mergeBase"]> & { aheadCount?:number }) | null;
}
interface Reader {
  status(args:{ environmentId:string; signal:AbortSignal; mergeBaseBranch?:string }):Promise<{ outcome:string; workspace?:Workspace }>;
  pullRequest(args:{ environmentId:string; signal:AbortSignal }):Promise<{ outcome:string; pullRequest?:{ state:string; baseRefName:string; headRefName:string } }>;
}
interface Comparison { ref:string | null; count:number | null; commits:readonly DiffCommit[]; }
export interface DiffPresentation {
  mode:"working" | "unpushed" | "branch" | "detached";
  visible:boolean;
  branch:string | null;
  branchLabel:string | null;
  label:string;
}

export function branchName(ref:string):string {
  return ref.replace(/^refs\/heads\//, "").replace(/^(?:refs\/remotes\/)?origin\//, "");
}

export function diffPresentation(workspace:Workspace, info:{ main:boolean; count:number | null }):DiffPresentation {
  const name = workspace.branch.currentBranch ? branchName(workspace.branch.currentBranch) : null;
  const dirty = workspace.workingTree.hasUncommittedChanges === true || workspace.workingTree.files.length > 0 || workspace.workingTree.insertions > 0 || workspace.workingTree.deletions > 0;
  const letters = Array.from(name ?? "");
  const branchLabel = dirty || !name ? null : letters.length > 16 ? `${letters.slice(0, 15).join("")}…` : name;
  const mode = dirty ? "working" : info.main ? "unpushed" : name ? "branch" : "detached";
  const { insertions, deletions, files } = headDiffSummary(workspace);
  const label = dirty ? `+${insertions} −${deletions} · ${files} ${files === 1 ? "file" : "files"}`
    : info.main && info.count !== null && info.count > 0 ? `↑${info.count}`
    : name ? `${branchLabel}${!info.main && info.count !== null && info.count > 0 ? ` · ${info.count} commits` : ""}` : "detached HEAD";
  return { mode, visible:dirty || !!name && (!info.main || info.count === null || info.count > 0), branch:name, branchLabel, label };
}

// SDK missing-ref results can report zero. Only a resolved ref and the same HEAD
// establish a count; never infer it from the (potentially limited) commit list.
function comparison(result:{ workspace?:Workspace } | undefined, ref:string, workspace:Workspace):Comparison {
  const other = result?.workspace;
  const merge = other?.mergeBase;
  const sameHead = other?.branch.currentBranch === workspace.branch.currentBranch
    && (!workspace.checkout?.headSha || other.checkout?.headSha === workspace.checkout.headSha);
  const resolved = sameHead && merge?.baseRef && merge.mergeBaseBranch === ref && Number.isSafeInteger(merge.aheadCount) && merge.aheadCount! >= 0;
  return { ref:ref.replace(/^refs\/remotes\//, ""), count:resolved ? merge!.aheadCount! : null, commits:resolved ? merge!.commits : [] };
}

export async function readWorkspaceDiff(sdk:Reader, environmentId:string, baseBranch:string | undefined, signal:AbortSignal) {
  const [status, prResult] = await Promise.allSettled([
    sdk.status({ environmentId, signal }), sdk.pullRequest({ environmentId, signal }),
  ]);
  if (signal.aborted || status.status !== "fulfilled") return null;
  const workspace = status.value.workspace;
  if (!workspace || status.value.outcome !== "available") return null;
  const name = workspace.branch.currentBranch ? branchName(workspace.branch.currentBranch) : null;
  const main = name === "main" || name === "master";
  const pr = prResult.status === "fulfilled" && prResult.value.outcome === "available" ? prResult.value.pullRequest : null;
  const activePr = pr && (pr.state === "open" || pr.state === "draft") && name === pr.headRefName;
  const base = branchName(activePr ? pr.baseRefName : baseBranch || workspace.branch.defaultBranch);
  const prRef = `refs/remotes/origin/${main ? name : base}`;
  const pushRef = name ? `refs/remotes/origin/${name}` : null;
  const refs = name ? [...new Set([prRef, pushRef!])] : [];
  const results = await Promise.allSettled(refs.map(mergeBaseBranch => sdk.status({ environmentId, signal, mergeBaseBranch })));
  if (signal.aborted) return null;
  const compare = (ref:string | null):Comparison => {
    if (!ref) return { ref:null, count:null, commits:[] };
    const result = results[refs.indexOf(ref)];
    return comparison(result?.status === "fulfilled" ? result.value : undefined, ref, workspace);
  };
  const candidates = compare(name ? prRef : null);
  const unpushed = compare(pushRef);
  const selected = main ? unpushed : candidates;
  return {
    ...headDiffSummary(workspace),
    presentation:diffPresentation(workspace, { main, count:selected.count }),
    detail:{
      ...headDiffDetail(workspace), branch:name, baseRef:selected.ref, commits:selected.commits,
      commitKind:main ? "unpushed" as const : "pr" as const, commitCount:selected.count,
      unpushedRef:unpushed.ref, unpushedCount:unpushed.count,
    },
  };
}
