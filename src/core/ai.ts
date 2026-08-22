/**
 * Pure core AI decision layer (M3-T2).
 *
 * Selects a single rule-legal action for the current player from a given game
 * state, deterministically seeded for testable outcomes. The AI never returns
 * an illegal move: every action it produces is drawn from the legal-move set
 * enumerated by `legalActions`, so feeding the action back into the existing
 * reducers (`collectIncome`, `recruitUnit`, `moveUnit`, `attackUnit`) never
 * throws a typed error.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState, Hex, ApeKind, ApeUnit } from "./game";
import {
  adjacentHexes,
  sameHex,
  costOf,
  rankOf,
  movementOf,
  APE_KINDS,
} from "./game";

/* ------------------------------------------------------------------ */
/* Action descriptors                                                  */
/* ------------------------------------------------------------------ */

/**
 * A serializable, plain action descriptor that can be fed back into the
 * existing reducers. Each variant matches one turn step:
 *
 *  - `collectIncome` → `collectIncome(state)`
 *  - `recruit`       → `recruitUnit(state, kind, hex)`
 *  - `move`          → `moveUnit(state, unitAt(unitHex), targetHex)`
 *  - `attack`        → `attackUnit(state, unitAt(attackerHex), targetHex)`
 *
 * Units are referenced by their current hex (the map allows at most one unit
 * per hex), keeping the descriptor plain and serializable.
 */
export type GameAction =
  | { type: "collectIncome" }
  | { type: "recruit"; kind: ApeKind; hex: Hex }
  | { type: "move"; unitHex: Hex; targetHex: Hex }
  | { type: "attack"; attackerHex: Hex; targetHex: Hex };

/* ------------------------------------------------------------------ */
/* Seeded pseudo-random number generator                               */
/* ------------------------------------------------------------------ */

/**
 * A small deterministic PRNG (mulberry32) seeded by an integer. Two calls
 * with the same seed produce the same sequence of values, which makes the
 * AI's selection reproducible and testable.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Hex helpers                                                         */
/* ------------------------------------------------------------------ */

/** A stable string key for a hex, used to deduplicate sets of hexes. */
function hexKey(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

/** Parse a hex key produced by `hexKey` back into a `Hex`. */
function parseHex(key: string): Hex {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

/**
 * All hexes reachable from `origin` within `movement` steps that are not
 * occupied by another unit. Movement is BFS through empty hexes so the "may
 * not move through enemy units" rule is respected for any movement value.
 * The origin itself is excluded.
 */
export function reachableHexes(
  origin: Hex,
  movement: number,
  occupied: Set<string>,
): Hex[] {
  const result: Hex[] = [];
  const seen = new Set<string>([hexKey(origin)]);
  const queue: Array<{ hex: Hex; dist: number }> = [{ hex: origin, dist: 0 }];
  while (queue.length > 0) {
    const { hex, dist } = queue.shift() as { hex: Hex; dist: number };
    if (dist >= movement) continue;
    for (const neighbour of adjacentHexes(hex)) {
      const key = hexKey(neighbour);
      if (seen.has(key)) continue;
      seen.add(key);
      // A unit may not enter (or move through) an occupied hex.
      if (occupied.has(key)) continue;
      result.push(neighbour);
      queue.push({ hex: neighbour, dist: dist + 1 });
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Legal-move enumeration (the M3-T1 legal set used by the AI)         */
/* ------------------------------------------------------------------ */

/**
 * Enumerate every legal action available to the current player from `state`,
 * covering each turn step per the rules:
 *
 *  - collect income (always legal — the reducer never rejects);
 *  - recruit: every affordable ape kind at every legal placement hex (a
 *    controlled Home Tree hex or an adjacent empty hex);
 *  - move: every unit that has not acted to every reachable, unoccupied hex;
 *  - attack: every unit that has not acted against every adjacent enemy unit.
 *
 * Actions are returned in turn-step order (income, recruit, move, attack).
 * Every returned action is legal: applying it to the corresponding reducer
 * never throws a typed error.
 */
export function legalActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  const me = state.currentPlayer;
  const player = state.players[me];

  // A. Collect income — always legal.
  actions.push({ type: "collectIncome" });

  // B. Recruit: every affordable ape kind at every legal placement hex.
  const occupied = new Set(state.units.map((u) => hexKey(u.hex)));
  const placementHexes = new Set<string>();
  for (const site of state.sites) {
    if (site.kind !== "HomeTree" || site.owner !== me) continue;
    for (const hex of [site.hex, ...adjacentHexes(site.hex)]) {
      if (!occupied.has(hexKey(hex))) placementHexes.add(hexKey(hex));
    }
  }
  for (const kind of APE_KINDS) {
    if (player.bananas < costOf(kind)) continue;
    for (const key of placementHexes) {
      actions.push({ type: "recruit", kind, hex: parseHex(key) });
    }
  }

  // C. Move: every not-acted unit to every reachable, unoccupied hex.
  for (const unit of state.units) {
    if (unit.owner !== me || unit.hasActed) continue;
    const movement = movementOf(unit.kind);
    for (const targetHex of reachableHexes(unit.hex, movement, occupied)) {
      actions.push({ type: "move", unitHex: unit.hex, targetHex });
    }
  }

  // C. Attack: every not-acted unit against every adjacent enemy unit.
  for (const unit of state.units) {
    if (unit.owner !== me || unit.hasActed) continue;
    for (const targetHex of adjacentHexes(unit.hex)) {
      const defender = state.units.find((u) => sameHex(u.hex, targetHex));
      if (defender && defender.owner !== me) {
        actions.push({ type: "attack", attackerHex: unit.hex, targetHex });
      }
    }
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/* Behavior options and action scoring                                 */
/* ------------------------------------------------------------------ */

/** Behavior knobs that influence the AI's action selection. */
export interface AiOptions {
  /**
   * How strategic the AI is. `0` (the default) selects uniformly at random
   * from the legal actions (still deterministic for a given seed). Higher
   * values enable the strategic preferences below.
   */
  difficulty?: number;
  /** Prefer recruiting the highest-affordable ape over other actions. */
  preferRecruit?: boolean;
  /** Prefer moving onto a site the AI does not yet control (capturing). */
  preferCapture?: boolean;
  /** Avoid attacks the AI would lose (attacker rank lower than defender). */
  avoidLosingAttacks?: boolean;
}

/** The unit at a hex, used to look up the actor for move/attack actions. */
function unitAt(state: GameState, hex: Hex): ApeUnit | undefined {
  return state.units.find((u) => sameHex(u.hex, hex));
}

/**
 * Score a legal action so the strategic AI can prefer better moves. Higher is
 * better. The score is derived purely from the current state and the options
 * (no randomness), so selection remains deterministic for a given seed.
 */
function scoreAction(
  action: GameAction,
  state: GameState,
  options: AiOptions,
): number {
  const me = state.currentPlayer;

  switch (action.type) {
    case "collectIncome":
      // Collecting income is mandatory as turn step A and is orchestrated by
      // the game loop; give it the lowest priority among meaningful actions.
      return -1;

    case "recruit": {
      // Prefer the highest-rank (highest-affordable) ape.
      let score = rankOf(action.kind);
      if (options.preferRecruit) score += 100;
      return score;
    }

    case "move": {
      let score = 0;
      const targetSite = state.sites.find((s) => sameHex(s.hex, action.targetHex));
      if (options.preferCapture && targetSite && targetSite.owner !== me) {
        score += 50;
      }
      return score;
    }

    case "attack": {
      const attacker = unitAt(state, action.attackerHex);
      const defender = unitAt(state, action.targetHex);
      let score = 0;
      if (attacker && defender) {
        const rankDiff = rankOf(attacker.kind) - rankOf(defender.kind);
        // Prefer attacks the AI is likely to win.
        score += rankDiff * 10;
        if (options.avoidLosingAttacks && rankDiff < 0) {
          score -= 1000;
        }
      }
      return score;
    }
  }
}

/* ------------------------------------------------------------------ */
/* AI move selection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Choose a single rule-legal action for the current player.
 *
 * The action is drawn from the legal-move set enumerated by `legalActions`,
 * so it is always legal — applying it to the corresponding reducer never
 * throws a typed error. Selection is deterministic: the same `state`, `seed`,
 * and `options` always produce the same action.
 *
 * With `difficulty: 0` (default) the AI picks uniformly at random from the
 * legal actions, seeded for reproducibility. With a higher difficulty it
 * scores each action and picks the highest-scoring one (ties broken by the
 * seed), honouring the `preferRecruit`, `preferCapture`, and
 * `avoidLosingAttacks` options.
 *
 * `legalActions` always includes the `collectIncome` action for a present
 * player, so the legal set is never empty and `aiChooseMove` always returns
 * an action.
 */
export function aiChooseMove(
  state: GameState,
  seed: number,
  options: AiOptions = {},
): GameAction {
  const actions = legalActions(state);
  const rng = mulberry32(seed);
  const difficulty = options.difficulty ?? 0;

  // Naive AI: uniform random over the legal set (deterministic via seed).
  if (difficulty <= 0) {
    const index = Math.floor(rng() * actions.length);
    return actions[index];
  }

  // Strategic AI: pick the highest-scoring action; ties broken by the seed.
  let best: GameAction[] = [];
  let bestScore = -Infinity;
  for (const action of actions) {
    const score = scoreAction(action, state, options);
    if (score > bestScore) {
      bestScore = score;
      best = [action];
    } else if (score === bestScore) {
      best.push(action);
    }
  }
  const index = Math.floor(rng() * best.length);
  return best[index];
}
