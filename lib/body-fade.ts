export type BodyFadeClip = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  clipX: boolean;
  clipY: boolean;
};

export type BodyFadeEdge = {
  show: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
};

const clipsOverflow = (value: string) => /auto|scroll|hidden|clip|overlay/.test(value);

/** Ancestor boxes that actually hide the scroller. Zero boxes are ignored so a layoutless document cannot erase the fade. */
export function readBodyFadeClips(scroller: HTMLElement): Array<BodyFadeClip & { node: HTMLElement }> {
  const view = scroller.ownerDocument.defaultView;
  if (!view) return [];
  const clips: Array<BodyFadeClip & { node: HTMLElement }> = [];
  for (let node = scroller.parentElement; node; node = node.parentElement) {
    const rect = node.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) continue;
    if (![rect.top, rect.right, rect.bottom, rect.left].every(Number.isFinite)) continue;
    const css = view.getComputedStyle(node);
    let clipX = clipsOverflow(css.overflowX);
    let clipY = clipsOverflow(css.overflowY);
    // jsdom keeps overflow:hidden on the shorthand and leaves the longhands at visible.
    if (!clipX && !clipY && clipsOverflow(css.overflow)) clipX = clipY = true;
    // A visible axis next to a scrolling axis computes to auto and clips too.
    if (clipX !== clipY) {
      if (!clipX && css.overflowX === "visible") clipX = true;
      if (!clipY && css.overflowY === "visible") clipY = true;
    }
    if (!clipX && !clipY) continue;
    const borderTop = Number.parseFloat(css.borderTopWidth) || 0;
    const borderRight = Number.parseFloat(css.borderRightWidth) || 0;
    const borderBottom = Number.parseFloat(css.borderBottomWidth) || 0;
    const borderLeft = Number.parseFloat(css.borderLeftWidth) || 0;
    const clip = {
      node,
      top: rect.top + borderTop,
      right: rect.right - borderRight,
      bottom: rect.bottom - borderBottom,
      left: rect.left + borderLeft,
      clipX,
      clipY,
    };
    if (!(clip.right > clip.left) || !(clip.bottom > clip.top)) continue;
    clips.push(clip);
  }
  return clips;
}

/** Place one fade on the scroller's visible padding-edge intersection, in stack coordinates. */
export function bodyFadeBox(input: {
  anchorTop: number;
  anchorLeft: number;
  scroller: { top: number; right: number; bottom: number; left: number };
  clips: readonly BodyFadeClip[];
  overflow: { above: boolean; below: boolean };
  moving: boolean;
}): { above: BodyFadeEdge; below: BodyFadeEdge } {
  let top = input.scroller.top;
  let right = input.scroller.right;
  let bottom = input.scroller.bottom;
  let left = input.scroller.left;
  for (const clip of input.clips) {
    if (!(clip.right > clip.left) || !(clip.bottom > clip.top)) continue;
    if (clip.clipY) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
    if (clip.clipX) {
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
    }
  }
  const width = Math.max(0, right - left);
  const visibleHeight = Math.max(0, bottom - top);
  const height = Math.min(24, visibleHeight / 4);
  const empty = !(width > 0) || !(visibleHeight > 0) || input.moving;
  const edge = (show: boolean, edgeTop: number): BodyFadeEdge => ({
    show: show && !empty,
    top: edgeTop - input.anchorTop,
    left: left - input.anchorLeft,
    width,
    height,
  });
  return {
    above: edge(input.overflow.above || input.scroller.top < top - 0.5, top),
    below: edge(input.overflow.below || input.scroller.bottom > bottom + 0.5, bottom - height),
  };
}
