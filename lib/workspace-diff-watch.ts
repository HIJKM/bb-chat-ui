import { startWorkspaceDiffRefresh } from "./workspace-diff-refresh.ts";

type View = Pick<Window,"addEventListener"|"removeEventListener"|"setInterval"|"clearInterval"> & {
  document:Pick<Document,"visibilityState">;
};

export function watchWorkspaceDiff(
  sdk:Parameters<typeof startWorkspaceDiffRefresh>[0], threadId:string, publish:Parameters<typeof startWorkspaceDiffRefresh>[2], view:View, enabled:boolean,
):()=>void {
  if (!enabled) { publish(null); return ()=>{}; }
  const {refresh,stop}=startWorkspaceDiffRefresh(sdk,threadId,publish);
  const onFocus=()=>{void refresh(true);};
  view.addEventListener("focus",onFocus);
  const timer=view.setInterval(()=>{
    if (view.document.visibilityState!=="hidden") void refresh();
  },5000);
  return ()=>{stop();view.removeEventListener("focus",onFocus);view.clearInterval(timer);};
}
