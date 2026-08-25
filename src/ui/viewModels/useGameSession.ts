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
import { rankOf, sameHex, territoryOwner } from "../../core/game";
import { visibleHexes } from "../../core/vision";
import type { MapConfig, Terrain } from "../../core/mapGenerator";
import type { GameAction } from "../../core/ai";
import type { CellInfo } from "../../core/cellInfo";
import { cellInfo } from "../../core/cellInfo";
import type { MovementInfo } from "../../core/movement";
import { movementInfo } from "../../core/movement";
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
  /**
   * The territory owner of this hex (M24-T2, #160): the kingdom that owns the
   * cell's site, or the persistent owner of a site-less cell (retained after
   * a unit vacates). Derived from core `territoryOwner` so the board tints
   * persistent site-less territory even once the unit has left. Null when the
   * cell is neutral.
   */
  owner: PlayerId | null;
  /**
   * Whether this cell is hidden by fog of war (M22-T2, #159): the human
   * player cannot see it yet, so it renders dark with no site/unit content.
   * Derived from the core `visibleHexes` vision model — no game logic here.
   */
  fogged: boolean;
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

/** A stable string key for a hex, used to mark revealed cells. */
const cellKey = (hex: Hex) => `${hex.q},${hex.r}`;

/**
 * Pure presentation adaptation: the set of hexes the human player (p1) has
 * revealed, derived from the core vision model (M22-T2, #159).
 *
 * This is a pure UI glue — the actual vision derivation lives in the core
 * `visibleHexes(state, "p1", true)` (M22-T1, #151), which returns every map
 * hex p1 can currently see. The human player is always p1 (the AI plays p2),
 * so the fog is always derived from p1's own sight lines — never the
 * opponent's — matching the rules.
 */
export function revealedHexKeys(state: GameState): Set<string> {
  return new Set(visibleHexes(state, "p1", true).map((h) => cellKey(h)));
}

/**
 * Pure presentation adaptation: flatten a `GameState`'s generated map into one
 * renderable cell per map hex, attaching the site and/or unit that occupy each
 * hex (if any) and the hex's terrain. Every hex of the generated map is
 * represented so the board can render the full terrain. Not game logic — just
 * arranging the core state into the shape the board renders.
 *
 * When a `revealed` set of hex keys is provided, each cell whose hex is not in
 * that set is marked `fogged = true` so the board can render it hidden by fog
 * of war (M22-T2, #159). When `revealed` is omitted (or null), no fog is
 * applied and every cell is `fogged = false` — the legacy full-visibility
 * board.
 */
export function boardCells(
  state: GameState,
  revealed: Set<string> | null = null,
): BoardCell[] {
  const siteByHex = new Map<string, Site>();
  for (const site of state.sites) {
    siteByHex.set(`${site.hex.q},${site.hex.r}`, site);
  }
  const unitByHex = new Map<string, ApeUnit>();
  for (const unit of state.units) {
    unitByHex.set(`${unit.hex.q},${unit.hex.r}`, unit);
  }
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
        owner: territoryOwner(state.sites, state.units, state.territory, hex),
        fogged: revealed !== null && !revealed.has(key),
      };
    });
}

/**
 * Pure presentation adaptation: resolve the territory background token class
 * for a rendered cell from its owner (M13-T2, #89).
 *
 * The owner→colour mapping lives here (the view model), not in the dumb
 * `Cell` component: a land cell owned by p1 / p2 gets a soft owner tint token
 * (`bg-owner-p1` / `bg-owner-p2`), while neutral cells return `null` so the
 * `Cell` keeps its current terrain colour. Not game logic — just deciding the
 * token-controlled background utility for the board to pass down.
 */
export function ownerBackground(owner: PlayerId | null): string | null {
  if (owner === "p1") return "bg-owner-p1";
  if (owner === "p2") return "bg-owner-p2";
  return null;
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
    board: boardCells(session.state, revealedHexKeys(session.state)),
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
 * Pure presentation derivation: the movement info (movable unit + reachable
 * target hexes) for the user's selected hex, bound from the core
 * `movementInfo` helper. This simply forwards to core — no business logic
 * lives here.
 */
export function selectedMovement(
  state: GameState,
  hex: Hex | null,
): MovementInfo {
  return movementInfo(state, hex);
}

/**
 * Whether `targetHex` is one of the reachable target hexes the selected unit
 * may legally move onto. Used by the view model to decide whether a cell click
 * should issue a `move` action (reachable) or just select the cell (not).
 * Pure presentation glue over the core derivation — no business logic.
 */
export function isMoveTarget(
  hex: Hex | null,
  targetHex: Hex,
  reachable: Hex[],
): boolean {
  return !!hex && reachable.some((h) => sameHex(h, targetHex));
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
 *  - `selectCell(hex)` — selects a hex so the info/action panel can show it;
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
  /** The movement info (movable unit + reachable targets) for the selected hex. */
  movement: MovementInfo;
  /** The reachable target hexes highlighted when a movable unit is selected. */
  reachableHexes: Hex[];
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

  const movement = useMemo(
    () => selectedMovement(session.state, selectedHex),
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
      // If the user has a movable unit selected and clicks one of its
      // reachable target hexes (and that move is legal this turn), issue the
      // move action through the existing selectAction flow and clear the
      // selection so the highlight disappears. Otherwise just select the cell
      // (no illegal move is issued for a non-reachable cell).
      const info = movementInfo(session.state, selectedHex);
      const unit = info.unit;
      const moveLegal =
        !!unit &&
        info.movable &&
        isMoveTarget(selectedHex, hex, info.reachable) &&
        session.legalMoves.some(
          (a) =>
            a.type === "move" &&
            sameHex(a.unitHex, unit.hex) &&
            sameHex(a.targetHex, hex),
        );
      if (moveLegal && unit) {
        setSession((current) =>
          selectAction(current, {
            type: "move",
            unitHex: unit.hex,
            targetHex: hex,
          }),
        );
        setSelectedHex(null);
        return;
      }
      setSelectedHex(hex);
    },
    [selectedHex, session],
  );

  return {
    view,
    selectedHex,
    selectedCell,
    movement,
    reachableHexes: movement.reachable,
    selectCell,
    selectAction: select,
    clearActions: clear,
    submitTurn: submit,
  };
}
