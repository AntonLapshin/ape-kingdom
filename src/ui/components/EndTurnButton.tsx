/**
 * Thin, dumb end-turn button component (M17-T2).
 *
 * A single, beautiful circular "End Turn" button that entirely replaces the
 * old bottom-right `ActionControls` step indicator + action-list panel: the
 * `ActionControls`'s "Step: Recruit / Act" label and the selectable
 * action-button list / Clear buttons are gone from the bottom-right corner,
 * leaving only this circular button (issue 113-2).
 *
 * It is purely presentational: it renders its disabled state and calls the
 * `onSubmit` callback. It owns no game rules — the caller decides when the
 * human's turn is active (the button is disabled while the game has ended or
 * it is not the human's turn). No business logic, no hooks, no side effects.
 */
export interface EndTurnButtonProps {
  /**
   * Whether the human's turn is active. When `false` the button is shown
   * disabled (e.g. the game has ended or it is not the human's turn), so a
   * turn can never be submitted while the human cannot act.
   */
  enabled: boolean;
  /** End the human's turn and run the AI reply (delegates to the view model). */
  onSubmit: () => void;
}

/**
 * The circular "End Turn" button (M17-T2).
 *
 * A self-contained circular control with a token-backed glass surface, a
 * warm accent fill, a soft drop shadow and a hover lift so it reads as a
 * polished, primary HUD action. It uses the existing token surfaces/tokens
 * (`glass`, `--color-accent`, shadow tokens) so no raw colours are hard-coded.
 */
export function EndTurnButton({ enabled, onSubmit }: EndTurnButtonProps) {
  return (
    <button
      type="button"
      data-testid="submit-turn"
      aria-label="End Turn"
      disabled={!enabled}
      onClick={onSubmit}
      className="end-turn-btn glass flex h-24 w-24 flex-col items-center justify-center rounded-full text-inverted transition"
    >
      <span className="text-[15px] font-bold leading-tight">End</span>
      <span className="text-[15px] font-bold leading-tight">Turn</span>
    </button>
  );
}
