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
 * Playable game screen (M4-T3, extended for M10-T1).
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
    selectedMoveTargets,
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
      className="h-screen w-screen overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px] py-6">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-bold text-text-primary">
            Ape Kingdom
          </h2>
          <Board
            board={view.board}
            currentPlayer={view.currentPlayer}
            pan={pan}
            zoom={zoom}
            selectedHex={selectedHex}
            moveTargets={selectedMoveTargets}
            onSelectCell={selectCell}
          />
        </div>

        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4">
            <StatusPanel
              players={view.players}
              currentPlayer={view.currentPlayer}
              step={view.step}
              winner={view.winner}
              isDone={view.isDone}
            />
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <CellInfoPanel info={selectedCell} onSelectAction={selectAction} />
          </div>
          <div className="glass-panel rounded-2xl p-4">
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
      </section>
    </div>
  );
}
