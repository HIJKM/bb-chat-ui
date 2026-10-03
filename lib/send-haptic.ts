const SEND_BUTTON = "[data-promptbox-submit-action][type='submit']";
const JUMP_BUTTON = 'button[aria-label="Scroll to latest event"]';
const WAIT_MS = 80;
const JUMP_GAP_MS = 400;

export type HapticKind = "success" | "impact-light";

export interface SendHapticState {
  armed: boolean;
  sawBusy: boolean;
}

export type SendHapticEvent = "press" | "busy" | "idle" | "timeout";

export const IDLE_SEND_HAPTIC: SendHapticState = {
  armed: false,
  sawBusy: false,
};

export interface HapticBridge {
  post(message: unknown): void;
  capabilities?: readonly string[];
}

export function reduceSendHaptic(
  state: SendHapticState,
  event: SendHapticEvent,
): { state: SendHapticState; pulse: boolean } {
  if (event === "press") {
    return { state: { armed: true, sawBusy: false }, pulse: false };
  }
  if (!state.armed) return { state, pulse: false };
  if (event === "busy") {
    return { state: { armed: true, sawBusy: true }, pulse: false };
  }
  if (event === "idle") {
    if (!state.sawBusy) return { state, pulse: false };
    return { state: IDLE_SEND_HAPTIC, pulse: true };
  }
  if (state.sawBusy) return { state, pulse: false };
  return { state: IDLE_SEND_HAPTIC, pulse: true };
}

export function postHaptic(
  bridge: HapticBridge | null,
  kind: HapticKind,
): boolean {
  if (!bridge?.capabilities?.includes("haptic")) return false;
  bridge.post({ type: "haptic", kind });
  return true;
}

export function postSendHaptic(bridge: HapticBridge | null): boolean {
  return postHaptic(bridge, "success");
}

export function acceptJumpPulse(lastAt: number | null, now: number): number | null {
  if (lastAt !== null && now - lastAt < JUMP_GAP_MS) return null;
  return now;
}

export function readHapticBridge(root: unknown): HapticBridge | null {
  if (typeof root !== "object" || root === null) return null;
  const native = (root as { bb?: { native?: Partial<HapticBridge> } }).bb
    ?.native;
  if (!native || typeof native.post !== "function") return null;
  return native as HapticBridge;
}

export function injectSendHaptic(document: Document): () => void {
  let state = IDLE_SEND_HAPTIC;
  let armedButton: HTMLButtonElement | null = null;
  let timer: number | null = null;
  let lastJumpAt: number | null = null;
  const view = document.defaultView;

  const apply = (event: SendHapticEvent) => {
    const next = reduceSendHaptic(state, event);
    state = next.state;
    if (!state.armed) armedButton = null;
    if (next.pulse) postSendHaptic(readHapticBridge(view));
  };

  const arm = (button: HTMLButtonElement) => {
    armedButton = button;
    apply("press");
    if (timer !== null) view?.clearTimeout(timer);
    timer =
      view?.setTimeout(() => {
        timer = null;
        apply("timeout");
      }, WAIT_MS) ?? null;
  };

  const syncBusy = () => {
    if (!armedButton) return;
    if (!armedButton.isConnected) {
      apply("idle");
      return;
    }
    apply(
      armedButton.getAttribute("aria-busy") === "true" ? "busy" : "idle",
    );
  };

  const pulseJump = () => {
    const now = view?.performance?.now() ?? Date.now();
    const next = acceptJumpPulse(lastJumpAt, now);
    if (next === null) return;
    lastJumpAt = next;
    postHaptic(readHapticBridge(view), "impact-light");
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    const jump = jumpButtonFrom(event.target);
    if (jump && releasedInside(jump, event)) {
      pulseJump();
      return;
    }
    const button = sendButtonFrom(event.target);
    if (!button || !releasedInside(button, event)) return;
    arm(button);
  };

  const onJumpClick = (event: MouseEvent) => {
    if (!jumpButtonFrom(event.target)) return;
    pulseJump();
  };

  const onSubmit = (event: SubmitEvent) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches("[data-promptbox]")) return;
    const submitter = event.submitter;
    if (!(submitter instanceof HTMLButtonElement)) return;
    if (!submitter.matches(SEND_BUTTON) || submitter.disabled) return;
    if (submitter.getAttribute("aria-busy") === "true") return;
    arm(submitter);
  };

  let observer: MutationObserver | null = null;
  if (document.body && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => {
      syncBusy();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-busy"],
      subtree: true,
    });
  }

  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("click", onJumpClick, true);
  document.addEventListener("submit", onSubmit, true);

  return () => {
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("click", onJumpClick, true);
    document.removeEventListener("submit", onSubmit, true);
    observer?.disconnect();
    if (timer !== null) view?.clearTimeout(timer);
  };
}

function jumpButtonFrom(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest(JUMP_BUTTON);
  if (!(button instanceof HTMLButtonElement)) return null;
  if (button.disabled || button.classList.contains("invisible")) return null;
  return button;
}

function sendButtonFrom(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest(SEND_BUTTON);
  if (!(button instanceof HTMLButtonElement)) return null;
  if (button.disabled || button.getAttribute("aria-busy") === "true") {
    return null;
  }
  return button;
}

function releasedInside(button: HTMLElement, event: PointerEvent): boolean {
  const bounds = button.getBoundingClientRect();
  return (
    event.clientX >= bounds.left &&
    event.clientX < bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY < bounds.bottom
  );
}
