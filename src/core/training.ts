/**
 * Headless self-play training harness core (M28-T2b, #203).
 *
 * This module learns a small, dependency-light opponent-policy from the
 * self-play training dataset recorded by M28-T2a (`playAiGame(...,
 * { recordDataset: true })` -> `TrainingDataset`, see `src/core/selfPlay.ts`
 * and `src/core/trainingDataset.ts`).
 *
 * The project has no ML runtime in `package.json` (React + TS + Vitest only),
 * so the training stays pragmatic / POC: it fits a **win-weighted centroid
 * (prototype) classifier** — a compact linear policy whose weights are the
 * per-feature difference between the average feature vector of decisions made
 * by the *winning* player and those made by the *losing* player. Each
 * decision is a labelled (state, legal set, chosen action) example; when we
 * know which player went on to win the game we can label each decision as
 * "good" (the acting player won) or "bad" (the acting player lost), and the
 * fitted weights capture which action features are most associated with
 * winning. The result is a plain, JSON-serializable `TrainedAiPolicy` that
 * the deployed UI opponent (M28-T3) can load from a serialized file.
 *
 * Everything here is pure business logic:
 *
 *   - `actionFeatures` turns a candidate `GameAction` + `GameState` into a
 *     fixed-length numeric feature vector (the same vector used for training
 *     and for scoring, so training and runtime selection are consistent);
 *   - `fitPolicy` / `fitPolicyFromGames` learn the policy weights from
 *     labelled decisions / recorded self-play games;
 *   - `scoreWithPolicy` / `chooseTrainedAction` select a legal action at
 *     runtime by scoring each candidate with the fitted weights (highest
 *     score wins; ties broken deterministically by a seed).
 *
 * No React, Tailwind, browser, or external ML dependencies. Every function is
 * deterministic (same inputs ⇒ same output), so a trained file is
 * reproducible for a given run.
 */

import type { GameState, PlayerId } from "./game";
import { rankOf, canJoinUnits, sameHex } from "./game";
import type { GameAction } from "./ai";
import type { TrainingDecision } from "./trainingDataset";
import type { PlayAiGameResult } from "./selfPlay";

/* ------------------------------------------------------------------ */
/* Feature extraction                                                  */
/* ------------------------------------------------------------------ */

/** The number of features in an action's feature vector. */
export const FEATURE_COUNT = 6;

/* Stable feature indices (order matters — it is part of the serialized
 * policy contract that the deployed UI and training harness share). */
export const FEATURE_COLLECT = 0;
export const FEATURE_RECRUIT_RANK = 1;
export const FEATURE_CAPTURE = 2;
export const FEATURE_JOIN = 3;
export const FEATURE_ATTACK_RANKDIFF = 4;
export const FEATURE_ATTACK_WINNING = 5;

/**
 * A fixed-length numeric feature vector describing a single legal action in
 * the context of `state`, derived purely from the state and the action.
 *
 * The same extractor is used for training (given a recorded decision's state
 * and chosen action) and for runtime scoring (given a candidate action and
 * the current state), so the policy sees the same representation. Features:
 *
 *   index 0 `COLLECT`      — 1 if the action is `collectIncome`, else 0
 *   index 1 `RECRUIT_RANK` — the rank of the recruited kind for `recruit`, else 0
 *   index 2 `CAPTURE`      — 1 for a `move` onto a site the player does not
 *                            already control (a capturable site), else 0
 *   index 3 `JOIN`         — 1 for a `move` that joins two of the player's
 *                            friendly units (level-up), else 0
 *   index 4 `ATTACK_RANKDIFF` — attacker rank − defender rank for `attack`,
 *                            else 0 (positive = the fight favours the actor)
 *   index 5 `ATTACK_WINNING` — 1 for an `attack` the actor is favoured to win
 *                            (higher-rank attacker), else 0
 *
 * `state.currentPlayer` is the acting player for both the `move`/`attack`
 * ownership checks and the join check, matching how the action is legal for
 * that player.
 */
export function actionFeatures(action: GameAction, state: GameState): number[] {
  const me = state.currentPlayer;
  const f = new Array<number>(FEATURE_COUNT).fill(0);

  switch (action.type) {
    case "collectIncome":
      f[FEATURE_COLLECT] = 1;
      break;

    case "recruit":
      f[FEATURE_RECRUIT_RANK] = rankOf(action.kind);
      break;

    case "move": {
      // Capture feature: the destination holds a site the player does not
      // control yet (owned by the enemy or still neutral).
      const site = state.sites.find((s) => sameHex(s.hex, action.targetHex));
      if (site && site.owner !== me) f[FEATURE_CAPTURE] = 1;

      // Join feature: the destination holds a friendly unit the mover can
      // join with (level-up). Joins add levels (#174), so they are a distinct,
      // valuable action compared to a plain repositioning move.
      const target = state.units.find((u) => sameHex(u.hex, action.targetHex));
      if (target && target.owner === me) {
        const actor = state.units.find((u) => sameHex(u.hex, action.unitHex));
        if (actor && canJoinUnits(actor, target)) f[FEATURE_JOIN] = 1;
      }
      break;
    }

    case "attack": {
      const attacker = state.units.find((u) => sameHex(u.hex, action.attackerHex));
      const defender = state.units.find((u) => sameHex(u.hex, action.targetHex));
      if (attacker && defender) {
        const diff = rankOf(attacker.kind) - rankOf(defender.kind);
        f[FEATURE_ATTACK_RANKDIFF] = diff;
        if (diff > 0) f[FEATURE_ATTACK_WINNING] = 1;
      }
      break;
    }
  }

  return f;
}

/* ------------------------------------------------------------------ */
/* The trained-AI policy (serializable)                                */
/* ------------------------------------------------------------------ */

/**
 * The fitted, serializable opponent-policy produced by the training harness.
 *
 * This is a plain data object (no functions or classes) so it can be written
 * to a JSON file (`public/trained-ai.json`) and loaded back by the deployed
 * UI opponent (M28-T3). It is fully self-describing for auditing:
 *
 *   - `weights` is a length-`FEATURE_COUNT` vector, one coefficient per
 *     feature in `actionFeatures`. A positive weight means that feature is
 *     associated with decisions that lead to wins, so the policy prefers
 *     actions exhibiting it.
 *   - `bias` is a scalar added to every action score (currently 0; kept so
 *     the model is a full affine scorer).
 *   - `gamesSeen` / `decisionsSeen` report how much self-play data the policy
 *     was fitted from.
 *   - `source` names the fitting algorithm, `version` is a schema version.
 */
export interface TrainedAiPolicy {
  /** One coefficient per feature; length `FEATURE_COUNT`. */
  weights: number[];
  /** Scalar added to every action score. */
  bias: number;
  /** Number of decisive self-play games the policy was fitted from. */
  gamesSeen: number;
  /** Number of labelled decisions (state → chosen action) used for fitting. */
  decisionsSeen: number;
  /** Human-readable name of the fitting algorithm. */
  source: string;
  /** Schema/algorithm version. */
  version: number;
}

/** The current algorithm version this module emits. */
export const TRAINED_AI_VERSION = 1;
/** The name of the fitting algorithm this module implements. */
export const TRAINED_AI_SOURCE = "win-weighted-centroid";

/**
 * A single training example: a recorded decision plus which player won the
 * game it came from (`null` when the game was capped at `maxTurns` with no
 * winner — that decision carries no win/loss signal and is not used for
 * fitting).
 */
export interface LabeledDecision {
  /** The recorded AI decision (state, legal set, chosen action). */
  decision: TrainingDecision;
  /** The winning player of the game, or null when the game had no winner. */
  winner: PlayerId | null;
}

/* ------------------------------------------------------------------ */
/* Fitting                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fit a `TrainedAiPolicy` from a list of labelled decisions.
 *
 * Each labelled decision is assigned to the "good" group when its acting
 * player went on to win the game, and the "bad" group otherwise (a decision
 * from a game with no winner — `winner === null` — carries no signal and is
 * excluded from the fit). For each feature we compute the difference between
 * the average feature value of the good decisions and the average of the bad
 * decisions: a feature that winners exercised more than losers gets a
 * positive weight, so `scoreWithPolicy` will prefer actions exhibiting it.
 *
 * `gamesSeen` is metadata (how many decisive games contributed) recorded on
 * the policy for auditing; it is supplied by the caller rather than derived,
 * because individual decisions do not carry their game id.
 *
 * Deterministic: the same labelled decisions always produce the same policy.
 */
export function fitPolicy(
  labelled: LabeledDecision[],
  gamesSeen = 0,
): TrainedAiPolicy {
  const goodSum = new Array<number>(FEATURE_COUNT).fill(0);
  const badSum = new Array<number>(FEATURE_COUNT).fill(0);
  let goodCount = 0;
  let badCount = 0;

  for (const { decision, winner } of labelled) {
    // A decision with no known winner carries no win/loss signal — exclude it.
    if (winner === null || winner === undefined) continue;
    const f = actionFeatures(decision.chosenAction, decision.state);
    if (decision.player === winner) {
      goodCount++;
      for (let i = 0; i < FEATURE_COUNT; i++) goodSum[i] += f[i];
    } else {
      badCount++;
      for (let i = 0; i < FEATURE_COUNT; i++) badSum[i] += f[i];
    }
  }

  const weights = new Array<number>(FEATURE_COUNT).fill(0);
  for (let i = 0; i < FEATURE_COUNT; i++) {
    const goodAvg = goodCount > 0 ? goodSum[i] / goodCount : 0;
    const badAvg = badCount > 0 ? badSum[i] / badCount : 0;
    weights[i] = goodAvg - badAvg;
  }

  return {
    weights,
    bias: 0,
    gamesSeen,
    decisionsSeen: goodCount + badCount,
    source: TRAINED_AI_SOURCE,
    version: TRAINED_AI_VERSION,
  };
}

/**
 * Fit a `TrainedAiPolicy` directly from a list of recorded self-play game
 * results (M28-T2a). Only games that produced a decisive winner and a
 * recorded dataset contribute: each of their decisions is labelled by the
 * winner and fed to `fitPolicy`; games without a winner (capped at `maxTurns`)
 * or without a recorded dataset are skipped, and only decisive games count
 * toward `gamesSeen`.
 *
 * This is the bridge between the M28-T2a dataset recording and the training
 * harness: the harness runs `playAiGame(..., { recordDataset: true })` many
 * times and passes the results (with winners) here to obtain the trained
 * policy. Deterministic and pure — no I/O.
 */
export function fitPolicyFromGames(games: PlayAiGameResult[]): TrainedAiPolicy {
  const labelled: LabeledDecision[] = [];
  let decisive = 0;
  for (const game of games) {
    if (!game.dataset) continue;
    if (game.winner === null || game.winner === undefined) continue;
    decisive++;
    for (const decision of game.dataset) {
      labelled.push({ decision, winner: game.winner });
    }
  }
  return fitPolicy(labelled, decisive);
}

/* ------------------------------------------------------------------ */
/* Runtime scoring / selection                                         */
/* ------------------------------------------------------------------ */

/**
 * Score a single legal action with a trained policy. Higher is better: it is
 * the affine combination `bias + Σ(weights[i] · features[i])` of the action's
 * feature vector, so actions that exhibit features associated with winning
 * (positive weights) score higher. Deterministic.
 */
export function scoreWithPolicy(
  policy: TrainedAiPolicy,
  action: GameAction,
  state: GameState,
): number {
  const f = actionFeatures(action, state);
  let score = policy.bias;
  for (let i = 0; i < FEATURE_COUNT; i++) {
    score += policy.weights[i] * f[i];
  }
  return score;
}

/** A small deterministic PRNG (mulberry32), used only for seeded tie-breaks. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Select the single best legal action from a (non-empty) list using a trained
 * policy. Every action is scored via `scoreWithPolicy` and the highest-scoring
 * one is chosen; when several tie for the top score the winner is picked
 * deterministically — ties are broken with a seed-driven PRNG over the tied
 * set, so the same `policy`, `actions`, `state`, and `seed` always produce the
 * same action (reproducible for a given seed, per the harness requirements).
 *
 * The caller is responsible for passing a non-empty, rule-legal list (the same
 * contract as `chooseFromActions` in `src/core/ai.ts`).
 */
export function chooseTrainedAction(
  policy: TrainedAiPolicy,
  actions: GameAction[],
  state: GameState,
  seed: number,
): GameAction {
  let best: GameAction[] = [];
  let bestScore = -Infinity;
  for (const action of actions) {
    const score = scoreWithPolicy(policy, action, state);
    if (score > bestScore) {
      bestScore = score;
      best = [action];
    } else if (score === bestScore) {
      best.push(action);
    }
  }
  const rng = mulberry32(seed);
  const index = Math.floor(rng() * best.length);
  return best[index];
}
