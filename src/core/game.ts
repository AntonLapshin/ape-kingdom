/**
 * Core Ape Kingdom game entities and pure helpers.
 *
 * This module models the game's entities from
 * `guidelines/ape-kingdom-rules.md` (Ape Units table, Sites & Income table,
 * Setup) as pure TypeScript types. It has no React, Tailwind, or browser
 * dependencies, so it can be tested exhaustively and reused by the UI layer.
 */

// Type-only import of the generated-board model so a `GameState` can carry
// the board built by `standardSetup`. `mapGenerator.ts` imports runtime
// helpers from this module; this type-only import is erased at compile time,
// so the runtime dependency stays one-directional.
import type { GameMap } from "./mapGenerator";

/* ------------------------------------------------------------------ */
/* Ape units                                                           */
/* ------------------------------------------------------------------ */

/** The four ape ranks. Rank determines combat strength. */
export type ApeRank = 1 | 2 | 3 | 4;

/** The four ape unit kinds, from weakest to strongest. */
export type ApeKind = "Monkey" | "Gibbon" | "Chimpanzee" | "Gorilla";

/** Static attributes of an ape kind, taken from the Ape Units table. */
export interface ApeType {
  /** Display name of the ape. */
  kind: ApeKind;
  /** Combat strength / rank (1–4). */
  rank: ApeRank;
  /** Banana cost to recruit. */
  cost: number;
  /** Hexes this ape can move per turn. */
  movement: number;
}

/** A concrete ape unit placed on the map, owned by a player. */
export interface ApeUnit {
  /** Which ape kind this unit is. */
  kind: ApeKind;
  /** The player who owns this unit. */
  owner: PlayerId;
  /** The hex this unit occupies. */
  hex: Hex;
  /** Whether the unit may act this turn (false for newly recruited apes). */
  hasActed: boolean;
}

/* ------------------------------------------------------------------ */
/* Hex map                                                             */
/* ------------------------------------------------------------------ */

/**
 * A hex on the map, identified by axial coordinates (q, r).
 * See https://www.redblobgames.com/grids/hexagons/ for the axial system.
 */
export interface Hex {
  /** Column (x) coordinate. */
  q: number;
  /** Row (y) coordinate. */
  r: number;
}

/* ------------------------------------------------------------------ */
/* Hex helpers                                                         */
/* ------------------------------------------------------------------ */

/** Whether two hexes are the same hex. */
export function sameHex(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * The six axial neighbours of a hex.
 * See https://www.redblobgames.com/grids/hexagons/ for the axial system.
 */
export function adjacentHexes(hex: Hex): Hex[] {
  const { q, r } = hex;
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

/** Whether two hexes are adjacent (share an edge). */
export function areAdjacent(a: Hex, b: Hex): boolean {
  return adjacentHexes(a).some((h) => sameHex(h, b));
}

/* ------------------------------------------------------------------ */
/* Sites                                                               */
/* ------------------------------------------------------------------ */

/** The three kinds of sites in the game. */
export type SiteKind = "Grove" | "Nest" | "HomeTree";

/** Static attributes of a site kind, taken from the Sites & Income table. */
export interface SiteType {
  /** Display name of the site. */
  kind: SiteKind;
  /** Banana income produced each turn for its controller. */
  income: number;
  /** Whether the site allows recruitment of apes. */
  allowsRecruitment: boolean;
}

/** A site placed on a hex, optionally controlled by a player. */
export interface Site {
  /** Which kind of site this is. */
  kind: SiteKind;
  /** The hex this site occupies. */
  hex: Hex;
  /** The player controlling it, or null while neutral. */
  owner: PlayerId | null;
}

/* ------------------------------------------------------------------ */
/* Players                                                             */
/* ------------------------------------------------------------------ */

/** Identifier for a player. */
export type PlayerId = string;

/** A player's persistent state. */
export interface Player {
  /** Unique player identifier. */
  id: PlayerId;
  /** Banana balance (may be saved without limit). */
  bananas: number;
  /** Whether the player has been eliminated from active play. */
  eliminated: boolean;
}

/* ------------------------------------------------------------------ */
/* Game state                                                          */
/* ------------------------------------------------------------------ */

/** The full state of a game. */
export interface GameState {
  /** All sites on the map, including neutral ones. */
  sites: Site[];
  /** All ape units on the map. */
  units: ApeUnit[];
  /** Player state, keyed by player id. */
  players: Record<PlayerId, Player>;
  /** The player whose turn it is. */
  currentPlayer: PlayerId;
  /** The player ids in turn order. */
  turnOrder: PlayerId[];
  /** The winning player, or null while the game is still in progress. */
  winner: PlayerId | null;
  /** The generated board the game is played on. */
  map: GameMap;
}

/* ------------------------------------------------------------------ */
/* Static data tables (from the rules)                                 */
/* ------------------------------------------------------------------ */

/** Static attributes for each ape kind (Ape Units table). */
export const APE_TYPES: Record<ApeKind, ApeType> = {
  Monkey: { kind: "Monkey", rank: 1, cost: 2, movement: 1 },
  Gibbon: { kind: "Gibbon", rank: 2, cost: 4, movement: 1 },
  Chimpanzee: { kind: "Chimpanzee", rank: 3, cost: 8, movement: 1 },
  Gorilla: { kind: "Gorilla", rank: 4, cost: 16, movement: 1 },
};

/** Static attributes for each site kind (Sites & Income table). */
export const SITE_TYPES: Record<SiteKind, SiteType> = {
  Grove: { kind: "Grove", income: 1, allowsRecruitment: false },
  Nest: { kind: "Nest", income: 2, allowsRecruitment: false },
  HomeTree: { kind: "HomeTree", income: 3, allowsRecruitment: true },
};

/** All ape kinds in ascending rank order. */
export const APE_KINDS: ApeKind[] = ["Monkey", "Gibbon", "Chimpanzee", "Gorilla"];

/** All site kinds. */
export const SITE_KINDS: SiteKind[] = ["Grove", "Nest", "HomeTree"];

/* ------------------------------------------------------------------ */
/* Pure helper functions                                               */
/* ------------------------------------------------------------------ */

/** Look up the static attributes of an ape kind. */
export function apeType(kind: ApeKind): ApeType {
  return APE_TYPES[kind];
}

/** Look up the static attributes of a site kind. */
export function siteType(kind: SiteKind): SiteType {
  return SITE_TYPES[kind];
}

/** The rank (combat strength) of an ape kind. */
export function rankOf(kind: ApeKind): ApeRank {
  return APE_TYPES[kind].rank;
}

/** The banana cost to recruit an ape kind. */
export function costOf(kind: ApeKind): number {
  return APE_TYPES[kind].cost;
}

/** The movement value of an ape kind. */
export function movementOf(kind: ApeKind): number {
  return APE_TYPES[kind].movement;
}

/** The banana income of a site kind. */
export function incomeOf(kind: SiteKind): number {
  return SITE_TYPES[kind].income;
}

/** Whether a site kind allows recruitment. */
export function allowsRecruitment(kind: SiteKind): boolean {
  return SITE_TYPES[kind].allowsRecruitment;
}

/**
 * Create a new ape unit at a hex.
 *
 * Newly recruited apes cannot move or attack until the next turn, so
 * `hasActed` is set to true by default (they have already "acted" for the
 * current turn).
 */
export function createUnit(
  kind: ApeKind,
  owner: PlayerId,
  hex: Hex,
  hasActed = true,
): ApeUnit {
  return { kind, owner, hex, hasActed };
}

/** Create a site on a hex, neutral by default. */
export function createSite(
  kind: SiteKind,
  q: number,
  r: number,
  owner: PlayerId | null = null,
): Site {
  return { kind, hex: { q, r }, owner };
}

/** Create a player with a starting banana balance. */
export function createPlayer(id: PlayerId, bananas = 0): Player {
  return { id, bananas, eliminated: false };
}

/**
 * Build the standard two-player setup force from the rules:
 * each player starts with 3 Monkeys, 1 Gibbon, and 2 bananas.
 *
 * The units are placed at the given origin hex and three of its neighbours
 * (one unit per hex). Returns the starting units and player state for the
 * given player id.
 */
export function startingForce(playerId: PlayerId, origin: Hex): {
  units: ApeUnit[];
  player: Player;
} {
  const [n1, n2, n3] = adjacentHexes(origin);
  return {
    units: [
      createUnit("Monkey", playerId, origin),
      createUnit("Monkey", playerId, n1),
      createUnit("Monkey", playerId, n2),
      createUnit("Gibbon", playerId, n3),
    ],
    player: createPlayer(playerId, 2),
  };
}

/* ------------------------------------------------------------------ */
/* Turn-sequence reducers                                              */
/* ------------------------------------------------------------------ */

/**
 * The total banana income the given player controls from their sites.
 *
 * Neutral sites (owner null) produce no income, per the rules:
 * "Neutral sites produce no income until captured."
 */
export function incomeFor(playerId: PlayerId, sites: Site[]): number {
  return sites.reduce((total, site) => {
    if (site.owner !== playerId) return total;
    return total + incomeOf(site.kind);
  }, 0);
}

/**
 * Turn-sequence step A: Collect Income.
 *
 * Credits the current player with the banana income of every site they
 * control (Grove=1, Nest=2, Home Tree=3 per `SITE_TYPES`). Neutral sites
 * produce no income. Bananas may be saved without limit, so the income is
 * added to the current player's existing balance.
 *
 * Returns a new `GameState` and does not mutate the input.
 */
export function collectIncome(state: GameState): GameState {
  const income = incomeFor(state.currentPlayer, state.sites);
  return {
    ...state,
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...state.players[state.currentPlayer],
        bananas: state.players[state.currentPlayer].bananas + income,
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Recruit apes (Turn Sequence step B)                                 */
/* ------------------------------------------------------------------ */

/** The reason a recruitment attempt was rejected. */
export type RecruitErrorKind =
  /** The target hex is not a controlled Home Tree or adjacent to one. */
  | "no-home-tree"
  /** The target hex is already occupied by a unit. */
  | "occupied"
  /** The current player cannot afford the ape. */
  | "cannot-afford";

/** A typed error describing why recruitment was rejected. */
export class RecruitError extends Error {
  readonly kind: RecruitErrorKind;

  constructor(kind: RecruitErrorKind, message: string) {
    super(message);
    this.name = "RecruitError";
    this.kind = kind;
  }
}

/**
 * Turn-sequence step B: Recruit Apes.
 *
 * Lets the current player spend bananas to recruit an ape `kind` at a Home
 * Tree they control. The new ape may be placed on the Home Tree hex (if
 * empty) or on an adjacent empty hex. The cost is deducted from the current
 * player's banana balance per `APE_TYPES` (Monkey=2, Gibbon=4, Chimpanzee=8,
 * Gorilla=16).
 *
 * The recruitment is rejected with a typed `RecruitError` when:
 *  - the target hex is not a controlled Home Tree or adjacent to one;
 *  - the target hex is occupied by a unit; or
 *  - the current player cannot afford the ape.
 *
 * Newly recruited apes are created with `hasActed = true` so they cannot act
 * until the next turn. Returns a new `GameState` and does not mutate the input.
 */
export function recruitUnit(state: GameState, kind: ApeKind, hex: Hex): GameState {
  const player = state.players[state.currentPlayer];
  const cost = costOf(kind);

  // The target must be a Home Tree the current player controls, or adjacent
  // to one (placement is allowed on the Home Tree hex or an adjacent hex).
  const hasControlledHomeTree = state.sites.some(
    (site) =>
      site.kind === "HomeTree" &&
      site.owner === state.currentPlayer &&
      (sameHex(site.hex, hex) || areAdjacent(site.hex, hex)),
  );
  if (!hasControlledHomeTree) {
    throw new RecruitError(
      "no-home-tree",
      `Cannot recruit at hex (${hex.q},${hex.r}): it is not a controlled Home Tree or an adjacent empty hex`,
    );
  }

  // The target hex must be empty (not occupied by a unit).
  if (state.units.some((unit) => sameHex(unit.hex, hex))) {
    throw new RecruitError(
      "occupied",
      `Cannot recruit at hex (${hex.q},${hex.r}): the hex is occupied`,
    );
  }

  // The current player must be able to afford the ape.
  if (player.bananas < cost) {
    throw new RecruitError(
      "cannot-afford",
      `Cannot recruit ${kind}: it costs ${cost} bananas but the player has ${player.bananas}`,
    );
  }

  return {
    ...state,
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...player,
        bananas: player.bananas - cost,
      },
    },
    units: [...state.units, createUnit(kind, state.currentPlayer, hex)],
  };
}

/* ------------------------------------------------------------------ */
/* Move and capture (Turn Sequence step C — movement part)             */
/* ------------------------------------------------------------------ */

/** The reason a movement attempt was rejected. */
export type MoveErrorKind =
  /** The unit has already acted this turn (moved or attacked). */
  | "already-acted"
  /** The target hex is farther than the unit's Movement value. */
  | "out-of-range"
  /** The target hex is occupied by another unit. */
  | "occupied";

/** A typed error describing why a move was rejected. */
export class MoveError extends Error {
  readonly kind: MoveErrorKind;

  constructor(kind: MoveErrorKind, message: string) {
    super(message);
    this.name = "MoveError";
    this.kind = kind;
  }
}

/**
 * The straight-line (hex-distance) number of steps between two hexes.
 *
 * See https://www.redblobgames.com/grids/hexagons/ for the axial distance
 * formula. A distance of 1 means the hexes are adjacent; 0 means the same hex.
 */
export function hexDistance(a: Hex, b: Hex): number {
  const { q: q1, r: r1 } = a;
  const { q: q2, r: r2 } = b;
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(q1 + r1 - q2 - r2));
}

/**
 * Turn-sequence step C (movement part): Move and Capture.
 *
 * Moves a unit up to its Movement value (standard 1 hex) toward `targetHex`.
 * The unit must be owned by the current player and must not have already
 * acted this turn (a unit may not move after attacking, and newly recruited
 * apes are marked `hasActed = true` so they cannot act until the next turn).
 *
 * The move is rejected with a typed `MoveError` when:
 *  - the unit has already acted this turn (`already-acted`);
 *  - the target hex is farther than the unit's Movement value (`out-of-range`);
 *  - the target hex is occupied by another unit (`occupied`).
 *
 * Because standard movement is 1 hex, "may not move through enemy units" is
 * enforced by the occupied-target check — with a single-step move there are
 * no intermediate path hexes to pass through.
 *
 * Moving onto an unoccupied Grove, Nest, or Home Tree captures that site for
 * the moving unit's owner (site ownership changes). Returns a new `GameState`
 * with the unit's `hasActed` set to true; does not mutate the input.
 *
 * Combat (attacking adjacent enemy units) is handled in a later task and is
 * out of scope here.
 */
export function moveUnit(state: GameState, unit: ApeUnit, targetHex: Hex): GameState {
  // The unit must belong to the current player and exist in the state.
  const existing = state.units.find((u) => u === unit || sameHex(u.hex, unit.hex));
  if (!existing || existing.owner !== state.currentPlayer) {
    throw new MoveError(
      "already-acted",
      `Cannot move a unit that is not owned by the current player`,
    );
  }

  // A unit may not move after attacking or acting this turn.
  if (existing.hasActed) {
    throw new MoveError(
      "already-acted",
      `Unit at (${existing.hex.q},${existing.hex.r}) has already acted this turn`,
    );
  }

  // The target must be within the unit's Movement value.
  const distance = hexDistance(existing.hex, targetHex);
  const movement = movementOf(existing.kind);
  if (distance > movement) {
    throw new MoveError(
      "out-of-range",
      `Cannot move ${existing.kind} from (${existing.hex.q},${existing.hex.r}) to ` +
        `(${targetHex.q},${targetHex.r}): distance ${distance} exceeds movement ${movement}`,
    );
  }

  // The target hex must not be occupied by another unit (a unit may not enter
  // a hex occupied by another unit, nor move through enemy units — with a
  // single-step standard move, the target is the only hex on the path).
  if (state.units.some((u) => u !== existing && sameHex(u.hex, targetHex))) {
    throw new MoveError(
      "occupied",
      `Cannot move to (${targetHex.q},${targetHex.r}): the hex is occupied`,
    );
  }

  // Update the unit's hex and mark it as acted this turn.
  const units = state.units.map((u) =>
    u === existing ? { ...u, hex: targetHex, hasActed: true } : u,
  );

  // Capture an unoccupied site at the target hex for the moving unit's owner.
  const sites = state.sites.map((site) =>
    sameHex(site.hex, targetHex) ? { ...site, owner: existing.owner } : site,
  );

  return { ...state, units, sites };
}

/* ------------------------------------------------------------------ */
/* Combat (Turn Sequence step C — attack part)                         */
/* ------------------------------------------------------------------ */

/** The reason an attack attempt was rejected. */
export type AttackErrorKind =
  /** The attacker is not owned by the current player. */
  | "not-owner"
  /** The attacker has already acted this turn. */
  | "already-acted"
  /** The target hex is not adjacent to the attacker. */
  | "not-adjacent"
  /** There is no unit (enemy or otherwise) at the target hex. */
  | "no-enemy";

/** A typed error describing why an attack was rejected. */
export class AttackError extends Error {
  readonly kind: AttackErrorKind;

  constructor(kind: AttackErrorKind, message: string) {
    super(message);
    this.name = "AttackError";
    this.kind = kind;
  }
}

/**
 * Turn-sequence step C (attack part): Combat.
 *
 * Resolves a single attack by `attacker` against an enemy unit at
 * `targetHex`. The attacker must be owned by the current player, must not
 * have already acted this turn (a unit may not move after attacking, and may
 * attack only once per turn), and must be adjacent to an enemy-occupied
 * target hex.
 *
 * Combat is resolved by comparing ranks per the rules table:
 *  - attacker rank higher → defender is destroyed, attacker moves into the
 *    defender's hex;
 *  - equal ranks → both units are destroyed;
 *  - attacker rank lower → attacker is destroyed, defender remains.
 *
 * If the defender was occupying a site and the attacker wins, the attacker
 * captures that site (site owner becomes the attacker's owner). If both units
 * are destroyed, site ownership does not change.
 *
 * The attack is rejected with a typed `AttackError` when:
 *  - the attacker is not owned by the current player (`not-owner`);
 *  - the attacker has already acted this turn (`already-acted`);
 *  - the target hex is not adjacent to the attacker (`not-adjacent`);
 *  - there is no enemy unit at the target hex (`no-enemy`).
 *
 * Returns a new `GameState` and does not mutate the input.
 */
export function attackUnit(
  state: GameState,
  attacker: ApeUnit,
  targetHex: Hex,
): GameState {
  // The attacker must exist in the state and be owned by the current player.
  const existing = state.units.find((u) => u === attacker || sameHex(u.hex, attacker.hex));
  if (!existing || existing.owner !== state.currentPlayer) {
    throw new AttackError(
      "not-owner",
      `Cannot attack with a unit that is not owned by the current player`,
    );
  }

  // A unit may attack only once per turn. A unit may not move after
  // attacking, so an attacker that has already acted cannot attack.
  if (existing.hasActed) {
    throw new AttackError(
      "already-acted",
      `Unit at (${existing.hex.q},${existing.hex.r}) has already acted this turn`,
    );
  }

  // The target must be adjacent to the attacker.
  if (!areAdjacent(existing.hex, targetHex)) {
    throw new AttackError(
      "not-adjacent",
      `Cannot attack from (${existing.hex.q},${existing.hex.r}) to ` +
        `(${targetHex.q},${targetHex.r}): the target is not adjacent`,
    );
  }

  // There must be an enemy unit at the target hex.
  const defender = state.units.find((u) => sameHex(u.hex, targetHex));
  if (!defender) {
    throw new AttackError(
      "no-enemy",
      `Cannot attack (${targetHex.q},${targetHex.r}): there is no unit there`,
    );
  }
  if (defender.owner === existing.owner) {
    throw new AttackError(
      "no-enemy",
      `Cannot attack (${targetHex.q},${targetHex.r}): the unit there is friendly`,
    );
  }

  const attackerRank = rankOf(existing.kind);
  const defenderRank = rankOf(defender.kind);

  // The attacker always acts this turn, regardless of the outcome.
  const actedAttacker = { ...existing, hasActed: true };
  let units: ApeUnit[];
  let sites: Site[] = state.sites;

  if (attackerRank > defenderRank) {
    // Attacker wins: defender is destroyed, attacker moves into its hex.
    units = state.units
      .filter((u) => u !== defender)
      .map((u) => (u === existing ? { ...actedAttacker, hex: targetHex } : u));
    // The attacker captures any site the defender occupied.
    sites = state.sites.map((site) =>
      sameHex(site.hex, targetHex) ? { ...site, owner: existing.owner } : site,
    );
  } else if (attackerRank === defenderRank) {
    // Equal ranks: both units are destroyed; site ownership does not change.
    units = state.units.filter((u) => u !== existing && u !== defender);
  } else {
    // Attacker rank lower: attacker is destroyed, defender remains.
    units = state.units.filter((u) => u !== existing);
  }

  return { ...state, units, sites };
}

/* ------------------------------------------------------------------ */
/* Elimination                                                         */
/* ------------------------------------------------------------------ */

/**
 * Whether a player is eliminated per the elimination rules.
 *
 * A player is eliminated if they control no Home Tree and have no units. A
 * player who controls no Home Tree but still has units is NOT eliminated and
 * may continue playing (recovering by capturing another Home Tree).
 */
export function isEliminated(
  playerId: PlayerId,
  sites: Site[],
  units: ApeUnit[],
): boolean {
  const controlsHomeTree = sites.some(
    (site) => site.kind === "HomeTree" && site.owner === playerId,
  );
  const hasUnits = units.some((unit) => unit.owner === playerId);
  return !controlsHomeTree && !hasUnits;
}

/**
 * Elimination reducer.
 *
 * Marks players as eliminated per the elimination rules: a player is
 * eliminated if they control no Home Tree and have no units. A player who
 * controls no Home Tree but still has units is NOT eliminated and may
 * continue playing (recovering by capturing another Home Tree).
 *
 * Eliminated players are marked `eliminated = true` on their player record
 * and dropped from `turnOrder` (removed from active play). Site and unit
 * ownership is left unchanged — an eliminated player has no units and no Home
 * Tree by definition, and their remaining sites (Groves/Nests) become neutral
 * only if another reducer re-owns them, so there is no orphaned state to
 * clean up here. Returns a new `GameState` and does not mutate the input.
 */
export function eliminatePlayers(state: GameState): GameState {
  const eliminated = new Set<PlayerId>();
  const players: Record<PlayerId, Player> = {};
  for (const id of Object.keys(state.players)) {
    const isGone = isEliminated(id, state.sites, state.units);
    if (isGone) eliminated.add(id);
    players[id] = { ...state.players[id], eliminated: isGone };
  }
  const turnOrder = state.turnOrder.filter((id) => !eliminated.has(id));
  return { ...state, players, turnOrder };
}

/* ------------------------------------------------------------------ */
/* Victory                                                             */
/* ------------------------------------------------------------------ */

/**
 * Determine the winner of the game per the victory rules.
 *
 * The game ends immediately when one player either:
 *  - controls every Home Tree on the map, or
 *  - is the only player not eliminated.
 *
 * Returns the winning player id, or `null` when the game is still in
 * progress (no player controls every Home Tree and more than one player
 * remains in active play).
 */
export function checkVictory(state: GameState): PlayerId | null {
  const homeTrees = state.sites.filter((site) => site.kind === "HomeTree");

  // Victory by controlling every Home Tree on the map. If there are no Home
  // Trees at all, no player can win this way (there is nothing to control).
  if (homeTrees.length > 0) {
    for (const id of Object.keys(state.players)) {
      const controlsAll = homeTrees.every((site) => site.owner === id);
      if (controlsAll) return id;
    }
  }

  // Victory by being the only player not eliminated. A player is eliminated
  // per `isEliminated` (controls no Home Tree and has no units). If exactly
  // one player is not eliminated, that player wins.
  const active = Object.keys(state.players).filter(
    (id) => !isEliminated(id, state.sites, state.units),
  );
  if (active.length === 1) return active[0];

  // No winner yet.
  return null;
}

/**
 * Victory detection reducer.
 *
 * Determines the game winner per the victory rules and returns a new
 * `GameState` with the `winner` field set to the winning player (or `null`
 * while the game is still in progress). Combines with the elimination
 * reducer: a player wins when all other players are eliminated. Returns a
 * new immutable `GameState` and does not mutate the input.
 */
export function resolveVictory(state: GameState): GameState {
  return { ...state, winner: checkVictory(state) };
}
