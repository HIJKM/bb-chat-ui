import test, { beforeEach, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { startWorkspaceDiffRefresh } from "./workspace-diff-refresh.ts";
import type { readWorkspaceDiff } from "./workspace-diff-data.ts";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
beforeEach(t => t.mock.timers.enable({ apis:["Date", "setTimeout"], now:0 }));
async function initialResult(t:TestContext) {
  await tick(); t.mock.timers.tick(500); await tick();
}
function deferred<T>() {
  let resolve!:(value:T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
type StatusResponse = Awaited<ReturnType<Parameters<typeof readWorkspaceDiff>[0]["status"]>>;
function fixture(initialStatus?:() => Promise<StatusResponse>) {
  let environmentId:string | null = 'env_main';
  let count = 3;
  let reads = 0;
  const handlers = new Map<string,(event:{ id:string; changes:string[] }) => void>();
  const output:string[] = [];
  let loadThread = async () => { reads++; return { environmentId }; };
  let loadStatus:(args:{ environmentId:string; mergeBaseBranch?:string }) => Promise<StatusResponse> = initialStatus ?? (async (args:{ environmentId:string; mergeBaseBranch?:string }) => ({ outcome:'available', workspace:{
    branch:{ currentBranch:args.environmentId === 'env_main' ? 'main' : 'feature/chat', defaultBranch:'main' },
    checkout:{ headSha:'head' }, workingTree:{ insertions:0, deletions:0, files:[] },
    mergeBase:{ insertions:0, deletions:0, files:[], commits:[], baseRef:'base', aheadCount:count, mergeBaseBranch:args.mergeBaseBranch ?? 'main' },
  } }));
  const sdk = {
    threads:{ get:() => loadThread() },
    environments:{ get:async () => ({ mergeBaseBranch:'main' }), status:(args:Parameters<typeof loadStatus>[0]) => loadStatus(args), pullRequest:async () => ({ outcome:'absent' }) },
    subscribe:(args:{ event:string; callback:(event:{ id:string; changes:string[] }) => void }) => { handlers.set(args.event,args.callback); return () => { handlers.delete(args.event); }; },
  };
  const running = startWorkspaceDiffRefresh(sdk, 'thread', summary => output.push(summary));
  return { ...running, output, get reads() { return reads; }, sdk,
    emit:(event:string,id:string,changes:string[]) => handlers.get(event)?.({ id, changes }),
    setEnvironment:(id:string | null) => { environmentId = id; }, setCount:(next:number) => { count = next; },
    setStatus:(read:typeof loadStatus) => { loadStatus = read; }, setThread:(read:typeof loadThread) => { loadThread = read; },
    labels:() => output.map(s => s ? JSON.parse(s).presentation.label : '<empty>'),
  };
}

test('message streaming does not reset or refetch a stable main Diff', async t => {
  const f = fixture(); await initialResult(t);
  assert.deepEqual(f.labels(), ['↑3']);
  for (let i=0;i<5;i++) f.emit('thread:changed','thread',['events-appended']);
  await tick();
  assert.deepEqual(f.labels(), ['↑3']);
  assert.equal(f.reads,1);
  f.stop();
});

test('environment refresh retains the previous display until a complete result arrives', async t => {
  const f = fixture(); await initialResult(t);
  const gate = deferred<Awaited<ReturnType<typeof f.sdk.environments.status>>>();
  f.setStatus(() => gate.promise);
  f.emit('environment:changed','env_main',['workspace-changed']); await tick();
  assert.deepEqual(f.labels(), ['↑3']);
  const reads = f.reads;
  f.emit('environment:changed','env_unrelated',['workspace-changed']);
  const response = { outcome:'available', workspace:{ branch:{ currentBranch:'main', defaultBranch:'main' }, checkout:{ headSha:'head' }, workingTree:{ insertions:0,deletions:0,files:[] }, mergeBase:{ insertions:0,deletions:0,files:[],commits:[],baseRef:'base',aheadCount:4,mergeBaseBranch:'refs/remotes/origin/main' } } };
  f.setStatus(async () => response); gate.resolve(response);
  await tick();
  assert.deepEqual(f.labels(), ['↑3','↑4']);
  assert.equal(f.reads,reads,'unrelated environments do not invalidate an in-flight refresh');
  f.stop();
});

test('temporary status failure retains the last good display and detachment clears it only after confirmation', async t => {
  const f = fixture(); await initialResult(t);
  f.setStatus(async () => { throw new Error('temporarily disconnected'); });
  await f.refresh();
  assert.deepEqual(f.labels(), ['↑3']);
  const gate = deferred<{ environmentId:string | null }>();
  f.setThread(() => gate.promise);
  f.emit('thread:changed','thread',['environment-changed']); await tick();
  assert.deepEqual(f.labels(), ['↑3']);
  gate.resolve({ environmentId:null }); await tick();
  assert.deepEqual(f.labels(), ['↑3','<empty>']);
  f.stop();
});

test('in-flight results are discarded when the thread changes environments', async t => {
  const f = fixture(); await initialResult(t);
  const gate = deferred<Awaited<ReturnType<typeof f.sdk.environments.status>>>();
  let first = true;
  const workspace = (id:string) => ({ outcome:'available',workspace:{ branch:{ currentBranch:id === 'env_main' ? 'main' : 'feature/chat',defaultBranch:'main' }, checkout:{ headSha:'head' },workingTree:{ insertions:0,deletions:0,files:[] },mergeBase:{ insertions:0,deletions:0,files:[],commits:[],baseRef:'base',aheadCount:8,mergeBaseBranch:'refs/remotes/origin/main' } } });
  f.setStatus(async args => { if (first) { first=false; return gate.promise; } const w=workspace(args.environmentId); w.workspace.mergeBase.mergeBaseBranch=args.mergeBaseBranch ?? 'main'; return w; });
  const refresh = f.refresh(); await tick();
  f.setEnvironment('env_feature'); f.emit('thread:changed','thread',['environment-changed']);
  gate.resolve(workspace('env_main')); await refresh; await tick();
  assert.deepEqual(f.labels(), ['↑3','feature/c… · 8 commits']);
  f.stop();
  const before=f.output.length; f.emit('environment:changed','env_feature',['workspace-changed']); await f.refresh();
  assert.equal(f.output.length,before,'disposed controllers cannot publish');
});

test('confirmed non-Git environments finish initial loading and clear a previous Git snapshot', async t => {
  for (const response of [
    { outcome:'not_applicable', reason:'non_git_environment' },
    { outcome:'unavailable', failure:{ code:'not_git_repo' } },
  ] satisfies StatusResponse[]) {
    const f = fixture(async () => response); await initialResult(t);
    assert.deepEqual(f.labels(), ['<empty>']);
    f.stop();
    const previous = fixture(); await initialResult(t);
    previous.setStatus(async () => response);
    await previous.refresh();
    assert.deepEqual(previous.labels(), ['↑3','<empty>']);
    previous.stop();
  }
});

test('an initial status error ends loading and the next refresh can recover', async t => {
  const f = fixture(async () => { throw new Error('disconnected'); }); await initialResult(t);
  assert.deepEqual(f.labels(), ['<empty>']);
  f.setStatus(async args => ({ outcome:'available', workspace:{
    branch:{ currentBranch:'main', defaultBranch:'main' }, checkout:{ headSha:'head' },
    workingTree:{ insertions:0,deletions:0,files:[] },
    mergeBase:{ insertions:0,deletions:0,files:[],commits:[],baseRef:'base',aheadCount:2,mergeBaseBranch:args.mergeBaseBranch ?? 'main' },
  } }));
  await f.refresh();
  assert.deepEqual(f.labels(), ['<empty>','↑2']);
  f.stop();
});

test('an unavailable initial workspace also finishes loading without fabricating Git information', async t => {
  const f = fixture(async () => ({ outcome:'unavailable', failure:{ code:'permission_denied' } }));
  await initialResult(t);
  assert.deepEqual(f.labels(), ['<empty>']);
  f.stop();
});

test('first fast results remain loading for 500ms, including empty outcomes, without delaying later refreshes', async t => {
  for (const empty of [true,false]) {
    const f = empty ? fixture(async () => ({ outcome:'not_applicable',reason:'non_git_environment' })) : fixture();
    await tick(); assert.deepEqual(f.output,[]);
    t.mock.timers.tick(499); await tick(); assert.deepEqual(f.output,[]);
    t.mock.timers.tick(1); await tick(); assert.deepEqual(f.labels(),[empty ? '<empty>' : '↑3']);
    await f.refresh(); assert.equal(f.output.length,2,'only the initial result waits'); f.stop();
  }
});

test('stopping or switching environments during the first loading hold cannot publish a stale result', async t => {
  const stopped=fixture(); await tick(); stopped.stop();
  t.mock.timers.tick(500); await tick(); assert.deepEqual(stopped.output,[]);
  const switched=fixture(); await tick(); switched.setEnvironment(null);
  switched.emit('thread:changed','thread',['environment-changed']);
  t.mock.timers.tick(500); await tick(); assert.deepEqual(switched.labels(),['<empty>']); switched.stop();
});

test('a first result taking longer than 500ms does not get an extra loading hold', async t => {
  const gate=deferred<StatusResponse>(); const f=fixture(()=>gate.promise); await tick();
  t.mock.timers.tick(700); gate.resolve({ outcome:'not_applicable',reason:'non_git_environment' });
  await tick(); assert.deepEqual(f.labels(),['<empty>']); f.stop();
});
