import type { PlayerView } from "../viewModels/useGameSession";
import type { PlayerId } from "../../core/game";
import type { TurnStep } from "../../core/gameSession";
import { playerName, STEP_LABELS } from "../presentation";

export interface StatusPanelProps {
  /** Renderable player summaries (id, bananas, eliminated) from the view model. */
  players: PlayerView[];
  /** The player whose turn it is. */
  currentPlayer: PlayerId;
  /** The turn step the human is currently on. */
  step: TurnStep;
  /** The winner, or null while the game is in progress. */
  winner: PlayerId | null;
  /** Whether the game has ended. */
  isDone: boolean;
}

/**
 * Thin, dumb status-panel component (M4-T3).
 *
 * Renders the current player, each player's banana score (and elimination
 * status), the current turn step, and a clear win/loss message when the game
 * ends. It is purely presentational — it renders the props it is given and
 * derives only display labels. No business logic, no hooks, no side effects.
 */
export function StatusPanel({
  players,
  currentPlayer,
  step,
  winner,
  isDone,
}: StatusPanelProps) {
  return (
    <div data-testid="status" className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          key={currentPlayer}
          className="turn-fade text-sm font-semibold text-text-primary"
        >
          Current: {playerName(currentPlayer)}
        </span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
          {STEP_LABELS[step]}
        </span>
      </div>

      <ul className="space-y-1">
        {players.map((player) => (
          <li
            key={player.id}
            data-testid="player-score"
            className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
              player.id === currentPlayer && !isDone
                ? "bg-accent-soft ring-1 ring-accent"
                : "bg-panel-strong"
            }`}
          >
            <span className="font-medium text-text-primary">
              {playerName(player.id)}
              {player.eliminated && (
                <span className="ml-2 text-xs text-danger">eliminated</span>
              )}
            </span>
            {/* Show the human's banana balance, but keep the AI's hidden so the
                AI's footprint is not revealed (M17-T2, issue 113-3). */}
            {player.id === "p1" && (
              <span className="text-text-body">🍌 {player.bananas}</span>
            )}
          </li>
        ))}
      </ul>

      {isDone && winner && (
        <div
          key={winner}
          data-testid="result"
          className={`result-celebrate rounded-md px-3 py-2 text-center text-sm font-semibold ${
            winner === "p1"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {winner === "p1"
            ? "🎉 You win — you rule the Ape Kingdom!"
            : "😔 The AI wins and rules the Ape Kingdom."}
        </div>
      )}
    </div>
  );
}
