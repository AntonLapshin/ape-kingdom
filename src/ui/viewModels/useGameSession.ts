import { useCallback, useMemo, useState } from "react";
import type {
  GameState,
  Hex,
  Site,
  ApeUnit,
  Player,
  PlayerId,
  ApeKind,
  ApeRank,
} from "../../core/game";
import { rankOf, sameHex } from "../../core/game";
import type { MapConfig, Terrain } from "../../core/mapGenerator";
import type { GameAction } from "../../core/ai";
import type { CellInfo } from "../../core/cellInfo";
import { cellInfo } from "../../core/cellInfo";
import { moveTargets } from "../../core/moveTargets";
import type { TurnStep } from "../../core/gameSession";
import {
  createGameSession,
  selectAction,
  submitTurn,
  resetTurn,
} from "../../core/gameSession";

/**
 * Thin view model for the playable board (M4-T2).
 *
 * Adapts the core game-session controller (`src/core/gameSession.ts`) into a
 * plain, serializable UI-state shape that the (dumb) board components render:
 * board cells (hex + site/unit), players with banana scores and elimination
 * status, the current player, the human's selectable legal actions, and the
 * winner/status.
 *
 * Contains no game rules or business logic — every game-rule derivation
 * (legal moves, step, winner, scores, current player) is delegated to
 * `src/core`. The only logic here is pure *presentation* adaptation: flattening
 * the core `GameState`'s sites and units into renderable board cells and player
 * summaries. Those pure helpers are exported separately so they are testable
 * without mounting the hook.
 */

/** A single renderable board cell: a hex, its terrain, and the site/unit on it. */
export interface BoardCell {
  /** The hex this cell represents. */
  hex: Hex;
  /** The terrain (land / water / mountain) of this hex from the generated map. */
  terrain: Terrain;
  /** The site on this hex, or null if there is none. */
  site: Site | null;
  /** The unit on this hex, or null if there is none. */
  unit: UnitView | null;
}

/**
 * A renderable unit badge view: the ape kind, its rank, and its owner.
 * The rank is derived from the kind by the (pure) core `rankOf` helper so the
 * dumb `Unit` component needs no game-rule logic.
 */
export interface UnitView {
  /** Which ape kind this unit is. */
  kind: ApeKind;
  /** Combat strength / rank (1–4) of the ape kind. */
  rank: ApeRank;
  /** The player who owns this unit. */
  owner: PlayerId;
}

/** A renderable summary of one player. */
export interface PlayerView {
  /** Unique player id. */
  id: PlayerId;
  /** Current banana balance. */
  bananas: number;
  /** Whether the player has been eliminated. */
  eliminated: boolean;
}

/** The plain, serializable UI-state shape the components render. */
export interface GameSessionView {
  /** Every renderable board cell (one per occupied/sited hex). */
  board: BoardCell[];
  /** Renderable summaries of every player. */
  players: PlayerView[];
  /** The player whose turn it is. */
  currentPlayer: PlayerId;
  /** The legal actions the human may select next (from the core session). */
  legalActions: GameAction[];
  /** The turn step the human is currently on. */
  step: TurnStep;
  /** The winner, or null while the game is in progress. */
  winner: PlayerId | null;
  /** Whether the game has ended (a winner exists). */
  isDone: boolean;
}

/**
 * Pure presentation adaptation: flatten a `GameState`'s generated map into one
 * renderable cell per map hex, attaching the site and/or unit that occupy each
 * hex (if any) and the hex's terrain. Every hex of the generated map is
 * represented so the board can render the full terrain. Not game logic — just
 * arranging the core state into the shape the board renders.
 */
export function boardCells(state: GameState): BoardCell[] {
  const siteByHex = new Map<string, Site>();
  for (const site of state.sites) {
    siteByHex.set(`${site.hex.q},${site.hex.r}`, site);
  }
  const unitByHex = new Map<string, ApeUnit>();
  for (const unit of state.units) {
    unitByHex.set(`${unit.hex.q},${unit.hex.r}`, unit);
  }
  const cellKey = (hex: Hex) => `${hex.q},${hex.r}`;
  return [...state.map.cells]
    .sort((a, b) => cellKey(a.hex).localeCompare(cellKey(b.hex)))
    .map(({ hex, terrain }) => {
      const key = cellKey(hex);
      const unit = unitByHex.get(key);
      return {
        hex,
        terrain,
        site: siteByHex.get(key) ?? null,
        unit: unit
          ? { kind: unit.kind, rank: rankOf(unit.kind), owner: unit.owner }
          : null,
      };
    });
}

/**
 * Pure presentation adaptation: map the core player records into renderable
 * summaries. Not game logic — just shaping the data for the players panel.
 */
export function playerViews(state: GameState): PlayerView[] {
  return Object.values(state.players).map((player: Player) => ({
    id: player.id,
    bananas: player.bananas,
    eliminated: player.eliminated,
  }));
}

/**
 * Create a `GameSessionView` from a core `GameSession`.
 *
 * Every game-rule value (step, winner, current player, legal actions) is taken
 * directly from the core session; only the board cells and player summaries
 * are presentation-adapted.
 */
export function toGameSessionView(session: {
  state: GameState;
  step: TurnStep;
  winner: PlayerId | null;
  legalMoves: GameAction[];
}): GameSessionView {
  return {
    board: boardCells(session.state),
    players: playerViews(session.state),
    currentPlayer: session.state.currentPlayer,
    legalActions: session.legalMoves,
    step: session.step,
    winner: session.winner,
    isDone: session.step === "done",
  };
}

/**
 * Pure presentation adaptation: derive the selected cell's display info from
 * the current game state and the user's selected hex. This simply binds the
 * core `cellInfo` derivation to the view — no business logic lives here.
 *
 * `null` is returned when no hex is selected, so the info panel can show its
 * empty prompt.
 */
export function selectedCellInfo(
  state: GameState,
  hex: Hex | null,
): CellInfo | null {
  if (!hex) return null;
  return cellInfo(state, hex);
}

/**
 * Pure presentation adaptation: derive the set of reachable, unoccupied target
 * hexes for `unitHex` from the session's legal moves. This simply binds the
 * core `moveTargets` derivation to the session's step-filtered legal moves —
 * no business logic lives here.
 *
 * `null` is returned when no hex is selected, so the board highlights nothing.
 */
export function selectedMoveTargets(
  legalMoves: GameAction[],
  hex: Hex | null,
): Hex[] {
  if (!hex) return [];
  return moveTargets(legalMoves, hex);
}

/**
 * The `useGameSession` view model.
 *
 * Holds a core `GameSession` and the currently selected hex in React state and
 * exposes:
 *  - `view` — the plain UI-state shape for the components to render;
 *  - `selectedHex` — the hex the user has clicked (or null);
 *  - `selectedCell` — the core-derived display info for the selected hex (or
 *    null when none is selected);
 *  - `selectedMoveTargets` — the reachable, unoccupied target hexes the
 *    selected (movable, human-owned, not-yet-acted) unit could move to this
 *    turn, or an empty array when none is selected / not movable (M10-T4);
 *  - `selectCell(hex)` — selects a hex so the info/action panel can show it;
 *    when the currently selected cell is a movable unit and `hex` is one of
 *    its reachable target hexes, issues the matching `move` action through
 *    the core `selectAction` flow instead (M10-T4);
 *  - `selectAction(action)` — selects one legal action (delegates to core);
 *  - `clearActions()` — discards this turn's selections (delegates to core);
 *  - `submitTurn()` — ends the human's turn and runs the AI (delegates to core).
 *
 * No game rules live here; every operation/derivation delegates to `src/core`.
 */
export function useGameSession(aiSeed = 0, mapConfig?: MapConfig): {
  view: GameSessionView;
  selectedHex: Hex | null;
  selectedCell: CellInfo | null;
  selectedMoveTargets: Hex[];
  selectCell: (hex: Hex) => void;
  selectAction: (action: GameAction) => void;
  clearActions: () => void;
  submitTurn: () => void;
} {
  const [session, setSession] = useState(() =>
    createGameSession(aiSeed, {}, mapConfig),
  );
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);

  const view = useMemo(() => toGameSessionView(session), [session]);

  const selectedCell = useMemo(
    () => selectedCellInfo(session.state, selectedHex),
    [session, selectedHex],
  );

  const selectedTargets = useMemo(
    () => selectedMoveTargets(session.legalMoves, selectedHex),
    [session, selectedHex],
  );

  const select = useCallback((action: GameAction) => {
    setSession((current) => selectAction(current, action));
  }, []);

  const clear = useCallback(() => {
    setSession((current) => resetTurn(current));
  }, []);

  const submit = useCallback(() => {
    setSession((current) => submitTurn(current));
  }, []);

  const selectCell = useCallback(
    (hex: Hex) => {
      // If a movable unit is currently selected and the clicked hex is one of
      // its reachable target hexes, issue the `move` action through the core
      // `selectAction` flow (M10-T4). Clicking any other (non-reachable) cell
      // never issues an illegal move — it just clears/reselects the selection,
      // which drops any move highlight on the previously selected unit.
      if (selectedHex) {
        const targets = moveTargets(session.legalMoves, selectedHex);
        if (targets.some((target) => sameHex(target, hex))) {
          select({ type: "move", unitHex: selectedHex, targetHex: hex });
        }
      }
      setSelectedHex(hex);
    },
    [selectedHex, session, select],
  );

  return {
    view,
    selectedHex,
    selectedCell,
    selectedMoveTargets: selectedTargets,
    selectCell,
    selectAction: select,
    clearActions: clear,
    submitTurn: submit,
  };
}
