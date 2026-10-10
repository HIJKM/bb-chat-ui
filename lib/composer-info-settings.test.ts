import test from 'node:test';
import assert from 'node:assert/strict';
import { composerInfoSettings, exposedInfo, infoKinds, infoLayout, listedInfo } from './composer-info-settings.ts';

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

test('the all-information layout defaults to the right capsule and accepts only the two approved choices', () => {
  const descriptor = composerInfoSettings.infoButtonLayout;
  assert.equal(descriptor.type, 'select');
  assert.equal(descriptor.label, '전체 정보 버튼 배치');
  assert.deepEqual(descriptor.options, ['오른쪽 캡슐','가운데 최신으로']);
  assert.equal(descriptor.default, '오른쪽 캡슐');
  assert.match(descriptor.description ?? '', /맨 아래로/);
  assert.equal(Object.keys(composerInfoSettings)[0], 'infoButtonLayout', 'the layout choice is listed before the per-family visibility');
  assert.equal(infoLayout(), 'dock');
  assert.equal(infoLayout({ infoButtonLayout:'오른쪽 캡슐' }), 'dock');
  assert.equal(infoLayout({ infoButtonLayout:'가운데 최신으로' }), 'center');
  for (const value of ['꼬리', 'center', true, 3, null]) assert.equal(infoLayout({ infoButtonLayout:value }), 'dock', String(value));
});
