import { useCallback, useEffect, useRef } from "react";
import { useGameSession } from "../viewModels/useGameSession";
import { usePan } from "../viewModels/usePan";
import { useZoom, ZOOM_STEP } from "../viewModels/useZoom";
import { Board } from "./Board";
import { ActionControls } from "./ActionControls";
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
 * For the polished full-screen HUD (M11-T3): the panel cards use the
 * design-token `glass-panel` surface (backdrop blur + shadow) and a
 * `menu-pop` entry animation so they read as a polished, animated HUD that
 * stays readable over any terrain while never breaking pan/zoom/selection.
 * The full-screen board + floating panels are showcased in
 * `src/ui/showcases/PlayableGame.tsx`.
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

  // Drag state: the pointer id we are currently dragging with, plus the last
  // known pointer position so we can compute deltas on each move.
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(
    null,
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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
      panBy(dx, dy);
    },
    [panBy],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) {
        drag.current = null;
      }
    },
    [],
  );

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
    >
      {/* Full-screen map: fills the whole viewport, no longer constrained by
          a max-width container or a glass panel wrapper (M11-T1). */}
      <div data-testid="board-layer" className="absolute inset-0">
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
        <div className="glass-panel menu-pop pointer-events-auto w-72 rounded-2xl p-4">
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
        <div className="glass-panel menu-pop pointer-events-auto w-72 rounded-2xl p-4">
          <CellInfoPanel info={selectedCell} onSelectAction={selectAction} />
        </div>
      </div>

      <div
        data-testid="actions-overlay"
        className="pointer-events-none absolute bottom-4 right-4 z-10"
      >
        <div className="glass-panel menu-pop pointer-events-auto w-72 rounded-2xl p-4">
          <ActionControls
            legalActions={view.legalActions}
            step={view.step}
            isDone={view.isDone}
            onSelect={selectAction}
            onClear={clearActions}
            onSubmit={submitTurn}
          />
        </div>
      </div>
    </div>
  );
}
