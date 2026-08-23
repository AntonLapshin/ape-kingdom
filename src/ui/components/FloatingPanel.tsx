import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { FloatingPanelPosition } from "../viewModels/useFloatingPanel";

/**
 * The corner/edge of the viewport a floating panel is pinned to by default.
 * The `position` offset is applied *away* from this anchor (e.g. a panel
 * anchored `top-right` starts at `right-4 top-4` and `position.x/y` push it
 * left/down), so a dragged panel always stays within the viewport.
 */
export type FloatingPanelAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface FloatingPanelProps {
  /**
   * The panel's display title, shown in a drag header so the user can grab
   * the card and move it around the full-screen map.
   */
  title: string;
  /**
   * The viewport corner/edge this panel is anchored to by default. The panel
   * is absolutely positioned against this corner and `position` offsets it.
   */
  anchor: FloatingPanelAnchor;
  /**
   * The panel's current drag offset (px from its anchor). Rendered as an
   * absolute translate so the card floats over the board.
   */
  position: FloatingPanelPosition;
  /**
   * Accumulate a drag delta (px) into the panel's position. Wired to the
   * `useFloatingPanel` view model — this is the only way the panel moves.
   */
  onMoveBy: (dx: number, dy: number) => void;
  /** The panel body content (status, cell info, or action controls). */
  children?: ReactNode;
  /** Optional extra Tailwind classes on the floating card itself. */
  className?: string;
}

/**
 * Thin, dumb floating overlay panel component (M11-T2).
 *
 * Renders an absolutely-positioned, `z-index`-above-the-board card that
 * floats over the full-screen map at an anchor corner/edge, with a drag
 * header so the panel is draggable / non-intrusive. It is purely
 * presentational: it renders the `title`, `position`, and `children` it is
 * given and reports drag deltas through `onMoveBy`. No business logic, no
 * hooks other than the thin pointer-drag glue, no side effects.
 *
 * Pointer events on the drag header call `stopPropagation` so dragging a
 * panel does not also pan/zoom the board underneath, and so clicking inside
 * a panel does not select a board cell behind it.
 */
export function FloatingPanel({
  title,
  anchor,
  position,
  onMoveBy,
  children,
  className = "",
}: FloatingPanelProps) {
  // Drag state: the pointer id we are dragging with, plus the last-known
  // pointer position so we can compute deltas on each move.
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(
    null,
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Grab the drag: track the pointer and swallow the event so the board
      // beneath does not start its own pan gesture.
      event.stopPropagation();
      drag.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const dx = event.clientX - current.lastX;
      const dy = event.clientY - current.lastY;
      current.lastX = event.clientX;
      current.lastY = event.clientY;
      // Guard against non-numeric deltas (e.g. jsdom test environments never
      // producing pointer coordinates) so the transform never becomes NaN.
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      onMoveBy(dx, dy);
    },
    [onMoveBy],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) {
        drag.current = null;
      }
    },
    [],
  );

  // Map each anchor to the Tailwind corner utilities the card is pinned to.
  const anchorClasses: Record<FloatingPanelAnchor, string> = {
    "top-left": "left-4 top-4",
    "top-right": "right-4 top-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <section
      data-testid="floating-panel"
      data-anchor={anchor}
      data-title={title}
      className={`absolute z-10 w-72 ${anchorClasses[anchor]} ${className}`}
      style={{
        // The drag offset moves the panel away from its anchored corner:
        // top/left-anchored panels translate right/down; bottom/right-anchored
        // panels translate left/up so a positive drag delta still follows the
        // pointer.
        transform: `translate(${
          anchor.includes("right")
            ? -position.x
            : position.x
        }px, ${
          anchor.includes("bottom")
            ? -position.y
            : position.y
        }px)`,
      }}
    >
      <div className="glass-panel rounded-2xl p-3 shadow-[0_18px_50px_var(--color-shadow)]">
        <div
          data-testid="floating-panel-header"
          className="-mx-1 -mt-1 mb-2 flex cursor-grab items-center justify-between rounded-xl px-2 py-1.5 select-none active:cursor-grabbing hover:bg-accent-soft"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title={`Drag to move the ${title.toLowerCase()} panel`}
        >
          <h2 className="text-sm font-bold text-text-primary">{title}</h2>
          <span className="text-text-faint" aria-hidden="true">
            ⠿
          </span>
        </div>
        {children}
      </div>
    </section>
  );
}
