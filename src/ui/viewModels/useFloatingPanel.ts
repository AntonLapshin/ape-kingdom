import { useCallback, useState } from "react";

/**
 * Thin view model for draggable floating overlay panels (M11-T2).
 *
 * Each floating HUD panel (status, cell info, action controls) sits at a
 * default corner/edge of the full-screen map and can be dragged elsewhere by
 * its header. This hook tracks a single panel's position `{x, y}` (in px,
 * as an offset from its default corner) and exposes a `moveBy(dx, dy)`
 * callback so the (dumb) floating panel component can translate the card by
 * a drag delta. The offset is pure presentation state — it has no effect on
 * game rules — so it lives entirely in the UI layer, mirroring `usePan`.
 *
 * The pure `moveBy` helper is exported separately so it can be unit-tested
 * without mounting the hook.
 */

/** A draggable position offset (px from the panel's default corner/edge). */
export interface FloatingPanelPosition {
  /** Horizontal offset (positive moves right/away from the edge). */
  x: number;
  /** Vertical offset (positive moves down/away from the edge). */
  y: number;
}

/**
 * Pure presentation helper: add a drag delta to a floating panel's position,
 * clamped to a sane range so a panel cannot be dragged completely outside
 * the viewport. Not game logic — just geometry for the view (mirrors the
 * `offsetBy` helper in `usePan`).
 */
export function moveBy(
  position: FloatingPanelPosition,
  dx: number,
  dy: number,
): FloatingPanelPosition {
  const MIN = -2000;
  const MAX = 2000;
  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
  return { x: clamp(position.x + dx), y: clamp(position.y + dy) };
}

/**
 * The `useFloatingPanel` view model.
 *
 * Holds one floating panel's position in React state and exposes:
 *  - `position` — the current `{x, y}` offset to apply to the panel card;
 *  - `moveBy(dx, dy)` — accumulates a drag delta into the position;
 *  - `setPosition(position)` — sets the position directly (e.g. to reset it).
 *
 * No game rules live here; it is a thin, dumb container for view state.
 */
export function useFloatingPanel(
  initial: FloatingPanelPosition = { x: 0, y: 0 },
): {
  position: FloatingPanelPosition;
  moveBy: (dx: number, dy: number) => void;
  setPosition: (position: FloatingPanelPosition) => void;
} {
  const [position, setPositionState] = useState(initial);

  const moveByCallback = useCallback((dx: number, dy: number) => {
    setPositionState((current) => moveBy(current, dx, dy));
  }, []);

  const setPosition = useCallback((next: FloatingPanelPosition) => {
    setPositionState(next);
  }, []);

  return { position, moveBy: moveByCallback, setPosition };
}
