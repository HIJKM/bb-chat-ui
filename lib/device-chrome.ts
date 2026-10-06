import { createElement } from "react";
import { useDeviceChrome } from "./use-device.ts";

export const PHONE_NARROW = 'html:has([data-bb-chat-ui-device="phone"][data-bb-chat-ui-viewport="narrow"])';
export const NARROW_VIEWPORT = 'html:has([data-bb-chat-ui-viewport="narrow"])';
export const ROOMY_VIEWPORT = 'html:has([data-bb-chat-ui-viewport="medium"], [data-bb-chat-ui-viewport="wide"])';
export const SMALL_HIT_TARGET = 'html:has([data-bb-chat-ui-hit-target="small"])';

export function DeviceChromeBridge() {
  const { device, orientation, viewport, hitTarget } = useDeviceChrome();
  return createElement("span", {
    hidden: true,
    "data-bb-chat-ui-device": device,
    "data-bb-chat-ui-orientation": orientation,
    "data-bb-chat-ui-viewport": viewport,
    "data-bb-chat-ui-hit-target": hitTarget,
  });
}

export function isDesktopChrome(document: Document): boolean {
  return document.querySelector('[data-bb-chat-ui-device="desktop"]') !== null;
}

export function hasSmallHitTarget(document: Document): boolean {
  return document.querySelector('[data-bb-chat-ui-hit-target="small"]') !== null;
}
