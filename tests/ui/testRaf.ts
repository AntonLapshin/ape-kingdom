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
 *
 * Unlike jsdom's stubs, `cancelAnimationFrame(id)` actually removes the pending
 * callback with that id from the queue (mirroring the real API), so a component
 * that cancels its loop on dispose stops scheduling further frames — and a test
 * can assert `scheduledCount() === 0` after unmount to verify the
 * cancelAnimationFrame-on-dispose path (M29-T3 / #210 acceptance criterion #2).
 */

/** Install the fake rAF for the enclosing test suite and return its controls. */
export function installFakeRaf() {
  const nativeRaf = window.requestAnimationFrame;
  const nativeCaf = window.cancelAnimationFrame;
  // Each scheduled callback is stored with the unique id `requestAnimationFrame`
  // returned for it, so `cancelAnimationFrame` can remove the right one.
  const scheduled = new Map<number, FrameRequestCallback>();
  let nextId = 0;

  beforeEach(() => {
    scheduled.clear();
    nextId = 0;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      const id = ++nextId;
      scheduled.set(id, cb);
      return id;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      scheduled.delete(id);
    }) as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    window.requestAnimationFrame = nativeRaf;
    window.cancelAnimationFrame = nativeCaf;
  });

  return {
    /** How many frame callbacks are currently queued (not yet flushed). */
    scheduledCount: () => scheduled.size,
    /** Run every queued callback once — one animation frame. */
    flush: () => {
      const callbacks = [...scheduled.values()];
      scheduled.clear();
      act(() => {
        for (const cb of callbacks) cb(performance.now());
      });
    },
  };
}
