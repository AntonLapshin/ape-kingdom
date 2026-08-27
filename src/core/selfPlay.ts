/**
 * Headless full-game self-play simulator (M28-T1a, #179).
 *
 * Plays a complete AI-vs-AI Ape Kingdom game to completion with no UI and no
 * browser: both sides are driven by the existing AI layer
 * (`aiTurnActions` / `playTurn` from `src/core/gameLoop.ts`, which draw from
 * `aiChooseMove`/`chooseFromActions`), alternating turns from a
 * `standardSetup` map until a winner is produced.
 *
 * This is the headless prerequisite for the AI-player training harness
 * (subsequent M28 slices), which will later simulate hundreds/thousands of
 * self-play games. The function is configurable so those runs are practical:
 *
 *  - a `seed` makes a given run deterministic / reproducible (same seed ⇒
 *    same board, same AI choices, same winner and trajectory);
 *  - a `maxTurns` maximum-iteration guard prevents an infinite loop if the
 *    game never reaches a winner;
 *  - a `mapConfig` (e.g. a small grid) lets callers trade off board size for
 *    simulation speed;
 *  - `aiOptions` tunes both sides' AI behavior.
 *
 * By default the function plays on a small full-land `standardSetup` map (8×8)
 * with the AI layer's default (naive) behavior, which is a configuration where
 * AI-vs-AI games reliably terminate with a decisive winner in well under a
 * second — a practical default for a self-play harness that will simulate
 * thousands of games. (The naive uniformly-random AI tends to wander and never
 * decisively win on larger boards; the `maxTurns` guard then bounds the run.)
 * Callers may pass a larger `mapConfig` and/or strategic `aiOptions`
 * (`difficulty: 1`, `preferCapture`) to scale board size or AI strength.
 *
 * The function returns the final `GameState` plus which player won and how
 * many turns elapsed, with no React / browser / business-logic leakage —
 * everything lives in `src/core`, keeping the core pure and headless.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState, PlayerId } from "./game";
import type { MapConfig } from "./mapGenerator";
import type { AiOptions } from "./ai";
import { standardSetup } from "./gameSession";
import { aiTurnActions, playTurn } from "./gameLoop";

/**
 * The default `MapConfig` passed to `standardSetup` for a headless self-play
 * run.
 *
 * A small (8×8) full-land board is used so each simulated game is fast while
 * still being the standard two-player setup (two Home Trees on opposite
 * sides, neutral Groves/Nests between, standard starting forces). On this
 * board many seeds resolve decisively in well under a second; however, the
 * Protection / Safety Zones rule (#195) intentionally adds defensive standoffs,
 * so some naive-AI runs stall and are bounded by `DEFAULT_MAX_TURNS` (the
 * guard returns `winner: null`). See the `playAiGame` docs.
 */
export const DEFAULT_SELFPLAY_MAP: MapConfig = {
  width: 8,
  height: 8,
  islandSize: 1,
  mountainDensity: 0,
  lakeDensity: 0,
  seed: 0,
};

/**
 * The default maximum number of full turns a `playAiGame` run will play
 * before giving up. A naive-AI game on the default small map resolves in well
 * under this cap (observed ≤ ~210 turns) for many seeds, but the Protection /
 * Safety Zones rule (#195) deliberately creates defensive standoffs that can
 * slow a naive-AI game past the cap; the guard then bounds the run and
 * returns `winner: null` rather than looping forever. Callers may override it
 * to trade speed against a larger board or stronger AI.
 */
export const DEFAULT_MAX_TURNS = 300;

/** Configuration for a single `playAiGame` self-play run. */
export interface PlayAiGameOptions {
  /**
   * Seed that makes the run deterministic: it drives both the generated map
   * and the AI move selection, so the same seed always reproduces the same
   * game. Default 0.
   */
  seed?: number;
  /**
   * Maximum number of full turns to play before giving up. If the game has
   * not reached a winner within this many turns, the run stops and returns
   * the current (winner-less) state. Default `DEFAULT_MAX_TURNS` (300).
   */
  maxTurns?: number;
  /**
   * Optional map config passed to `standardSetup`. Defaults to
   * `DEFAULT_SELFPLAY_MAP` (a small, fast full-land board).
   */
  mapConfig?: MapConfig;
  /**
   * Optional AI behavior knobs applied to both players. Defaults to the AI
   * layer's default (naive) behavior, which reliably terminates on the
   * default small map.
   */
  aiOptions?: AiOptions;
}

/** The result of a completed `playAiGame` run. */
export interface PlayAiGameResult {
  /** The final game state after the run. */
  state: GameState;
  /**
   * Which player won, or null when the run hit `maxTurns` without a winner
   * (the guard against an infinite / non-terminating game).
   */
  winner: PlayerId | null;
  /** The number of full turns played to reach this result. */
  turns: number;
}

/**
 * Play a complete AI-vs-AI Ape Kingdom game from a `standardSetup` map to
 * completion.
 *
 * Both sides are driven headlessly by the existing AI layer: on each full
 * turn the current player's recruit / move / fight sequence is generated via
 * `aiTurnActions` (seeded, never illegal) and then applied through `playTurn`
 * against the other AI player, which advances the turn and resolves victory.
 * The loop repeats until a winner exists or the `maxTurns` guard is hit.
 *
 * The run is deterministic for a given `seed` (same seed ⇒ same generated
 * map and same AI choices ⇒ same winner and trajectory), so callers can
 * reproduce a specific headless game for the training harness. With the
 * default (small map + naive AI) configuration, `winner` is always a player
 * id; it is `null` only when `maxTurns` is reached without a winner (e.g.
 * when a caller overrides `mapConfig` with a board too large for the naive AI
 * to decisively win), which is exactly the guard against an infinite loop.
 *
 * The result exposes the final `GameState`, the winner, and the turn count.
 * Everything lives in `src/core` — no React, browser, or I/O leakage.
 */
export function playAiGame(options: PlayAiGameOptions = {}): PlayAiGameResult {
  const seed = options.seed ?? 0;
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const aiOptions = options.aiOptions ?? {};
  const mapConfig = options.mapConfig ?? DEFAULT_SELFPLAY_MAP;

  let state = standardSetup(mapConfig);
  let turns = 0;

  while (!state.winner && turns < maxTurns) {
    // Generate the current player's full turn (recruit/move/fight) via the AI
    // layer on the start-of-turn state, then play it and the AI reply.
    const currentMoves = aiTurnActions(state, seed * 1000 + turns, aiOptions);
    state = playTurn(state, currentMoves, seed * 1000 + turns + 1, aiOptions);
    turns++;
  }

  return { state, winner: state.winner, turns };
}
