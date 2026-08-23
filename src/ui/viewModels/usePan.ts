import { useCallback, useState } from "react";

/**
 * Thin view model for drag-to-pan board navigation (M10-T1).
 *
 * Tracks the board's pan offset `{x, y}` and exposes a `panBy(dx, dy)`
 * callback so the (dumb) board component can translate the map/grid by the
 * offset. The offset is pure presentation state — it has no effect on game
 * rules — so it lives entirely in the UI layer.
 *
 * The pure `offsetBy` helper is exported separately so it can be unit-tested
 * without mounting the hook.
 */

/** A 2D pan offset in pixels, applied as a translate to the board transform. */
export interface PanOffset {
  /** Horizontal offset (positive pans right). */
  x: number;
  /** Vertical offset (positive pans down). */
  y: number;
}

/**
 * Pure presentation helper: add a drag delta to a pan offset (clamped to a
 * sane range so the map cannot be dragged fully out of view). Not game logic —
 * just geometry for the view.
 */
export function offsetBy(offset: PanOffset, dx: number, dy: number): PanOffset {
  const MIN = -3000;
  const MAX = 3000;
  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
  return { x: clamp(offset.x + dx), y: clamp(offset.y + dy) };
}

/**
 * The `usePan` view model.
 *
 * Holds the pan offset in React state and exposes:
 *  - `pan` — the current `{x, y}` offset to apply to the board transform;
 *  - `panBy(dx, dy)` — accumulates a drag delta into the offset;
 *  - `setPan(pan)` — sets the offset directly (e.g. to reset it).
 *
 * No game rules live here; it is a thin, dumb container for view state.
 */
export function usePan(initial: PanOffset = { x: 0, y: 0 }): {
  pan: PanOffset;
  panBy: (dx: number, dy: number) => void;
  setPan: (pan: PanOffset) => void;
} {
  const [pan, setPanState] = useState(initial);

  const panBy = useCallback((dx: number, dy: number) => {
    setPanState((current) => offsetBy(current, dx, dy));
  }, []);

  const setPan = useCallback((next: PanOffset) => {
    setPanState(next);
  }, []);

  return { pan, panBy, setPan };
}
