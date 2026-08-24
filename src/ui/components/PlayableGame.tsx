import { useCallback, useEffect, useRef } from "react";
import { useGameSession } from "../viewModels/useGameSession";
import { usePan } from "../viewModels/usePan";
import { useZoom, ZOOM_STEP } from "../viewModels/useZoom";
import { exceedsDragThreshold } from "../viewModels/usePointer";
import { Board } from "./Board";
import { EndTurnButton } from "./EndTurnButton";
import { StatusPanel } from "./StatusPanel";
import { CellInfoPanel } from "./CellInfoPanel";

export interface PlayableGameProps {
  /** The deterministic AI seed used for the session (defaults to 0). */
  aiSeed?: number;
}

/**
 * Playable game screen (M4-T3, extended for M10 & M11-T1).
 *
 * The thin composition layer that wires the `useGameSession` view model to
 * the dumb board / action / status components. It owns no game rules — every
 * rule derivation (legal actions, step, winner, scores) is delegated through
 * the view model to `src/core`. It simply reads the view-model state and
 * passes it down, and forwards the user's input back up through the view
 * model's callbacks.
 *
 * For viewport navigation (M10-T1) it also:
 *  - mounts its content inside a full-viewport, non-scrolling container
 *    (`h-screen w-screen overflow-hidden`, no page scroll) so the game fills
 *    100% of the viewport;
 *  - uses the thin `usePan` view model to track the map's pan offset; and
 *  - handles pointer events on the viewport (pointer down → move → up as a
 *    drag) to update that offset, so the user can drag the board to pan it.
 *
 * For zoom (M10-T2) it also:
 *  - uses the thin `useZoom` view model to track the map's zoom scale; and
 *  - mounts a `wheel` listener on the viewport that updates the zoom scale
 *    and prevents the default page scroll while interacting with the board.
 *
 * For the full-screen game UI (M11-T1):
 *  - the board is no longer a contained UI element. The former `max-w-5xl`
 *    grid container and the `glass-panel` that wrapped the `Board` are
 *    removed so the map fills the entire viewport. The info panels (status,
 *    cell info, actions) are floated over the board as a thin overlay so
 *    they no longer constrain the map.
 *
 * For floating overlay panels (M11-T2):
 *  - `StatusPanel`, `CellInfoPanel` and `ActionControls` are each rendered
 *    as a distinct floating (absolutely-positioned, `z-10` above the board)
 *    overlay element fixed at a sensible corner/edge of the viewport: the
 *    status/score panel at the top-left, the cell-info inspector at the
 *    bottom-left, and the action controls at the bottom-right. They are no
 *    longer stacked in a single side column, so each floats independently
 *    over the full-screen map.
 *  - Each floating overlay container is `pointer-events-none`, and only the
 *    panel card inside it is `pointer-events-auto`. That way the small gaps
 *    and surrounding space between panels never intercept pointer input, so
 *    the board's pan/zoom/click-to-select/move interactions are not occluded
 *    anywhere except on the panels themselves (which are meant to be
 *    clickable). This keeps the panels non-intrusive yet fully fixed at
 *    their corners.
 *
 * For floating full-screen UI polish (M11-T3 / #76):
 *  - Each floating panel card uses the design-token `glass-panel` surface
 *    (token-backed backdrop blur + shadow) so it reads as a polished game
 *    HUD that stays readable over any terrain, and pops in with the token
 *    `menu-pop` animation on mount. The board layer stays full-screen beneath
 *    them and pan/zoom/selection/move remain fully interactive outside the
 *    panels.
 *
 * For the frosted-glass HUD (M14-T1 / #96):
 *  - The floating HUD panels (status, cell-info, actions) now use the
 *    translucent `glass` surface instead of the near-opaque `glass-panel`,
 *    so the glassmorphism (translucent fill + backdrop blur) is clearly
 *    visible over the map while the token-backed text roles stay legible.
 *    This is a pure token/CSS surface change — no business logic touched.
 *
 * This is the only "stateful" layer in the UI (it calls the view-model hooks);
 * the components it renders stay pure and dumb. The pointer/wheel wiring here
 * is thin view glue (accumulating drag deltas / wheel deltas into the view
 * models), not game logic.
 */
export function PlayableGame({ aiSeed = 0 }: PlayableGameProps) {
  const {
    view,
    selectedHex,
    selectedCell,
    reachableHexes,
    selectCell,
    selectAction,
    clearActions,
    submitTurn,
  } = useGameSession(aiSeed);
  const { pan, panBy } = usePan();
  const { zoom, zoomBy } = useZoom();

  // Drag state (M12-T1): the pointer we are tracking, the gesture's start
  // position (to decide click-vs-drag), and the last known pointer position
  // (to compute per-move pan deltas). A gesture is NOT captured/treated as a
  // drag until it exceeds the drag threshold, so a static click is left
  // uncaptured and the browser dispatches the native `click` to the board
  // cell underneath (which drives hex selection). Only once a real drag is
  // detected do we claim the pointer (so panning stays smooth beyond the
  // viewport) and remember to suppress the drag's synthetic click.
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    isDragging: boolean;
  } | null>(null);

  // Set true after a drag so the post-drag synthetic `click` (which is
  // retargeted to this capturing viewport) is suppressed and never reaches the
  // board cells — a drag must not select a cell. Reset on the next
  // pointer-down so a fresh static click is never suppressed.
  const suppressClick = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        isDragging: false,
      };
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;

      // Once the gesture crosses the drag threshold it is a drag, not a static
      // click: claim the pointer (so subsequent moves keep panning even after
      // the pointer leaves the viewport) and mark that this drag must not
      // select a cell on release.
      if (
        !current.isDragging &&
        exceedsDragThreshold(current.startX, current.startY, event.clientX, event.clientY)
      ) {
        current.isDragging = true;
        suppressClick.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }

      // Only pan the board once the gesture is confirmed as a drag; static
      // clicks (with minor jitter) must not translate the board.
      if (!current.isDragging) return;

      const dx = event.clientX - current.lastX;
      const dy = event.clientY - current.lastY;
      current.lastX = event.clientX;
      current.lastY = event.clientY;
      // Guard against non-numeric deltas (e.g. jsdom test environments never
      // producing pointer coordinates) so the transform never becomes NaN.
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      panBy(dx, dy);
    },
    [panBy],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) {
        // Whether or not this was a drag, the gesture is over: clear the drag
        // state. `suppressClick` is left set if it was a drag so the following
        // synthetic click on the capturing viewport is suppressed.
        drag.current = null;
      }
    },
    [],
  );

  // A click bubbles up to this capturing viewport after a drag (the pointer
  // was captured, so the synthetic click is retargeted here instead of the
  // board cell). If that drag already panned the board, suppress the click so
  // it must not also select a cell. For static clicks nothing is captured, so
  // the click reaches the board cell and is never suppressed at this level.
  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  // Mount a wheel listener on the game viewport so a scroll-wheel gesture
  // zooms the board in/out instead of scrolling the page (M10-T2). The
  // listener is attached to the DOM node (a native wheel event does not
  // compose through React's synthetic pointer system), and it prevents the
  // default page scroll while interacting with the board. The viewport is
  // non-scrolling anyway, but preventing default keeps the browser from
  // trying to scroll the page.
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // deltaY > 0 (scroll down) zooms out; deltaY < 0 (scroll up) zooms in.
      // The wheel sign is converted into a fixed zoom step so each notch of
      // the wheel moves the scale by ZOOM_STEP.
      const delta = (event.deltaY > 0 ? -1 : 1) * ZOOM_STEP;
      zoomBy(delta);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  return (
    <div
      data-testid="playable-game"
      ref={viewportRef}
      className="relative h-screen w-screen overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
    >
      {/* Full-screen map: fills the whole viewport, no longer constrained by
          a max-width container or a glass panel wrapper (M11-T1). */}
      <div data-testid="board-layer" className="absolute inset-0 select-none">
        <Board
          board={view.board}
          currentPlayer={view.currentPlayer}
          pan={pan}
          zoom={zoom}
          selectedHex={selectedHex}
          reachableHexes={reachableHexes}
          onSelectCell={selectCell}
        />
      </div>

      {/* Floating overlay UI panels (M11-T2): each panel is a distinct,
          absolutely-positioned, z-10 floating element fixed at a sensible
          corner so it never constrains the map. Each overlay container is
          pointer-events-none so the board's pan/zoom/click-to-select/move
          stay fully interactive everywhere except on a panel itself. */}
      <div
        data-testid="status-overlay"
        className="pointer-events-none absolute left-4 top-4 z-10"
      >
        <div className="glass menu-pop pointer-events-auto rounded-2xl p-4">
          <h2 className="mb-2 text-lg font-bold text-text-primary">
            Ape Kingdom
          </h2>
          <StatusPanel
            players={view.players}
            currentPlayer={view.currentPlayer}
            step={view.step}
            winner={view.winner}
            isDone={view.isDone}
          />
        </div>
      </div>

      <div
        data-testid="cell-info-overlay"
        className="pointer-events-none absolute bottom-4 left-4 z-10"
      >
        <div className="glass menu-pop pointer-events-auto w-72 rounded-2xl p-4">
          <CellInfoPanel
            info={selectedCell}
            legalActions={view.legalActions}
            onSelectAction={selectAction}
            onClear={clearActions}
          />
        </div>
      </div>

      {/* Bottom-right corner: a single beautiful circular End Turn button
          (M17-T2). The old ActionControls step indicator + action-list
          panel is gone from this corner (issue 113-2); the non-recruit legal
          actions now live in the bottom-left cell-info panel so the game stays
          fully playable. */}
      <div
        data-testid="actions-overlay"
        className="pointer-events-none absolute bottom-4 right-4 z-10"
      >
        <EndTurnButton
          enabled={!view.isDone && view.currentPlayer === "p1"}
          onSubmit={submitTurn}
        />
      </div>
    </div>
  );
}
