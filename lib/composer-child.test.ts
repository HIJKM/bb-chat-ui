import test from 'node:test';
import assert from 'node:assert/strict';
import { childInitial, childState } from './composer-child.ts';

test('child avatars abbreviate actual titles and reflect pending input before activity', () => {
  assert.equal(childInitial('UI review'), 'UI');
  assert.equal(childInitial('Queue check'), 'QC');
  assert.equal(childInitial('코드 검토'), '코검');
  assert.equal(childInitial(''), '↗');
  assert.equal(childState('active', true), 'wait');
  assert.equal(childState('active', false), 'run');
  assert.equal(childState('idle', false), 'done');
  assert.equal(childState('error', false), 'error');
});
