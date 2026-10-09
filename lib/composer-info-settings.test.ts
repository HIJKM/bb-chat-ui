import test from 'node:test';
import assert from 'node:assert/strict';
import { composerInfoSettings, exposedInfo, infoKinds, listedInfo } from './composer-info-settings.ts';

test('visibility supports top, catalog-only and off while retaining legacy checkbox choices', () => {
  assert.deepEqual(exposedInfo(), ['diff','children']);
  assert.deepEqual(listedInfo(), infoKinds.map(kind => kind.key));
  const values = { showDiff:'목록에만 표시', showChildren:'끄기', showGoal:'상단 표시', showWorkflow:'끄기' };
  assert.deepEqual(exposedInfo(values), ['goal']);
  assert.ok(listedInfo(values).includes('diff'));
  assert.ok(!listedInfo(values).includes('children'));
  assert.ok(!listedInfo(values).includes('workflow'));
  assert.deepEqual(exposedInfo({ showDiff:false, showGoal:true }), ['children','goal']);
  assert.ok(listedInfo({ showDiff:false }).includes('diff'));
  assert.deepEqual(exposedInfo({ showDiff:'invalid' }), ['diff','children']);
  for (const kind of infoKinds) {
    const descriptor = composerInfoSettings[kind.setting];
    assert.equal(descriptor.type, 'select');
    assert.deepEqual(descriptor.options, ['상단 표시','목록에만 표시','끄기']);
  }
  assert.equal(composerInfoSettings.showEmptyIcons.type, 'boolean');
  assert.equal(composerInfoSettings.showEmptyIcons.default, false);
});
