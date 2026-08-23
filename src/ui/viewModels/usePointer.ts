/**
 * Thin view-model / pure helpers for distinguishing a static pointer click
 * from a drag gesture on the full-screen board (M12-T1, #84).
 *
 * The full-screen viewport must tell a static click (which should select a
 * hex, so the native `click` reaches the board cell) apart from a genuine
 * drag (which should pan the board and must NOT select a cell). These are
 * pure geometry helpers with no DOM/browser access, so they live here and are
 * unit-testable without mounting a component.
 */

/**
 * The drag threshold in pixels: a pointer gesture that moves less than this
 * distance between pointer-down and pointer-up is treated as a static click,
 * not a drag. Chosen small enough that a genuine click with minor mouse jitter
 * still selects, and large enough that a real drag clearly crosses it.
 */
export const DRAG_THRESHOLD = 5;

/**
 * Pure geometry helper: decide whether a pointer gesture that started at
 * `(startX, startY)` and is now at `(x, y)` has moved far enough to be
 * considered a drag (as opposed to a static click).
 *
 * Guards against non-numeric coordinates (e.g. jsdom test environments that
 * never produce pointer coordinates) by treating them as non-drags so the
 * gesture stays a static click.
 */
export function exceedsDragThreshold(
  startX: number,
  startY: number,
  x: number,
  y: number,
  threshold: number = DRAG_THRESHOLD,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const dx = x - startX;
  const dy = y - startY;
  return Math.hypot(dx, dy) > threshold;
}
