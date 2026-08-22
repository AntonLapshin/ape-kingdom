import type { GameAction } from "../../core/ai";
import type { TurnStep } from "../../core/gameSession";
import { actionLabel, STEP_LABELS } from "../presentation";

export interface ActionControlsProps {
  /** The legal actions the human may select next (from the view model). */
  legalActions: GameAction[];
  /** The turn step the human is currently on. */
  step: TurnStep;
  /** Whether the game has ended (disables the controls). */
  isDone: boolean;
  /** Select one legal action (delegates to the view model / core). */
  onSelect: (action: GameAction) => void;
  /** Discard this turn's selections (delegates to the view model / core). */
  onClear: () => void;
  /** End the human's turn and run the AI reply (delegates to the view model). */
  onSubmit: () => void;
}

/**
 * Thin, dumb action-controls component (M4-T3).
 *
 * Renders one button per legal action plus "Clear" and "End Turn" buttons. It
 * is purely presentational: it renders the `legalActions` it is given and
 * calls the `onSelect` / `onClear` / `onSubmit` callbacks. No business logic,
 * no hooks, no side effects.
 */
export function ActionControls({
  legalActions,
  step,
  isDone,
  onSelect,
  onClear,
  onSubmit,
}: ActionControlsProps) {
  if (isDone) {
    return (
      <div className="text-center text-sm text-text-muted" data-testid="actions">
        The game has ended.
      </div>
    );
  }

  return (
    <div data-testid="actions" className="space-y-3">
      <div
        key={step}
        className="turn-fade text-xs font-semibold uppercase tracking-wide text-text-muted"
      >
        Step: {STEP_LABELS[step]}
      </div>
      {legalActions.length === 0 ? (
        <p className="text-sm text-text-muted" data-testid="no-actions">
          No actions available — end your turn.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {legalActions.map((action, i) => (
            <button
              key={i}
              type="button"
              data-testid="action-button"
              onClick={() => onSelect(action)}
              className="btn-action rounded-md border border-line-strong bg-panel px-3 py-1.5 text-left text-xs text-text-primary transition hover:border-accent hover:bg-accent-soft"
            >
              {actionLabel(action)}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="clear-actions"
          onClick={onClear}
          className="btn-action rounded-md border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-text-body transition hover:bg-accent-soft"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="submit-turn"
          onClick={onSubmit}
          className="btn-action rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-inverted transition hover:bg-accent-strong"
        >
          End Turn
        </button>
      </div>
    </div>
  );
}
