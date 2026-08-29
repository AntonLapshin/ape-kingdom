import { useCallback, useState } from "react";
import type { PanOffset } from "./usePan";

/**
 * Thin view model for mouse-wheel zoom on the board (M10-T2).
 *
 * Tracks the board's zoom scale and exposes `zoomBy(delta)` / `setZoom(scale)`
 * callbacks so the (dumb) board component can scale the map/grid. The zoom
 * level is pure presentation state — it has no effect on game rules — so it
 * lives entirely in the UI layer.
 *
 * The pure `clampZoom` / `zoomBy` helpers and the `boardTransform` summary
 * helper are exported separately so they can be unit-tested without mounting
 * the hook.
 */

/** The smallest allowed zoom scale (map appears at 50%). */
export const ZOOM_MIN = 0.5;
/** The largest allowed zoom scale (map appears at 250%). */
export const ZOOM_MAX = 2.5;
/** The default zoom scale (100%). */
export const DEFAULT_ZOOM = 1;
/** How much the zoom changes per notched wheel event. */
export const ZOOM_STEP = 0.1;

/**
 * Pure presentation helper: clamp a zoom scale to the allowed [min, max]
 * range so the map can never be zoomed so far out/in that it is lost.
 */
export function clampZoom(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/** The visible margin (px) left on each side of the board when fitting it to
 * the viewport (M31-T4). Ensures the whole circular map reads comfortably
 * inside the window with a modest frame and no clipping. */
export const FIT_VIEWPORT_MARGIN = 48;

/**
 * Pure presentation helper (M31-T4): compute the zoom scale that fits a board
 * of `boardW × boardH` pixels inside a `viewportW × viewportH` viewport,
 * leaving `margin` px visible on every side, clamped to the allowed zoom
 * range ([ZOOM_MIN, ZOOM_MAX]).
 *
 * This lets the playable game default the board to a scale where the whole
 * smaller, clearly-circular default map is fully visible and centred at mount
 * (rather than starting clipped at the old default zoom of 1, which was tuned
 * for a larger fixed-size board). Pure geometry — no game logic, no React.
 */
export function boardScaleToFit(
  boardW: number,
  boardH: number,
  viewportW: number,
  viewportH: number,
  margin: number = FIT_VIEWPORT_MARGIN,
): number {
  const availW = Math.max(1, viewportW - margin * 2);
  const availH = Math.max(1, viewportH - margin * 2);
  const scale = Math.min(availW / Math.max(1, boardW), availH / Math.max(1, boardH));
  return clampZoom(scale);
}

/**
 * Pure presentation helper: apply a wheel delta (positive = zoom in, negative
 * = zoom out) to the current zoom scale, clamped to the allowed range.
 * Not game logic — just geometry for the view.
 */
export function zoomBy(scale: number, delta: number): number {
  return clampZoom(scale + delta);
}

/**
 * Pure presentation helper: build the combined CSS transform for the board,
 * translating by the pan offset and scaling by the zoom level around the
 * board's centre. Both are applied together so zoom and pan combine correctly
 * (scaled + translated) without losing the map content (M10-T1 + M10-T2).
 */
export function boardTransform(zoom: number, pan: PanOffset): string {
  return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
}

/**
 * The `useZoom` view model.
 *
 * Holds the zoom scale in React state and exposes:
 *  - `zoom` — the current scale (default 1, clamped to [ZOOM_MIN, ZOOM_MAX]);
 *  - `zoomBy(delta)` — accumulates a wheel delta into the scale;
 *  - `setZoom(scale)` — sets the scale directly (e.g. to reset it).
 *
 * No game rules live here; it is a thin, dumb container for view state.
 */
export function useZoom(initial: number = DEFAULT_ZOOM): {
  zoom: number;
  zoomBy: (delta: number) => void;
  setZoom: (scale: number) => void;
} {
  const [zoom, setZoomState] = useState(clampZoom(initial));

  const zoomByDelta = useCallback((delta: number) => {
    setZoomState((current) => zoomBy(current, delta));
  }, []);

  const setZoom = useCallback((scale: number) => {
    setZoomState(clampZoom(scale));
  }, []);

  return { zoom, zoomBy: zoomByDelta, setZoom };
}
