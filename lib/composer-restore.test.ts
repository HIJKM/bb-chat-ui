import test from 'node:test';
import assert from 'node:assert/strict';
import { createThreadRestorer, type RestoreState } from './composer-restore.ts';

test('restore calls the public thread action once while pending and permits retry after failure', async () => {
  const states:RestoreState[]=[];
  const calls:string[]=[];
  let reject:(error:Error)=>void=()=>{};
  const restore=createThreadRestorer({
    unarchive:({threadId})=>{calls.push(`unarchive:${threadId}`); return new Promise((_resolve,fail)=>{reject=fail;});},
    restoreEnvironment:async ({threadId})=>{calls.push(`environment:${threadId}`);},
  },state=>states.push(state));
  const pending=restore('thread-a','unarchive');
  await restore('thread-a','unarchive');
  await restore('thread-a','environment');
  assert.deepEqual(calls,['unarchive:thread-a']);
  assert.deepEqual(states,[{threadId:'thread-a',pending:true,error:null}]);
  reject(new Error('Provider failed')); await pending;
  assert.deepEqual(states.at(-1),{threadId:'thread-a',pending:false,error:'Provider failed'});
  await restore('thread-a','environment');
  assert.deepEqual(calls,['unarchive:thread-a','environment:thread-a']);
  assert.deepEqual(states.at(-1),{threadId:'thread-a',pending:false,error:null});
});

test('pending restore does not block another thread or send a message', async () => {
  const calls:string[]=[];
  let finish:()=>void=()=>{};
  const restore=createThreadRestorer({
    unarchive:({threadId})=>{calls.push(threadId); return new Promise<void>(resolve=>{finish=resolve;});},
    restoreEnvironment:async ({threadId})=>{calls.push(threadId);},
  },()=>{});
  const pending=restore('thread-a','unarchive');
  await restore('thread-b','environment');
  assert.deepEqual(calls,['thread-a','thread-b']);
  finish(); await pending;
});
