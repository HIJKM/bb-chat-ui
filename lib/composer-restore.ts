export interface RestoreState { threadId:string; pending:boolean; error:string|null; }

export function createThreadRestorer(threads: {
  unarchive(args:{threadId:string}):Promise<unknown>;
  restoreEnvironment(args:{threadId:string}):Promise<unknown>;
}, report:(state:RestoreState)=>void) {
  const pending=new Set<string>();
  return async (threadId:string, kind:'unarchive'|'environment') => {
    if (pending.has(threadId)) return;
    pending.add(threadId); report({threadId,pending:true,error:null});
    let error:string|null=null;
    try {
      if (kind==='unarchive') await threads.unarchive({threadId});
      else await threads.restoreEnvironment({threadId});
    } catch (cause) { error=cause instanceof Error ? cause.message : String(cause); }
    finally { pending.delete(threadId); report({threadId,pending:false,error}); }
  };
}
