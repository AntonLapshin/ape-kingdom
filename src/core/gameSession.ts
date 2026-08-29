/**
 * Pure core game-session controller (M4-T1).
 *
 * Orchestrates the Human vs AI turn flow on top of the M2 reducers and the M3
 * game loop (`src/core/gameLoop.ts`) so the interactive UI can drive a full
 * game without containing any business logic.
 *
 * A `GameSession` is an immutable value describing one human turn:
 *
 *  - `baseState` is the game state at the start of the human's turn (before
 *    the human acts). Income is **applied automatically** when the turn starts
 *    (per the rules "At the start of your turn, collect bananas from all sites
 *    you control"): the projected `state` below reflects the collected bananas
 *    for the turn, while `baseState` remains the pre-income start-of-turn state
 *    that the game loop (`playTurn`) consumes.
 *  - `moves` is the ordered list of actions the human has selected so far
 *    this turn (recruit -> move/fight);
 *  - `state` is the projected state after those selections (and the automatic
 *    turn-start income), so the UI can render the board as the human builds
 *    their turn;
 *  - `step` is the turn step the human is currently on (`recruit`,
 *    `movefight`, or `done` once the game has ended);
 *  - `legalMoves` is the set of actions the human may legally select next,
 *    already filtered to the current step so the ordering is enforced.
 *
 * The human selects one action at a time via `selectAction` (which validates
 * the action is in `legalMoves` and advances the turn step), then ends their
 * turn with `submitTurn`, which runs the AI's reply via `playTurn` from
 * `src/core/gameLoop.ts` (seeded and deterministic) and advances to the next
 * human turn — or marks the session `done` with a winner when the game ends.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`.
 */

import type { GameState, PlayerId, Hex, Site } from "./game";
import {
  sameHex,
  createSite,
  createUnit,
  startingForce,
  collectIncome,
  adjacentHexes,
  hexDistance,
  isNeutralUnit,
  type ApeUnit,
} from "./game";
import {
  generateMap,
  terrainAt,
  isLandSurface,
  mulberry32,
  type GameMap,
  type MapConfig,
} from "./mapGenerator";
import { legalActions, type GameAction, type AiOptions } from "./ai";
import { applyHumanMoves, playTurn } from "./gameLoop";
import type { TrainedAiPolicy } from "./training";

/* ------------------------------------------------------------------ */
/* Turn steps                                                          */
/* ------------------------------------------------------------------ */

/**
 * The turn step the human is currently on, matching the rules' Turn Sequence.
 * Income is collected automatically at the start of the turn (per the rules
 * "At the start of your turn, collect bananas from all sites you control"),
 * so the human's turn begins directly on recruit.
 *
 *  - `recruit`   — the human may recruit apes (step B) and/or move/fight.
 *                  Recruiting stays legal until the human moves or fights.
 *  - `movefight` — the human may move and attack (step C). Recruiting is no
 *                  longer allowed once the human has moved or fought.
 *  - `done`      — the game has ended (a winner exists); no further actions.
 */
export type TurnStep = "recruit" | "movefight" | "done";

/* ------------------------------------------------------------------ */
/* Session errors                                                      */
/* ------------------------------------------------------------------ */

/** The reason a session operation was rejected. */
export type SessionErrorKind =
  /** The action is not in the session's current `legalMoves`. */
  | "not-a-legal-move"
  /** The action is not valid for the current turn step. */
  | "wrong-step"
  /** The game has already ended; no further actions may be selected. */
  | "turn-already-ended"
  /** No suitable land cell was found to place both Home Trees on. */
  | "no-suitable-home";

/** A typed error describing why a session operation was rejected. */
export class GameSessionError extends Error {
  readonly kind: SessionErrorKind;

  constructor(kind: SessionErrorKind, message: string) {
    super(message);
    this.name = "GameSessionError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Session value                                                       */
/* ------------------------------------------------------------------ */

/** An immutable snapshot of one human turn in a Human vs AI game. */
export interface GameSession {
  /** The game state at the start of the human's turn (before income/actions). */
  baseState: GameState;
  /** The projected state after the human's selected actions so far this turn. */
  state: GameState;
  /** The human's selected actions this turn, in order. */
  moves: GameAction[];
  /** The turn step the human is currently on. */
  step: TurnStep;
  /** The legal actions the human may select next, filtered to the current step. */
  legalMoves: GameAction[];
  /** The AI seed used to run the AI's reply on submit (deterministic). */
  aiSeed: number;
  /** The AI options used to run the AI's reply on submit. */
  aiOptions: AiOptions;
  /**
   * The optional trained-AI opponent policy (M28-T3, #204) used for the AI's
   * replies on submit. When present and valid it selects the opponent's moves
   * at higher precedence than the base AI; when absent or invalid the session
   * falls back to the rule-legal base AI (see `src/core/trainedOpponent.ts`).
   */
  trainedPolicy?: TrainedAiPolicy | null;
  /** The winner, or null while the game is in progress. */
  winner: PlayerId | null;
}

/* ------------------------------------------------------------------ */
/* Generated-map setup helpers                                         */
/* ------------------------------------------------------------------ */

/** A stable key for a hex. */
function hexKey(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

/**
 * The three neighbour hexes the standard `startingForce` occupies around a
 * Home Tree (origin, and the first three of `adjacentHexes(origin)`). Used to
 * guarantee those hexes are land so no starting unit is placed in the sea.
 */
function forceHexes(home: Hex): Hex[] {
  const [n1, n2, n3] = adjacentHexes(home);
  return [home, n1, n2, n3];
}
/**
 * Whether the hex is a solid land surface (land or mountain) on the map.
 * Out-of-bounds hexes are treated as not land surface.
 */
function isLandAt(map: GameMap, hex: Hex): boolean {
  const terrain = terrainAt(map, hex);
  return terrain !== null && isLandSurface(terrain);
}

/**
 * A tiny deterministic PRNG-driven index picker for the spawn randomness.
 * `next(n)` returns a random integer in `[0, n)` from the seeded RNG, so the
 * same `seed` always yields the same choice (fully reproducible setup).
 */
function seededRandomInt(seed: number): (n: number) => number {
  const rng = mulberry32(seed);
  return (n: number) => Math.floor(rng() * n);
}

/**
 * Choose one Home Tree hex per player on opposite sides of the generated
 * island, picking a **random** spawn spot on each side (rather than the fixed
 * leftmost/rightmost of the map).
 *
 * A candidate hex must be plain `land` (not mountain) and its starting-force
 * neighbourhood (the home plus the three neighbouring hexes the rules'
 * starting force occupies) must be entirely land surface, so the Home Tree
 * sits on land and no starting unit is placed in the sea or outside the map.
 *
 * The candidates are then split by the island's `q` axis into a left half and
 * a right half (around the map's mid-column). `p1` is picked at random from
 * the left half and `p2` at random from the right half, so the two Home Trees
 * sit on opposite-ish sides of the island while the exact hex varies per
 * generation. The pick is driven by the seeded RNG, so a fixed `seed`
 * reproduces the same spawn deterministically; a fresh `seed` (from a fresh
 * game) picks different spots.
 *
 * When a side has no suitable candidates (degenerate maps), the pick falls
 * back to the leftmost/rightmost over the whole candidate set so the legality
 * and separation guarantees still hold.
 *
 * Throws a typed `GameSessionError` (`no-suitable-home`) when the map is too
 * small / degenerate to fit two such Home Trees.
 */
export function chooseHomeHexes(
  map: GameMap,
  seed = 0,
): { p1: Hex; p2: Hex } {
  const candidates = map.cells
    .filter((cell) => cell.terrain === "land")
    .map((cell) => cell.hex)
    .filter((hex) => forceHexes(hex).every((h) => isLandAt(map, h)));

  if (candidates.length < 2) {
    throw new GameSessionError(
      "no-suitable-home",
      "Cannot place two Home Trees on opposite sides of the generated map: " +
        "not enough suitable land cells",
    );
  }

  const nextInt = seededRandomInt(seed);
  const midQ = map.width / 2;
  const leftHalf = candidates.filter((h) => h.q < midQ);
  const rightHalf = candidates.filter((h) => h.q >= midQ);

  const byQ = [...candidates].sort((a, b) => a.q - b.q || a.r - b.r);
  let p1: Hex;
  let p2: Hex;
  if (leftHalf.length > 0 && rightHalf.length > 0) {
    p1 = leftHalf[nextInt(leftHalf.length)];
    p2 = rightHalf[nextInt(rightHalf.length)];
  } else {
    // Degenerate distribution: fall back to the opposite extremes so both
    // Home Trees still land on clearly separated sides.
    p1 = byQ[0];
    p2 = byQ[byQ.length - 1];
  }

  return { p1, p2 };
}

/**
 * Place the 6 neutral Groves and 4 neutral Nests on land cells between the
 * two Home Trees.
 *
 * The sites are placed on plain `land` cells (not mountains, not water) that
 * are not already occupied by a Home Tree or a starting unit, chosen to lie
 * closest to the midpoint between the two Home Trees so the neutral sites sit
 * "between" the players. Returns 6 Groves followed by 4 Nests.
 */
function placeNeutralSites(map: GameMap, p1Home: Hex, p2Home: Hex): Site[] {
  const used = new Set<string>([
    ...forceHexes(p1Home).map(hexKey),
    ...forceHexes(p2Home).map(hexKey),
  ]);
  const mid = { q: (p1Home.q + p2Home.q) / 2, r: (p1Home.r + p2Home.r) / 2 };

  const available = map.cells
    .filter((cell) => cell.terrain === "land")
    .map((cell) => cell.hex)
    .filter((hex) => !used.has(hexKey(hex)))
    .sort((a, b) => hexDistance(a, mid) - hexDistance(b, mid))
    .slice(0, 10);

  return [
    ...available.slice(0, 6).map((h) => createSite("Grove", h.q, h.r)),
    ...available.slice(6, 10).map((h) => createSite("Nest", h.q, h.r)),
  ];
}

/**
 * The default number of neutral units placed on the map during setup (M30-T2,
 * #225). A small "handful" per the issue — enough to add neutral presence
 * without crowding the board or the spawns.
 */
export const DEFAULT_NEUTRAL_UNIT_COUNT = 8;

/**
 * Derive the seed driving neutral-unit placement from the map/spawn seed.
 *
 * XOR-ing a fixed constant into the map seed yields a **distinct** deterministic
 * RNG stream for neutral placement, so the neutral layout is orthogonal to the
 * map/spawn randomness: a fresh map seed still produces a fresh neutral layout,
 * while a fixed `MapConfig.seed` reproduces the exact same neutral units (tests
 * can pass an explicit `seed` to pin the whole setup, neutrals included).
 */
function neutralSeedFor(mapSeed: number): number {
  return (mapSeed ^ 0x5f3759df) >>> 0;
}

/**
 * Place a small number of random neutral ape units (`owner` null) on the map
 * during setup, driven by a seeded RNG so a fixed seed reproduces the exact
 * same placement (M30-T2, #225).
 *
 * Each neutral unit lands on a plain-land cell that is **clear of** the player
 * Home-Tree spawn hexes/neighbourhoods (`occupiedKeys`) and the existing
 * neutral Groves/Nests (also in `occupiedKeys`), so neutrals never block or
 * overlap spawns or sites too aggressively. Cells are drawn without
 * replacement, so no two neutral units share a hex. When fewer than `count`
 * land cells are available, only as many as fit are placed.
 *
 * @param map the generated board the units are placed on (must have plain-land
 *   cells to place onto).
 * @param occupiedKeys the hex keys to keep clear (home force hexes + all site
 *   hexes, including the Home Trees and the neutral Groves/Nests).
 * @param count the number of neutral units to place (default
 *   {@link DEFAULT_NEUTRAL_UNIT_COUNT}).
 * @param seed the seeded RNG seed; a fixed seed reproduces the exact layout.
 */
export function placeNeutralUnits(
  map: GameMap,
  occupiedKeys: ReadonlySet<string>,
  count: number = DEFAULT_NEUTRAL_UNIT_COUNT,
  seed = 0,
): ApeUnit[] {
  const available = map.cells
    .filter((cell) => cell.terrain === "land")
    .map((cell) => cell.hex)
    .filter((hex) => !occupiedKeys.has(hexKey(hex)));

  // Seeded Fisher–Yates shuffle, then keep the first `count` as the neutral
  // unit hexes — deterministic for a given seed and without replacement.
  const rng = mulberry32(seed);
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length)).map(
    (hex) => createUnit("Monkey", null, hex),
  );
}

/* ------------------------------------------------------------------ */
/* Standard two-player setup                                           */
/* ------------------------------------------------------------------ */

/**
 * Produce a fresh random non-negative integer seed.
 *
 * Used when a game is created **without** an explicit `MapConfig.seed`, so
 * every fresh load starts on a different map with different spawn locations
 * (issue #215 items 2 and 3). Not a browser API — this is plain JS — and only
 * the *source* of the seed is random; the map generator and spawn picker are
 * still fully deterministic given a seed, so an explicit seed reproduces a
 * setup exactly.
 */
export function randomSeed(): number {
  // Combine time and a random sample so back-to-back setups (both may share
  // the same ms) still very likely choose different seeds.
  return (Date.now() & 0x3fffffff) ^ Math.floor(Math.random() * 0x7fffffff);
}

/**
 * Build the standard two-player setup from the rules on a freshly generated
 * map.
 *
 * A new playable map is generated via `generateMap` (M9-T1) each time setup
 * runs — by default 17×17 with the default generation props (the smaller,
 * clearly-circular default map, M31-T2 #226) — so every game
 * starts on a fresh board instead of a fixed small one. When no explicit
 * `MapConfig.seed` is supplied a fresh random seed is drawn (see
 * `randomSeed`), so two `standardSetup()` calls produce **different** maps and
 * **different** spawn locations (issue #215 items 2 and 3). Pass an optional
 * `MapConfig` with an explicit `seed` to reproduce a specific map **and** its
 * spawn placement deterministically.
 *
 * Per the rules each player places one Home Tree on opposite sides of the
 * island, with 6 neutral Groves and 4 Nests between them, and starts with the
 * standard `startingForce` (3 Monkeys, 1 Gibbon; p1 starts with 3 bananas
 * under the first-mover compensation #247, p2 with 2). A handful of
 * random neutral ape units (M30-T2, #225) are placed on land cells clear of the
 * spawns and sites, driven by a seeded RNG derived from the map seed. Both
 * Home Trees and every site are placed on land cells, and no starting unit is
 * placed in the sea. The generated board is carried on the returned state's
 * `map`.
 *
 * The returned state has `p1` as the current player. Under the first-mover
 * compensation (M33-T1 #247) the first player **p1** begins with **3** bananas
 * (the +1 head-start codified in the Setup rules) while **p2** begins with the
 * base **2** bananas, so the opening is not a straight race into the shared
 * contested zone. Throws a typed `GameSessionError` (`no-suitable-home`) if the
 * map is too degenerate to place both Home Trees on land.
 */
export function standardSetup(config?: MapConfig): GameState {
  // The effective seed drives BOTH the map and the spawn pick, so an explicit
  // seed is fully deterministic end-to-end while a fresh load (no seed) draws
  // a fresh random seed. `chooseHomeHexes` must see exactly the seed used to
  // build `map`, or reproduction under a fixed seed would not match.
  const explicitSeed = config !== undefined && config.seed !== undefined;
  const seed = explicitSeed ? (config as MapConfig).seed as number : randomSeed();
  const mapConfig: MapConfig = explicitSeed ? config as MapConfig : { ...config, seed };
  const map = generateMap(mapConfig);
  const { p1: p1Home, p2: p2Home } = chooseHomeHexes(map, seed);

  // First-mover compensation (M33-T1 #247): the first player p1 starts with
  // the +1 banana head-start (3 total) codified in the Setup rules, while p2
  // starts with the base force of 2. Both otherwise have identical apes.
  const p1 = startingForce("p1", p1Home, 3);
  const p2 = startingForce("p2", p2Home);

  // The neutral sites (6 Groves + 4 Nests) placed between the players.
  const neutralSites = placeNeutralSites(map, p1Home, p2Home);

  // Place a handful of random neutral units (M30-T2, #225) on land cells clear
  // of the player Home-Tree spawn hexes/**neighbourhoods** (home + all six
  // adjacent hexes, so a neutral never sits right next to a Home Tree) and the
  // neutral sites, driven by a seeded RNG derived from the map seed so a fixed
  // seed reproduces the exact layout while a fresh seed yields a fresh neutral
  // placement. `forceHexes` covers the Home Tree hex and the three starting-
  // force neighbours; `adjacentHexes` adds the remaining three so the whole
  // neighbourhood is excluded.
  const occupiedKeys = new Set<string>([
    ...forceHexes(p1Home).map(hexKey),
    ...forceHexes(p2Home).map(hexKey),
    ...adjacentHexes(p1Home).map(hexKey),
    ...adjacentHexes(p2Home).map(hexKey),
    ...neutralSites.map((s) => hexKey(s.hex)),
  ]);
  const neutralUnits = placeNeutralUnits(map, occupiedKeys, undefined, neutralSeedFor(seed));

  // Seed persistent site-less territory (M24-T2, #160): every site-less cell a
  // player's starting unit stands on becomes that kingdom's territory and
  // stays owned after the unit vacates. The Home Tree cells are already owned
  // via their site, so only the site-less force cells are recorded.
  const territory: Record<string, PlayerId> = {};
  const homeSites = new Set<string>([hexKey(p1Home), hexKey(p2Home)]);
  for (const unit of [...p1.units, ...p2.units]) {
    if (homeSites.has(hexKey(unit.hex))) continue;
    /* c8 ignore start -- starting-force units are always player-owned, so a
       neutral unit can never reach this loop (they are excluded from the
       territory record by construction); this guard only narrows the nullable
       `ApeUnit.owner` type. */
    if (unit.owner === null) continue;
    /* c8 ignore stop */
    territory[hexKey(unit.hex)] = unit.owner;
  }

  return {
    map,
    sites: [
      createSite("HomeTree", p1Home.q, p1Home.r, "p1"),
      createSite("HomeTree", p2Home.q, p2Home.r, "p2"),
      ...neutralSites,
    ],
    units: [...p1.units, ...p2.units, ...neutralUnits],
    players: { p1: p1.player, p2: p2.player },
    currentPlayer: "p1",
    turnOrder: ["p1", "p2"],
    winner: null,
    territory,
  };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Reset `hasActed` to false for every unit owned by the given player, marking
 * them as able to act this turn (per the rules, "each ape that was under your
 * control at the start of your turn may act once"). Returns a new
 * `GameState`; does not mutate the input.
 */
function resetUnitsForTurn(state: GameState, playerId: PlayerId): GameState {
  return {
    ...state,
    // Neutral units are static guardians (M30-T4 #233) that never act: they
    // are never reset to actionable, so a neutral unit's `hasActed` stays
    // `true` across every turn and it can never move, attack, or join on its
    // own. Only the current player's own units are reset.
    units: state.units.map((u) =>
      isNeutralUnit(u) || u.owner !== playerId ? u : { ...u, hasActed: false },
    ),
  };
}

/**
 * Project the human's selected `moves` onto `baseState` to produce the state
 * the game would be in after those selections: reset the current player's
 * units so they may act, collect income automatically (per the rules income
 * is collected at the start of the turn, so there is no manual step A), then
 * apply the selected recruit / move / fight actions in rule order via
 * `applyHumanMoves`. Returns a new `GameState`; does not mutate the input.
 *
 * With `moves = []` this yields the start-of-turn state: units reset and the
 * turn's income already collected.
 */
function projectState(baseState: GameState, moves: GameAction[]): GameState {
  let s = resetUnitsForTurn(baseState, baseState.currentPlayer);
  s = collectIncome(s);
  return applyHumanMoves(s, moves);
}

/**
 * The legal actions available to the human at a given turn step for a state
 * that has already had income collected automatically and the human's moves
 * applied.
 *
 *  - `recruit`   — every recruit / move / attack action (income is collected
 *                  automatically at the start of the turn, so `collectIncome`
 *                  is never offered as a manual action).
 *  - `movefight` — only move / attack actions (recruiting is over).
 *  - `done`      — no actions (the game has ended).
 */
function legalMovesFor(state: GameState, step: TurnStep): GameAction[] {
  const all = legalActions(state);
  switch (step) {
    case "recruit":
      return all.filter((a) => a.type !== "collectIncome");
    case "movefight":
      return all.filter((a) => a.type === "move" || a.type === "attack");
    case "done":
      return [];
  }
}

/**
 * Whether two `GameAction` descriptors are equal (same type and same target
 * hexes / kind). Used to check that a selected action is one of the session's
 * legal moves.
 */
function sameAction(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    /* c8 ignore start -- a collectIncome action is never offered as a
       selectable legal action this session (income is applied automatically at
       the start of the turn), so `legalMoves` never contains one and this
       branch is unreachable by design. */
    case "collectIncome":
      return false;
    /* c8 ignore stop */
    case "recruit":
      return b.type === "recruit" && a.kind === b.kind && sameHex(a.hex, b.hex);
    case "move":
      return (
        b.type === "move" &&
        sameHex(a.unitHex, b.unitHex) &&
        sameHex(a.targetHex, b.targetHex)
      );
    case "attack":
      return (
        b.type === "attack" &&
        sameHex(a.attackerHex, b.attackerHex) &&
        sameHex(a.targetHex, b.targetHex)
      );
  }
}

/* ------------------------------------------------------------------ */
/* Session API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a new game session from the standard two-player setup.
 *
 * Income is applied automatically at the start of the turn (per the rules
 * "At the start of your turn, collect bananas from all sites you control"),
 * so the human's turn begins directly on the `recruit` step with the turn's
 * income already collected in the projected `state`. The returned session
 * exposes the initial `GameState` (`state`) and the current player's
 * `legalMoves` (recruit / move / attack).
 *
 * The AI's reply is driven by `aiSeed` (deterministic for a given seed) and
 * `aiOptions` (behavior knobs), both of which are carried through to
 * `submitTurn`. An optional `mapConfig` is passed to `standardSetup` to
 * reproduce a specific generated board deterministically (default 17×17). An
 * optional `trainedPolicy` (M28-T3) supplies the trained-AI opponent; when
 * absent the session falls back to the rule-legal AI for its replies.
 */
export function createGameSession(
  aiSeed = 0,
  aiOptions: AiOptions = {},
  mapConfig?: MapConfig,
  trainedPolicy?: TrainedAiPolicy | null,
): GameSession {
  const baseState = standardSetup(mapConfig);
  const state = projectState(baseState, []);
  return {
    baseState,
    state,
    moves: [],
    step: "recruit",
    legalMoves: legalMovesFor(state, "recruit"),
    aiSeed,
    aiOptions,
    trainedPolicy,
    winner: null,
  };
}

/**
 * Select one legal action for the human's turn.
 *
 * The action must be in the session's current `legalMoves` (which are already
 * filtered to the current turn step). Selecting it appends it to `moves`,
 * advances the turn step (moving or fighting moves to `movefight`), and
 * recomputes the projected `state` and the next `legalMoves`, so the
 * recruit -> move/fight ordering is enforced as the human builds their turn.
 *
 * Throws a typed `GameSessionError` when the action is not in `legalMoves`
 * (`not-a-legal-move`), is invalid for the current step (`wrong-step`), or the
 * game has already ended (`turn-already-ended`). Returns a new `GameSession`;
 * does not mutate the input.
 */
export function selectAction(
  session: GameSession,
  action: GameAction,
): GameSession {
  if (session.step === "done") {
    throw new GameSessionError(
      "turn-already-ended",
      "The game has already ended; no further actions may be selected",
    );
  }
  if (!session.legalMoves.some((legal) => sameAction(legal, action))) {
    throw new GameSessionError(
      "not-a-legal-move",
      `The action is not a legal move for the current turn step`,
    );
  }

  const moves = [...session.moves, action];
  let step = session.step;
  if (action.type === "move" || action.type === "attack") step = "movefight";

  const state = projectState(session.baseState, moves);
  return {
    ...session,
    moves,
    step,
    state,
    legalMoves: legalMovesFor(state, step),
  };
}

/**
 * End the human's turn and run the AI's reply.
 *
 * The selected `moves` are passed to `playTurn` from `src/core/gameLoop.ts`,
 * which collects income automatically at the start of the turn (step A), then
 * applies the human's actions in rule order (enforcing the ordering), runs the
 * AI's full turn via the seeded/deterministic AI layer, advances the turn, and
 * resolves victory.
 *
 * If a winner is produced, the returned session is marked `done` with the
 * winner set and no further `legalMoves`. Otherwise a fresh session for the
 * next human turn is returned (recruit step, income collected automatically,
 * empty moves, the resulting state).
 *
 * Throws a typed `GameSessionError` after the game has already ended
 * (`turn-already-ended`). If the submitted moves violate the turn-step
 * ordering, the underlying `TurnOrderError` from `gameLoop` is propagated.
 * Returns a new `GameSession`; does not mutate the input.
 */
export function submitTurn(session: GameSession): GameSession {
  if (session.step === "done") {
    throw new GameSessionError(
      "turn-already-ended",
      "The game has already ended",
    );
  }

  const result = playTurn(
    session.baseState,
    session.moves,
    session.aiSeed,
    session.aiOptions,
    undefined,
    0,
    session.trainedPolicy,
  );

  if (result.winner) {
    return {
      ...session,
      baseState: result,
      state: result,
      moves: [],
      step: "done",
      legalMoves: legalMovesFor(result, "done"),
      winner: result.winner,
    };
  }

  // Fresh session for the next human turn: the resulting `baseState` sits at
  // the start of the human's turn (income for this next turn not yet applied),
  // so project it to the recruit step with the turn's income collected.
  const state = projectState(result, []);
  return {
    ...session,
    baseState: result,
    state,
    moves: [],
    step: "recruit",
    legalMoves: legalMovesFor(state, "recruit"),
    winner: null,
  };
}

/**
 * Reset a session back to the start of the current human turn.
 *
 * Discards any actions the human has selected this turn (`moves`) and returns
 * a fresh session positioned at the recruit step on the current `baseState`
 * (the start of the turn, with income collected automatically), so the UI can
 * offer an "undo / clear selections" behaviour without losing the progress of
 * the game.
 *
 * If the game has already ended (`step === "done"`), the session is returned
 * unchanged — there is nothing to reset. Returns a new `GameSession`; does not
 * mutate the input.
 */
export function resetTurn(session: GameSession): GameSession {
  if (session.step === "done") return session;
  const state = projectState(session.baseState, []);
  return {
    ...session,
    state,
    moves: [],
    step: "recruit",
    legalMoves: legalMovesFor(state, "recruit"),
    winner: null,
  };
}
