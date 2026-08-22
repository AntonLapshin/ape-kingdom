import { StatusPanel } from "../components/StatusPanel";
import { playerViews } from "../viewModels/useGameSession";
import { standardSetup } from "../../core/gameSession";

/**
 * Showcase demos for the `StatusPanel` atom component (M7-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "StatusPanel";

const players = playerViews(standardSetup());

/** In progress on the income step, p1 to move. */
export const InProgress = () => (
  <StatusPanel
    players={players}
    currentPlayer="p1"
    step="income"
    winner={null}
    isDone={false}
  />
);

/** Mid-game on the move/fight step. */
export const MidGame = () => (
  <StatusPanel
    players={players}
    currentPlayer="p2"
    step="movefight"
    winner={null}
    isDone={false}
  />
);

/** p1 wins the game. */
export const HumanWins = () => (
  <StatusPanel
    players={players}
    currentPlayer="p1"
    step="done"
    winner="p1"
    isDone={true}
  />
);

/** The AI wins the game. */
export const AiWins = () => (
  <StatusPanel
    players={players}
    currentPlayer="p1"
    step="done"
    winner="p2"
    isDone={true}
  />
);
