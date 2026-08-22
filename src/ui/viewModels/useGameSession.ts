import { useCallback, useMemo, useState } from "react";
import type {
  GameState,
  Hex,
  Site,
  ApeUnit,
  Player,
  PlayerId,
} from "../../core/game";
import type { GameAction } from "../../core/ai";
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

/** A single renderable board cell: a hex plus the site and/or unit on it. */
export interface BoardCell {
  /** The hex this cell represents. */
  hex: Hex;
  /** The site on this hex, or null if there is none. */
  site: Site | null;
  /** The unit on this hex, or null if there is none. */
  unit: ApeUnit | null;
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
 * Pure presentation adaptation: flatten a `GameState`'s sites and units into
 * one renderable cell per unique hex. Not game logic — just arranging the
 * core state into the shape the board renders.
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
  const hexKeys = new Set<string>([...siteByHex.keys(), ...unitByHex.keys()]);
  return [...hexKeys]
    .sort()
    .map((key) => {
      const [q, r] = key.split(",").map(Number);
      const hex: Hex = { q, r };
      return {
        hex,
        site: siteByHex.get(key) ?? null,
        unit: unitByHex.get(key) ?? null,
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
 * The `useGameSession` view model.
 *
 * Holds a core `GameSession` in React state and exposes:
 *  - `view` — the plain UI-state shape for the components to render;
 *  - `selectAction(action)` — selects one legal action (delegates to core);
 *  - `clearActions()` — discards this turn's selections (delegates to core);
 *  - `submitTurn()` — ends the human's turn and runs the AI (delegates to core).
 *
 * No game rules live here; every operation delegates to `src/core`.
 */
export function useGameSession(aiSeed = 0): {
  view: GameSessionView;
  selectAction: (action: GameAction) => void;
  clearActions: () => void;
  submitTurn: () => void;
} {
  const [session, setSession] = useState(() => createGameSession(aiSeed));

  const view = useMemo(() => toGameSessionView(session), [session]);

  const select = useCallback((action: GameAction) => {
    setSession((current) => selectAction(current, action));
  }, []);

  const clear = useCallback(() => {
    setSession((current) => resetTurn(current));
  }, []);

  const submit = useCallback(() => {
    setSession((current) => submitTurn(current));
  }, []);

  return {
    view,
    selectAction: select,
    clearActions: clear,
    submitTurn: submit,
  };
}
