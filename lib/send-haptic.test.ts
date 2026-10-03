import assert from "node:assert/strict";
import test from "node:test";

import {
  IDLE_SEND_HAPTIC,
  injectSendHaptic,
  postSendHaptic,
  readHapticBridge,
  reduceSendHaptic,
} from "./send-haptic.ts";

test("pulses once when a pressed send finishes", () => {
  const pressed = reduceSendHaptic(IDLE_SEND_HAPTIC, "press");
  assert.equal(pressed.pulse, false);
  const busy = reduceSendHaptic(pressed.state, "busy");
  assert.equal(busy.pulse, false);
  const done = reduceSendHaptic(busy.state, "idle");
  assert.equal(done.pulse, true);
  assert.equal(reduceSendHaptic(done.state, "timeout").pulse, false);
});

test("pulses when the press finishes without a busy flag", () => {
  const pressed = reduceSendHaptic(IDLE_SEND_HAPTIC, "press");
  const done = reduceSendHaptic(pressed.state, "timeout");
  assert.equal(done.pulse, true);
  assert.equal(reduceSendHaptic(done.state, "idle").pulse, false);
});

test("stays quiet until the send button is pressed", () => {
  assert.equal(reduceSendHaptic(IDLE_SEND_HAPTIC, "idle").pulse, false);
  assert.equal(reduceSendHaptic(IDLE_SEND_HAPTIC, "timeout").pulse, false);
  assert.equal(reduceSendHaptic(IDLE_SEND_HAPTIC, "busy").pulse, false);
});

test("posts a success haptic only when the shell can buzz", () => {
  const messages: unknown[] = [];
  const bridge = {
    capabilities: ["haptic"],
    post(message: unknown) {
      messages.push(message);
    },
  };
  assert.equal(postSendHaptic(bridge), true);
  assert.deepEqual(messages, [{ type: "haptic", kind: "success" }]);
  assert.equal(postSendHaptic(null), false);
  assert.equal(
    postSendHaptic({
      capabilities: ["badge"],
      post() {},
    }),
    false,
  );
  assert.deepEqual(messages, [{ type: "haptic", kind: "success" }]);
});

test("reads the native bridge from the page", () => {
  const native = { capabilities: ["haptic"], post() {} };
  assert.equal(readHapticBridge({ bb: { native } }), native);
  assert.equal(readHapticBridge({}), null);
  assert.equal(readHapticBridge({ bb: { native: {} } }), null);
});

test("removes the send listeners when the script stops", () => {
  let observed = false;
  let disconnected = false;
  const originalObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    observe() {
      observed = true;
    }
    disconnect() {
      disconnected = true;
    }
    takeRecords() {
      return [];
    }
  } as unknown as typeof MutationObserver;

  const listeners = new Map<string, Array<(event: Event) => void>>();
  const document = {
    body: {},
    defaultView: {
      setTimeout() {
        return 1;
      },
      clearTimeout() {},
    },
    addEventListener(type: string, listener: (event: Event) => void) {
      const bucket = listeners.get(type) ?? [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      const bucket = listeners.get(type) ?? [];
      listeners.set(
        type,
        bucket.filter((item) => item !== listener),
      );
    },
  };

  try {
    const cleanup = injectSendHaptic(document as unknown as Document);
    cleanup();
  } finally {
    globalThis.MutationObserver = originalObserver;
  }

  assert.equal(observed, true);
  assert.equal(disconnected, true);
  assert.deepEqual([...listeners.values()].flat(), []);
});
