import { Board } from "../components/Board";
import { boardCells } from "../viewModels/useGameSession";
import { boardLayout, boardScaleForWidth } from "../presentation";
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

/**
 * A uniform scale that shrinks the default 17×17 circular board down so the
 * whole map fits the Showcase canvas (M31-T4). Derived purely from the board
 * wrapper width (`boardLayout`) and the `boardScaleForWidth` helper, so the
 * demo always shows the entire smaller circular default map — not a clipped or
 * mis-scaled corner — regardless of the exact generated layout.
 */
const DEMO_SCALE = boardScaleForWidth(boardLayout(boardCells(standardSetup())).width);

/** The standard two-player opening board, with p1 to move. */
export const Opening = () => (
  <Board board={boardCells(standardSetup())} currentPlayer="p1" scale={DEMO_SCALE} />
);

/** The same opening board, with p2 to move (highlights p2's territory). */
export const PlayerTwoTurn = () => (
  <Board board={boardCells(standardSetup())} currentPlayer="p2" scale={DEMO_SCALE} />
);
