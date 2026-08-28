import type { PanOffset } from "./usePan";

/**
 * Pure, unit-testable rAF-coalescing accumulator (M29-T3, #210).
 *
 * Dragging the map and scrolling the wheel each fire a flurry of pointer/wheel
 * events, one per pointer move or wheel notch. Without intervention every one
 * of those events would trigger its own React state update (and full board
 * re-render), making the map feel laggy. These helpers coalesce the flurry so
 * that any number of accumulated deltas within a single animation frame commit
 * at most one state update, while losing no events — the total delta for the
 * frame is applied together.
 *
 * This is pure presentation bookkeeping with no DOM/browser access and no
 * side effects, so it lives in the (thin) view-model layer and is unit-testable
 * without mounting a component or a real `requestAnimationFrame`. The actual
 * `requestAnimationFrame` scheduling that drains the accumulator once per frame
 * lives in the component (`PlayableGame`), which holds the side-effect wiring.
 */

/** The identity/zero value for a numeric (zoom) delta. */
export const ZERO_DELTA = 0;

/** Pure helper: sum two numeric (zoom) deltas. */
export function sumNumbers(a: number, b: number): number {
  return a + b;
}

/** Pure helper: combine two pan deltas into their component-wise total. */
export function sumPanDeltas(a: PanOffset, b: PanOffset): PanOffset {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * A minimal coalescing accumulator over `T`-valued deltas.
 *
 * `add(delta)` folds each incoming delta into an internal pending total
 * without committing anything; `take()` returns the accumulated total and
 * resets it, returning `null` when nothing is pending. The DOM schedules a
 * `requestAnimationFrame` to call `take()` and commit once per frame, so any
 * number of `add` calls within a frame collapse into a single commit of the
 * full sum (no events are lost).
 *
 * The accumulator is intentionally free of browser APIs: the merge function
 * and the accumulated value are plain data, so it can be unit-tested with a
 * fake timer / `requestAnimationFrame`.
 */
export interface Coalescer<T> {
  /** Fold `delta` into the pending total (no commit yet). */
  add: (delta: T) => void;
  /** Whether a delta is currently awaiting a frame-boundary commit. */
  hasPending: () => boolean;
  /**
   * Return the accumulated total and reset the accumulator to empty, or
   * `null` if nothing has been added since the last `take()`.
   */
  take: () => T | null;
}

/** Create a `Coalescer` that merges deltas with `merge`. */
export function createCoalescer<T>(merge: (a: T, b: T) => T): Coalescer<T> {
  let pending: T | null = null;
  return {
    add: (delta) => {
      pending = pending === null ? delta : merge(pending, delta);
    },
    hasPending: () => pending !== null,
    take: () => {
      const total = pending;
      pending = null;
      return total;
    },
  };
}
