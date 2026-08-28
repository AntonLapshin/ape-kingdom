import { afterEach, beforeEach } from "vitest";
import { act } from "@testing-library/react";

/**
 * Controllable fake `requestAnimationFrame` for rAF-coalescing tests (M29-T3,
 * #210).
 *
 * jsdom provides a `requestAnimationFrame` that schedules a callback but never
 * fires it, and vitest's act() cannot pump it. To test the pan/zoom coalescing
 * deterministically we replace `window.requestAnimationFrame` /
 * `window.cancelAnimationFrame` with a queue we can drain frame-by-frame: every
 * scheduled callback is parked in `scheduled` until `flush()` runs all of the
 * callbacks currently queued (a single "frame"). Each flushed frame may re-schedule
 * the next one (the component's rAF loop does), which simply parks it for the
 * next explicit `flush()` — so the test fully controls frame boundaries.
 */

/** Install the fake rAF for the enclosing test suite and return its controls. */
export function installFakeRaf() {
  const nativeRaf = window.requestAnimationFrame;
  const nativeCaf = window.cancelAnimationFrame;
  const scheduled: FrameRequestCallback[] = [];

  beforeEach(() => {
    scheduled.length = 0;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      scheduled.push(cb);
      return scheduled.length;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    window.requestAnimationFrame = nativeRaf;
    window.cancelAnimationFrame = nativeCaf;
  });

  return {
    /** How many frame callbacks are currently queued (not yet flushed). */
    scheduledCount: () => scheduled.length,
    /** Run every queued callback once — one animation frame. */
    flush: () => {
      const callbacks = scheduled.splice(0, scheduled.length);
      act(() => {
        for (const cb of callbacks) cb(performance.now());
      });
    },
  };
}
