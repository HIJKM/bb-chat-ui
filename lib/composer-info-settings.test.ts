import test from 'node:test';
import assert from 'node:assert/strict';
import { composerInfoSettings, exposedInfo, infoKinds, listedInfo } from './composer-info-settings.ts';

test('visibility supports top, catalog-only and off while retaining legacy checkbox choices', () => {
  const keys = infoKinds.map(kind => kind.key);
  assert.deepEqual(exposedInfo(), keys);
  assert.deepEqual(listedInfo(), infoKinds.map(kind => kind.key));
  const values = { showDiff:'목록에만 표시', showChildren:'끄기', showGoal:'상단 표시', showWorkflow:'끄기' };
  assert.deepEqual(exposedInfo(values), keys.filter(key => !['diff','children','workflow'].includes(key)));
  assert.ok(listedInfo(values).includes('diff'));
  assert.ok(!listedInfo(values).includes('children'));
  assert.ok(!listedInfo(values).includes('workflow'));
  assert.deepEqual(exposedInfo({ showDiff:false, showGoal:true }), keys.filter(key => key !== 'diff'));
  assert.ok(listedInfo({ showDiff:false }).includes('diff'));
  assert.deepEqual(exposedInfo({ showDiff:'invalid' }), keys);
  for (const kind of infoKinds) {
    const descriptor = composerInfoSettings[kind.setting];
    assert.equal(descriptor.type, 'select');
    assert.equal(descriptor.default, '상단 표시');
    assert.deepEqual(descriptor.options, ['상단 표시','목록에만 표시','끄기']);
  }
  assert.equal(composerInfoSettings.showEmptyIcons.type, 'boolean');
  assert.equal(composerInfoSettings.showEmptyIcons.default, false);
});

test('chat ui settings omit the latest layout choice and ignore a stored value', () => {
  assert.equal(Object.hasOwn(composerInfoSettings, 'infoButtonLayout'), false);
  assert.equal(Object.keys(composerInfoSettings)[0], 'showDiff');
  const keys = infoKinds.map(kind => kind.key);
  assert.deepEqual(exposedInfo({ infoButtonLayout:'오른쪽 캡슐', showDiff:'끄기' }), keys.filter(key => key !== 'diff'));
  assert.equal(listedInfo({ infoButtonLayout:'오른쪽 캡슐', showDiff:'끄기' }).includes('diff'), false);
  assert.equal(listedInfo({ infoButtonLayout:'가운데 최신으로' }).length, keys.length);
});
