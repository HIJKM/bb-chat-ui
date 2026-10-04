import assert from "node:assert/strict";
import test from "node:test";

import {
  IDLE_SEND_HAPTIC,
  acceptJumpPulse,
  injectSendHaptic,
  isFileDiffBlockToggle,
  postHaptic,
  postSendHaptic,
  readHapticBridge,
  hasNewAssistantOutput,
  openResponseWatch,
  isStopRunButton,
  reduceResponseWatch,
  reduceSendHaptic,
  shineMeansAgentResponse,
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

test("posts a soft selection haptic only when the shell can buzz", () => {
  const messages: unknown[] = [];
  const bridge = {
    capabilities: ["haptic"],
    post(message: unknown) {
      messages.push(message);
    },
  };
  assert.equal(postSendHaptic(bridge), true);
  assert.deepEqual(messages, [{ type: "haptic", kind: "selection" }]);
  assert.equal(postSendHaptic(null), false);
  assert.equal(
    postSendHaptic({
      capabilities: ["badge"],
      post() {},
    }),
    false,
  );
  assert.deepEqual(messages, [{ type: "haptic", kind: "selection" }]);
});

test("stays quiet when assistant text appears and pulses when the response ends", () => {
  assert.equal(hasNewAssistantOutput(["old"], new Set(["old"])), false);
  assert.equal(hasNewAssistantOutput(["old", "new"], new Set(["old"])), true);
  assert.deepEqual(
    openResponseWatch({ respondingAtPress: false, hasNewOutput: false }),
    { phase: "wait-output", sawWorking: false, pulse: null },
  );
  assert.deepEqual(
    openResponseWatch({ respondingAtPress: true, hasNewOutput: true }),
    { phase: "wait-finish", sawWorking: true, pulse: null },
  );
  const workingOnly = reduceResponseWatch(
    { phase: "wait-output", sawWorking: false },
    true,
    false,
  );
  assert.equal(workingOnly.pulse, null);
  assert.deepEqual(workingOnly.watch, {
    phase: "wait-output",
    sawWorking: true,
  });
  const started = reduceResponseWatch(
    { phase: "wait-output", sawWorking: true },
    true,
    true,
  );
  assert.equal(started.pulse, null);
  assert.deepEqual(started.watch, { phase: "wait-finish", sawWorking: true });
  const finished = reduceResponseWatch(
    { phase: "wait-finish", sawWorking: true },
    false,
    true,
  );
  assert.equal(finished.pulse, "finish");
  assert.equal(finished.watch, null);
  assert.deepEqual(
    reduceResponseWatch({ phase: "wait-finish", sawWorking: true }, true, true),
    { watch: { phase: "wait-finish", sawWorking: true }, pulse: null },
  );
});

test("reads only a visible working or thinking label as the agent response", () => {
  assert.equal(shineMeansAgentResponse("Working...", []), true);
  assert.equal(shineMeansAgentResponse("Thinking…", ["1"]), true);
  assert.equal(shineMeansAgentResponse("Working...", ["1", "0"]), false);
  assert.equal(shineMeansAgentResponse("Provisioning thread...", []), false);
  assert.equal(shineMeansAgentResponse("Background work running", []), false);
  assert.equal(shineMeansAgentResponse(null, []), false);
});

test("pulses a light impact for the jump button, once per press", () => {
  const messages: unknown[] = [];
  const bridge = {
    capabilities: ["haptic"],
    post(message: unknown) {
      messages.push(message);
    },
  };
  assert.equal(postHaptic(bridge, "impact-light"), true);
  assert.deepEqual(messages, [{ type: "haptic", kind: "impact-light" }]);
  assert.equal(acceptJumpPulse(null, 1000), 1000);
  assert.equal(acceptJumpPulse(1000, 1100), null);
  assert.equal(acceptJumpPulse(1000, 1400), 1400);
});

test("recognizes the composer stop button", () => {
  const stop = pressable("Stop run", null, false);
  const icon = { closest: (selector: string) => (selector === "button" ? stop : null) };
  assert.equal(isStopRunButton(stop), true);
  assert.equal(isStopRunButton(icon), true);
  assert.equal(isStopRunButton(pressable("Stop run", null, true)), false);
  assert.equal(isStopRunButton(pressable("Stop and transcribe recording", null, false)), false);
  assert.equal(isStopRunButton(pressable("Send", null, false)), false);
  assert.equal(isStopRunButton(null), false);
});

test("buzzes once when the stop button is pressed", () => {
  const messages: unknown[] = [];
  const listeners = new Map<string, Array<(event: Event) => void>>();
  const document = {
    body: {},
    defaultView: {
      bb: {
        native: {
          capabilities: ["haptic"],
          post(message: unknown) {
            messages.push(message);
          },
        },
      },
      performance: { now: () => 1000 },
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
    removeEventListener() {},
  };
  const originalObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof MutationObserver;

  try {
    const cleanup = injectSendHaptic(document as unknown as Document);
    const stop = pressable("Stop run", null, false);
    const click = listeners.get("click")?.[0];
    const pointerup = listeners.get("pointerup")?.[0];
    click?.({ target: stop } as unknown as Event);
    pointerup?.({
      target: stop,
      pointerType: "touch",
      isPrimary: true,
      clientX: 10,
      clientY: 10,
    } as unknown as Event);
    assert.deepEqual(messages, [{ type: "haptic", kind: "selection" }]);
    cleanup();
  } finally {
    globalThis.MutationObserver = originalObserver;
  }
});

test("recognizes a file diff code block toggle", () => {
  const toggle = pressable("Collapse src/app.ts", "true", false);
  const icon = { closest: (selector: string) => (selector === "button" ? toggle : null) };
  assert.equal(isFileDiffBlockToggle(toggle), true);
  assert.equal(isFileDiffBlockToggle(icon), true);
  assert.equal(isFileDiffBlockToggle(pressable("Expand src/app.ts", "false", false)), true);
  assert.equal(isFileDiffBlockToggle(pressable("Collapse src/app.ts", "true", true)), false);
  assert.equal(isFileDiffBlockToggle(pressable("Expand all files", null, false)), false);
  assert.equal(
    isFileDiffBlockToggle(pressable("src/app.ts has no changes to expand", null, true)),
    false,
  );
  assert.equal(isFileDiffBlockToggle(null), false);
});

test("buzzes once when a file diff block is toggled", () => {
  const messages: unknown[] = [];
  const listeners = new Map<string, Array<(event: Event) => void>>();
  const document = {
    body: {},
    defaultView: {
      bb: {
        native: {
          capabilities: ["haptic"],
          post(message: unknown) {
            messages.push(message);
          },
        },
      },
      performance: { now: () => 1000 },
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
    removeEventListener() {},
  };
  const originalObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof MutationObserver;

  try {
    const cleanup = injectSendHaptic(document as unknown as Document);
    const toggle = pressable("Expand src/app.ts", "false", false);
    const click = listeners.get("click")?.[0];
    const pointerup = listeners.get("pointerup")?.[0];
    click?.({ target: toggle } as unknown as Event);
    pointerup?.({ target: toggle, pointerType: "touch", isPrimary: true } as unknown as Event);
    assert.deepEqual(messages, [{ type: "haptic", kind: "impact-light" }]);
    cleanup();
  } finally {
    globalThis.MutationObserver = originalObserver;
  }
});

function pressable(label: string | null, expanded: string | null, disabled: boolean) {
  const button = {
    getAttribute(name: string) {
      if (name === "aria-label") return label;
      if (name === "aria-expanded") return expanded;
      if (name === "disabled") return disabled ? "" : null;
      return null;
    },
    closest(selector: string) {
      return selector === "button" ? button : null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 40, bottom: 40 };
    },
  };
  return button;
}

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
