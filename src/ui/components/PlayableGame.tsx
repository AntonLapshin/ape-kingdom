import { useGameSession } from "../viewModels/useGameSession";
import { Board } from "./Board";
import { ActionControls } from "./ActionControls";
import { StatusPanel } from "./StatusPanel";

export interface PlayableGameProps {
  /** The deterministic AI seed used for the session (defaults to 0). */
  aiSeed?: number;
}

/**
 * Playable game screen (M4-T3).
 *
 * The thin composition layer that wires the `useGameSession` view model to
 * the dumb board / action / status components. It owns no game rules — every
 * rule derivation (legal actions, step, winner, scores) is delegated through
 * the view model to `src/core`. It simply reads the view-model state and
 * passes it down, and forwards the user's input back up through the view
 * model's callbacks.
 *
 * This is the only "stateful" layer in the UI (it calls the view-model hook);
 * the components it renders stay pure and dumb.
 */
export function PlayableGame({ aiSeed = 0 }: PlayableGameProps) {
  const { view, selectAction, clearActions, submitTurn } = useGameSession(aiSeed);

  return (
    <section
      data-testid="playable-game"
      className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Ape Kingdom
        </h2>
        <Board board={view.board} currentPlayer={view.currentPlayer} />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <StatusPanel
            players={view.players}
            currentPlayer={view.currentPlayer}
            step={view.step}
            winner={view.winner}
            isDone={view.isDone}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
  );
}
