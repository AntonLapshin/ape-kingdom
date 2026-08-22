import { Board } from "../components/Board";
import { boardCells } from "../viewModels/useGameSession";
import { standardSetup } from "../../core/gameSession";

/**
 * Showcase demos for the `Board` atom component (M7-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "Board";

/** The standard two-player opening board, with p1 to move. */
export const Opening = () => (
  <Board board={boardCells(standardSetup())} currentPlayer="p1" />
);

/** The same opening board, with p2 to move (highlights p2's territory). */
export const PlayerTwoTurn = () => (
  <Board board={boardCells(standardSetup())} currentPlayer="p2" />
);
