import { Board } from "../components/Board";
import { boardCells } from "../viewModels/useGameSession";
import {
  createGameSession,
  selectAction,
  standardSetup,
} from "../../core/gameSession";
import { moveTargets } from "../../core/moveTargets";

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

/**
 * The opening board after the human collects income and selects a movable
 * unit: every reachable, unoccupied target hex of that unit is highlighted
 * and its own hex is marked selected (M10-T4). The reachable targets are
 * derived from the session's legal move actions after collecting income.
 */
export const MoveTargets = () => {
  let session = createGameSession();
  session = selectAction(session, { type: "collectIncome" });
  const move = session.legalMoves.find((a) => a.type === "move");
  if (!move || move.type !== "move") {
    return <Board board={boardCells(session.state)} currentPlayer="p1" />;
  }
  const targets = moveTargets(session.legalMoves, move.unitHex);
  return (
    <Board
      board={boardCells(session.state)}
      currentPlayer="p1"
      selectedHex={move.unitHex}
      moveTargets={targets}
    />
  );
};

