import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountDeviceRoot } from './device-root.ts';
import { PHONE_NARROW, ROOMY_VIEWPORT, SMALL_HIT_TARGET } from './device-chrome.ts';
import type { DeviceChrome } from './device.ts';

const phone: DeviceChrome = { device:'phone', orientation:'portrait', viewport:'narrow', hitTarget:'large', chromeFamily:'mobile' };
const desktop: DeviceChrome = { device:'desktop', orientation:'landscape', viewport:'narrow', hitTarget:'small', chromeFamily:'desktop' };

test('root CSS keeps phone identity separate from narrow desktop and follows rotation', () => {
  const dom = new JSDOM(''); const document = dom.window.document;
  const lease = mountDeviceRoot(document, phone);
  assert.ok(document.documentElement.matches(PHONE_NARROW));
  assert.equal(document.documentElement.matches(SMALL_HIT_TARGET), false);
  lease.update({...phone, orientation:'landscape', viewport:'medium'});
  assert.ok(document.documentElement.matches(ROOMY_VIEWPORT));
  assert.equal(document.documentElement.matches(PHONE_NARROW), false);
  assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'), 'phone');
  lease.update(desktop);
  assert.equal(document.documentElement.matches(PHONE_NARROW), false);
  assert.ok(document.documentElement.matches(SMALL_HIT_TARGET));
  lease.dispose(); dom.window.close();
});

test('same helper result writes no attributes; bridge handoff retains values; last unload restores attributes', async () => {
  const dom = new JSDOM(''); const document = dom.window.document;
  document.documentElement.setAttribute('data-bb-chat-ui-root-device','previous');
  const first = mountDeviceRoot(document,phone);
  let writes=0; const observer = new dom.window.MutationObserver(records => writes += records.length);
  observer.observe(document.documentElement, {attributes:true});
  first.update({...phone}); await Promise.resolve(); assert.equal(writes,0);
  const second = mountDeviceRoot(document,phone); first.dispose();
  await Promise.resolve(); assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'),'phone');
  second.dispose();
  assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'),'phone','no gap before a replacement bridge mounts');
  const third = mountDeviceRoot(document,phone); await Promise.resolve();
  assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'),'phone');
  third.dispose(); await Promise.resolve();
  assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'),'previous');
  assert.equal(document.documentElement.hasAttribute('data-bb-chat-ui-root-viewport'),false);
  third.update(desktop); assert.equal(document.documentElement.getAttribute('data-bb-chat-ui-root-device'),'previous');
  observer.disconnect(); dom.window.close();
});
