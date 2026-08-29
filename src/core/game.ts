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

/** A concrete ape unit placed on the map, owned by a player or neutral. */
export interface ApeUnit {
  /** Which ape kind this unit is. */
  kind: ApeKind;
  /** The player who owns this unit, or null if the unit is neutral. */
  owner: PlayerId | null;
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

/** A grave marker left where a bankrupt kingdom's unit died (M21-T2, #191). */
export interface Grave {
  /** The hex this grave occupies. */
  hex: Hex;
  /** The kingdom that owned the dead unit (pays this grave's upkeep each turn). */
  owner: PlayerId;
}

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
  /**
   * Persistent site-less territory (M24-T2, #160): hex-key → owning kingdom
   * for cells established as a kingdom's territory that carry no site. A
   * site-less cell a kingdom's unit stood on / claimed stays owned by that
   * kingdom after the unit vacates (it does not revert to neutral), and only
   * an enemy capturing the cell flips it. Site-owned cells are not recorded
   * here — their ownership always follows the site. Optional for
   * backward-compatibility with hand-built test states; `standardSetup`
   * always seeds it, and `isOwnedBy`/`territoryOwner` treat an absent value
   * as empty.
   */
  territory?: Record<string, PlayerId>;
  /**
   * Grave markers (M21-T2, #191): a grave is left where a unit died when its
   * kingdom's money went negative. Each grave costs its owning kingdom -1 per
   * turn (collected as upkeep against income), and a unit may clear a grave by
   * moving onto it, earning +2 for the harvester. Optional for
   * backward-compatibility with hand-built test states.
   */
  graves?: Grave[];
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

/** The highest ape rank / level (Gorilla). Joining can never exceed it. */
export const MAX_RANK: ApeRank = 4;

/**
 * The ape kind for a given rank/level (1=Monkey, 2=Gibbon, 3=Chimpanzee,
 * 4=Gorilla), used to resolve the kind a joined unit becomes. `level` is the
 * summed rank of the two joining units; it is always within 1–4 after the
 * join-cap check (`canJoinUnits`), so this never indexes out of bounds.
 */
export function kindForRank(level: ApeRank): ApeKind {
  return APE_KINDS[level - 1];
}

/**
 * Whether two same-kingdom units may join by adding levels.
 *
 * Joining adds the two units' ranks: 1+1=2, 2+1=3, 2+2=4, 3+1=4. A join is
 * possible only when the units belong to the same kingdom, both are still
 * movable this turn (neither has already acted), and the summed level does
 * not exceed the maximum rank (4). The cap is what makes 2+3 (and anything
 * summing over 4) impossible to combine.
 */
export function canJoinUnits(a: ApeUnit, b: ApeUnit): boolean {
  return (
    a.owner === b.owner &&
    !a.hasActed &&
    !b.hasActed &&
    rankOf(a.kind) + rankOf(b.kind) <= MAX_RANK
  );
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
  owner: PlayerId | null,
  hex: Hex,
  hasActed = true,
): ApeUnit {
  return { kind, owner, hex, hasActed };
}

/**
 * Whether a unit is neutral — i.e. it belongs to no kingdom (`owner` is null).
 *
 * Neutral units appear on the map without a controlling player (for example
 * the random neutral guardians placed during setup, M30-T2 #225). A neutral
 * unit is an enemy to every player: it can be attacked and defeated via the
 * normal combat rules (M30-T4 #233).
 */
export function isNeutralUnit(unit: ApeUnit): boolean {
  return unit.owner === null;
}

/* ------------------------------------------------------------------ */
/* Neutral-unit interaction (M30-T4, #233)                              */
/* ------------------------------------------------------------------ */

/**
 * Neutral units are **static guardians** (M30-T4, #233).
 *
 * Random neutral units are placed on the map at setup (M30-T2 #225) and then
 * remain in place until a player defeats them in combat. They are pure
 * territory-guardians, not participants in the turn cycle, so they:
 *
 *  - **never act on their own** across turns — they do not move, attack,
 *    join, recruit, or collect income. Because they belong to no player, the
 *    AI's legal enumeration only ever selects player-owned units, and turn
 *    advancement only resets `hasActed` for the current player's own units, so
 *    a neutral unit's `hasActed` stays `true` across every turn — it can
 *    never move, attack, or join (see {@link canNeutralUnitAct}).
 *  - **protect their surrounding cells** while they stand, via the existing
 *    Protection / Safety Zones rule (`isCellProtected`): an opposing unit of
 *    the same rank may not enter or attack into a cell adjacent to the
 *    neutral guardian.
 *  - when **defeated**, are removed from `state.units`, which automatically
 *    lifts any protection the neutral conferred over its surrounding cells.
 *    Those cells then become legal for players to enter and capture, so
 *    defeating a neutral guardian opens up the territory it held.
 *
 * All interaction with a neutral unit flows through the existing core
 * reducers and their typed errors. A player attacks a neutral unit with
 * `attackUnit` (its `owner` is `null`, so it is an enemy to every player),
 * resolving combat by the same rank rules as any battle; a neutral unit's hex
 * is never a legal `moveUnit` target (it is occupied), so a player must fight
 * to take a guardian's cell. Defeating a neutral on a site-less cell flips
 * that cell to the attacker's persistent territory, exactly as defeating a
 * player-owned unit does.
 */

/**
 * Whether a neutral unit may act on its own during a turn.
 *
 * Always returns `false`: neutral units are **static guardians** that never
 * take a turn of their own (M30-T4 #233). They are placed at setup and stay
 * put until a player defeats them in combat — they never move, attack, join,
 * recruit, or otherwise act across turns. This is the single code-level
 * definition of neutral cross-turn behaviour: callers that decide which units
 * may act (the AI legal enumeration, turn reset) treat a neutral unit as
 * never actionable.
 */
export function canNeutralUnitAct(): boolean {
  return false;
}

/** Create a grave marker on a hex, owned by the given kingdom. */
export function createGrave(hex: Hex, owner: PlayerId): Grave {
  return { hex, owner };
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
 * each player starts with 3 Monkeys and 1 Gibbon. The first player begins
 * with a small economy head-start (3 bananas, M33-T1 #247) to offset the
 * second mover's reply advantage, while the second player starts with the
 * base 2 bananas.
 *
 * The units are placed at the given origin hex and three of its neighbours
 * (one unit per hex). Returns the starting units and player state for the
 * given player id.
 */
export function startingForce(
  playerId: PlayerId,
  origin: Hex,
  /** Starting banana balance. Defaults to 2 (the base force); the first
   *  player's compensation passes 3 (see `standardSetup`). */
  bananas = 2,
): {
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
    player: createPlayer(playerId, bananas),
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

/** The grave markers on the state belonging to `playerId`. */
export function gravesFor(state: GameState, playerId: PlayerId): Grave[] {
  return (state.graves ?? []).filter((g) => g.owner === playerId);
}

/**
 * The grave upkeep owed by `playerId` this turn: -1 per grave they own.
 *
 * Each grave costs its owning kingdom -1 banana per turn (M21-T2, #191). The
 * current player's graves are paid against that turn's collected income.
 */
export function graveUpkeep(state: GameState, playerId: PlayerId): number {
  const count = gravesFor(state, playerId).length;
  return count === 0 ? 0 : -count;
}

/**
 * The grave at a hex, or `null` when the hex holds no grave.
 */
export function graveAt(state: GameState, hex: Hex): Grave | null {
  return (state.graves ?? []).find((g) => sameHex(g.hex, hex)) ?? null;
}

/**
 * Apply the bankruptcy / graves penalty to a kingdom whose money went
 * negative (M21-T2, #191): every unit that kingdom owns is removed and
 * replaced by a grave marker on its cell.
 *
 * When `state.players[playerId].bananas < 0`, all of that player's units die:
 * each unit is removed from `state.units` and a grave owned by that kingdom is
 * placed on the unit's former hex (`createGrave`). Units on the same target
 * cell each become their own grave (a cell can never hold two units, so every
 * grave lands on a distinct, now-empty cell). The remaining state (sites,
 * territory, other players) is unchanged.
 *
 * A kingdom `not` in arrears is returned unchanged. Returns a new `GameState`;
 * does not mutate the input.
 */
export function resolveBankruptcy(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  if (!player || player.bananas >= 0) return state;

  const dying = state.units.filter((u) => u.owner === playerId);
  const deadHexes = new Set(dying.map((u) => hexKey(u.hex)));
  const units = state.units.filter((u) => u.owner !== playerId);
  const graves = [
    ...(state.graves ?? []).filter((g) => !deadHexes.has(hexKey(g.hex))),
    ...dying.map((u) => createGrave(u.hex, playerId)),
  ];
  return { ...state, units, graves };
}

/**
 * Turn-sequence step A: Collect Income.
 *
 * Credits the current player with the banana income of every site they
 * control (Grove=1, Nest=2, Home Tree=3 per `SITE_TYPES`), then pays that
 * player's grave upkeep (M21-T2, #191): -1 banana per grave they own. Neutral
 * sites produce no income. Bananas may be saved without limit, so the income
 * (less grave upkeep) is added to the current player's existing balance.
 *
 * If, after collecting income and paying grave upkeep, the current player's
 * balance is negative, the graves mechanic triggers: all of that player's
 * units die and are replaced by grave markers on their cells
 * (`resolveBankruptcy`).
 *
 * Returns a new `GameState` and does not mutate the input.
 */
export function collectIncome(state: GameState): GameState {
  const income = incomeFor(state.currentPlayer, state.sites);
  const upkeep = graveUpkeep(state, state.currentPlayer);
  const bananas = state.players[state.currentPlayer].bananas + income + upkeep;
  const collected = {
    ...state,
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...state.players[state.currentPlayer],
        bananas,
      },
    },
  };
  return resolveBankruptcy(collected, state.currentPlayer);
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
    // A newly placed ape stands on a site-less cell, so that cell becomes the
    // kingdom's persistent site-less territory (M24-T2, #160).
    territory: state.sites.some((s) => sameHex(s.hex, hex))
      ? state.territory
      : { ...(state.territory ?? {}), [hexKey(hex)]: state.currentPlayer },
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
  | "occupied"
  /**
   * The target hex is inside an opposing unit's / Home Tree's protection
   * zone (Protection / Safety Zones rule) for this mover, so it may not
   * enter it.
   */
  | "protected"
  /**
   * The target hex holds a same-kingdom unit that cannot be joined: the
   * summed level exceeds the maximum rank (e.g. 2+3), or one of the units has
   * already acted this turn. Joining adds levels (1+1=2, 2+1=3, 2+2=4, 3+1=4)
   * and is only possible while both units are movable and the total ≤ max rank.
   */
  | "cannot-join"
  /** The target hex is a water cell, which units may not step onto. */
  | "water"
  /** The target hex is a mountain cell, which units may not step onto. */
  | "mountain";

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

/* ------------------------------------------------------------------ */
/* Owned-land movement (M20-T3, #148)                                  */
/* ------------------------------------------------------------------ */

/**
 * The maximum range granted to a unit whose entire route stays within cells
 * its own kingdom owns (see `isOwnedBy` and the movement rules in
 * `guidelines/ape-kingdom-rules.md`). Standard movement is 1 hex; a route
 * wholly through own land raises it to this value (up to 4 hexes).
 */
export const OWN_LAND_RANGE = 4;

/** A stable string key for a hex, used to deduplicate sets of hexes. */
export function hexKey(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

/**
 * Resolve the territory owner of a single hex from a game state's components
 * (M24-T2, #160). Independent of which unit (if any) stands on the cell, so a
 * site-less cell a kingdom's unit stood on / claimed stays owned by that
 * kingdom after the unit vacates.
 *
 * Ownership precedence on a cell:
 *  1. the site owner always wins when the cell has a site (a captured Grove,
 *     Nest, or Home Tree persists as that kingdom's territory independently
 *     of any unit);
 *  2. else the persistent site-less territory owner (a cell a kingdom's unit
 *     once occupied, retained until an enemy captures it);
 *  3. else the unit standing on it (a just-placed unit whose cell has not yet
 *     been recorded as territory owns the cell while it stands there).
 *
 * `territory` may be absent (empty) for hand-built states; site-less cells
 * then devolve to unit presence as before.
 */
export function territoryOwner(
  sites: Site[],
  units: ApeUnit[],
  territory: Record<string, PlayerId> | undefined,
  hex: Hex,
): PlayerId | null {
  const site = sites.find((s) => sameHex(s.hex, hex));
  if (site?.owner) return site.owner;
  const claimed = territory?.[hexKey(hex)];
  if (claimed) return claimed;
  const unit = units.find((u) => sameHex(u.hex, hex));
  return unit?.owner ?? null;
}

/**
 * Whether a hex is owned by `playerId`'s kingdom.
 *
 * A cell is owned by a kingdom when the kingdom owns the site on it (a
 * captured Grove, Nest, or Home Tree), when it is persistent site-less
 * territory of that kingdom (a cell one of its units once stood on / claimed,
 * which stays owned after the unit vacates — M24-T2, #160), or when one of
 * its units currently occupies it. This is the pure core model behind the UI
 * territory-owner derivation: the site owner always wins on a cell that has a
 * site, and persistent site-less territory is retained until an enemy
 * captures the cell. So a cell whose site is owned by an enemy is enemy
 * territory even if one of the mover's units stands on it, and the extended
 * own-land movement never treats it as own land.
 */
export function isOwnedBy(
  state: GameState,
  hex: Hex,
  playerId: PlayerId | null,
): boolean {
  return territoryOwner(state.sites, state.units, state.territory, hex) === playerId;
}

/**
 * Breadth-first search from `origin` through cells that pass `passable` and
 * are not `occupied`, collecting every distinct hex reachable within `range`
 * steps (the origin itself is excluded). This is the shared traversal behind
 * both the standard move range and the extended own-land range, so the legal
 * enumerators, the reachable-target derivation, and `moveUnit` agree on which
 * cells are reachable by construction.
 */
export function bfsReachable(
  origin: Hex,
  range: number,
  occupied: Set<string>,
  passable: (hex: Hex) => boolean,
): Hex[] {
  const result: Hex[] = [];
  const seen = new Set<string>([hexKey(origin)]);
  const queue: Array<{ hex: Hex; dist: number }> = [{ hex: origin, dist: 0 }];
  while (queue.length > 0) {
    const { hex, dist } = queue.shift() as { hex: Hex; dist: number };
    if (dist >= range) continue;
    for (const neighbour of adjacentHexes(hex)) {
      const key = hexKey(neighbour);
      if (seen.has(key)) continue;
      seen.add(key);
      if (occupied.has(key)) continue;
      if (!passable(neighbour)) continue;
      result.push(neighbour);
      queue.push({ hex: neighbour, dist: dist + 1 });
    }
  }
  return result;
}

/**
 * The full set of hexes a unit may legally move onto this turn, per the
 * movement rules:
 *
 *  - the standard move range (the unit's Movement value, 1 hex) over any
 *    passable, unoccupied land cell — this is how a unit captures new
 *    territory; and
 *  - the extended own-land range (`OWN_LAND_RANGE`, up to 4 hexes) over any
 *    passable, unoccupied cell owned by the mover's kingdom — moving deeper
 *    through your own land.
 *
 * Water and mountain cells are never reachable targets and are never moved
 * through, and the extended range never enters enemy or neutral territory
 * (the destination and every intermediate cell must be owned by the mover).
 * This is the single source both the legal-move enumerators and `moveUnit`
 * consult, so they stay consistent.
 */
export function reachableForUnit(
  state: GameState,
  unit: ApeUnit,
): Hex[] {
  const occupied = new Set(
    state.units.filter((u) => u !== unit).map((u) => hexKey(u.hex)),
  );
  // A cell is passable when it is not water and not a mountain. A hex outside
  // the map is treated as passable (the out-of-range checks stay the
  // authority for unreachable targets), matching the existing terrain checks
  // in `moveUnit` and `reachableHexes`. In practice the water border ring
  // blocks any off-map escape, so unreachable off-map cells never surface.
  const passable = (hex: Hex): boolean => {
    const terrain = state.map.cells.find((c) => sameHex(c.hex, hex))?.terrain;
    return terrain !== "water" && terrain !== "mountain";
  };

  const standard = bfsReachable(
    unit.hex,
    movementOf(unit.kind),
    occupied,
    passable,
  );
  const ownPassable = (hex: Hex): boolean =>
    passable(hex) && isOwnedBy(state, hex, unit.owner);
  const extended = bfsReachable(
    unit.hex,
    OWN_LAND_RANGE,
    occupied,
    ownPassable,
  );

  const seen = new Set<string>();
  const result: Hex[] = [];
  for (const hex of [...standard, ...extended]) {
    const key = hexKey(hex);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(hex);
  }
  return result;
}

/**
 * Whether a cell is a protected / safety zone against `mover` entering it,
 * per the Protection / Safety Zones rule in `ape-kingdom-rules.md`.
 *
 * A unit protects its surrounding (adjacent) cells from opposing units of the
 * same rank — a Monkey protects its adjacent cells from opposing Monkeys, a
 * Gibbon from opposing Gibbons, a Chimpanzee from opposing Chimpanzees, and a
 * Gorilla from opposing Gorillas. A Home Tree protects the cells surrounding
 * it from opposing Monkeys (rank 1). Protection only restricts entry by the
 * opposing units listed; it does not prevent higher- or lower-ranked enemy
 * units from entering protected cells, and it does not restrict the
 * protecting unit's own movement or attacks (an ally of the protector is
 * never blocked). Protection does not change site ownership and does not
 * prevent a protected cell from being captured by a unit that is allowed to
 * enter it.
 *
 * `mover` is the unit that would move or attack into `targetHex`. The cell is
 * protected (and the move/attack into it refused) when there is an opposing
 * unit of the same rank adjacent to the target, or — for a rank-1 mover — an
 * opposing Home Tree adjacent to the target.
 */
export function isCellProtected(
  state: GameState,
  targetHex: Hex,
  mover: ApeUnit,
): boolean {
  const moverRank = rankOf(mover.kind);
  // An opposing unit of the same rank protects each cell adjacent to it.
  for (const other of state.units) {
    if (
      other.owner !== mover.owner &&
      rankOf(other.kind) === moverRank &&
      areAdjacent(other.hex, targetHex)
    ) {
      return true;
    }
  }
  // A Home Tree the mover's kingdom does not own protects its adjacent cells
  // from opposing Monkeys (rank 1). Neutral Home Trees protect no one.
  if (moverRank === 1) {
    for (const site of state.sites) {
      if (
        site.kind === "HomeTree" &&
        site.owner !== null &&
        site.owner !== mover.owner &&
        areAdjacent(site.hex, targetHex)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Turn-sequence step C (movement part): Move and Capture.
 *
 * Moves a unit toward `targetHex`. The unit must be owned by the current
 * player and must not have already acted this turn (a unit may not move after
 * attacking, and newly recruited apes are marked `hasActed = true` so they
 * cannot act until the next turn).
 *
 * The move is rejected with a typed `MoveError` when:
 *  - the unit has already acted this turn (`already-acted`);
 *  - the target hex is out of range (`out-of-range`) — beyond the unit's
 *    Movement value (standard 1 hex) and, when the unit could instead move up
 *    to `OWN_LAND_RANGE` through its own land, not on a route entirely
 *    through passable, unoccupied cells the mover's kingdom owns;
 *  - the target hex is occupied by an enemy unit (`occupied`) — enemy-occupied
 *    hexes are resolved by combat, never by moving onto them;
 *  - the target hex holds a same-kingdom unit that cannot be joined
 *    (`cannot-join`) — joining adds the two levels (1+1=2, 2+1=3, 2+2=4,
 *    3+1=4) and is only possible while both units are still movable this turn
 *    and the summed level does not exceed the maximum rank (4), so 2+3 (and
 *    anything summing over 4) can never combine (M27-T3, #174);
 *  - the target hex is a water cell (`water`) — units may not step onto water;
 *  - the target hex is a mountain cell (`mountain`) — units may not step onto a mountain.
 *
 * Standard movement is 1 hex, so "may not move through enemy units" is
 * enforced by the occupied-target check. The extended own-land range (moving
 * deeper through your own territory via `isOwnedBy`) never enters enemy or
 * neutral territory and never crosses water or mountain.
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

  // The target must be within the unit's effective range. The standard range
  // is the unit's Movement value (1 hex) toward any passable target. When the
  // unit's entire route stays within cells its own kingdom owns (`isOwnedBy`),
  // the unit may instead move up to `OWN_LAND_RANGE` (4 hexes) through that
  // own land — so a farther target is in range iff there is a route entirely
  // through passable, unoccupied own-land cells to it (the same traversal
  // `reachableForUnit` uses).
  const distance = hexDistance(existing.hex, targetHex);
  const movement = movementOf(existing.kind);
  const standardInRange = distance <= movement;

  const occupied = new Set(
    state.units.filter((u) => u !== existing).map((u) => hexKey(u.hex)),
  );
  const ownPassable = (hex: Hex): boolean => {
    const terrain = state.map.cells.find((c) => sameHex(c.hex, hex))?.terrain;
    return (
      terrain !== "water" &&
      terrain !== "mountain" &&
      isOwnedBy(state, hex, existing.owner)
    );
  };
  const ownReachable = bfsReachable(
    existing.hex,
    OWN_LAND_RANGE,
    occupied,
    ownPassable,
  );
  const ownLandInRange = ownReachable.some((h) => sameHex(h, targetHex));

  if (!standardInRange && !ownLandInRange) {
    throw new MoveError(
      "out-of-range",
      `Cannot move ${existing.kind} from (${existing.hex.q},${existing.hex.r}) to ` +
        `(${targetHex.q},${targetHex.r}): distance ${distance} is not within the ` +
        `standard movement ${movement} nor an owned-land route of ${OWN_LAND_RANGE}`,
    );
  }

  // The target hex must not be occupied by an enemy unit (a unit may not
  // enter an enemy-occupied hex by moving — combat is resolved via `attackUnit`)
  // nor by a same-kingdom unit unless the two can join by adding levels.
  const targetUnit = state.units.find(
    (u) => u !== existing && sameHex(u.hex, targetHex),
  );
  if (targetUnit) {
    if (targetUnit.owner !== existing.owner) {
      throw new MoveError(
        "occupied",
        `Cannot move to (${targetHex.q},${targetHex.r}): the hex holds an enemy unit`,
      );
    }
    // Same-kingdom unit: joining. The unit may join a friendly unit by adding
    // the two levels (1+1=2, 2+1=3, 2+2=4, 3+1=4), but only when the summed
    // level does not exceed the maximum rank (4) — so 2+3 (and anything
    // summing over 4) can never combine — and only while both units are still
    // movable this turn (a unit that has already acted cannot join).
    if (!canJoinUnits(existing, targetUnit)) {
      throw new MoveError(
        "cannot-join",
        `Cannot join (${existing.hex.q},${existing.hex.r}) into ` +
          `(${targetHex.q},${targetHex.r}): ${existing.kind}+${targetUnit.kind} ` +
          `cannot combine (sum ${rankOf(existing.kind) + rankOf(targetUnit.kind)} ` +
          `exceeds rank ${MAX_RANK}, or one unit has already acted)`,
      );
    }
    // Join: the two units merge into a single unit of the summed level at the
    // target hex. The joined unit has acted (the mover moved into it). The
    // target hex is friendly territory, so no site/territory is recaptured -
    // the mover's own kingdom already owns it.
    const mergedKind = kindForRank(
      (rankOf(existing.kind) + rankOf(targetUnit.kind)) as ApeRank,
    );
    const units = state.units
      .filter((u) => u !== targetUnit)
      .map((u) =>
        u === existing
          ? { ...u, kind: mergedKind, hex: targetHex, hasActed: true }
          : u,
      );
    return { ...state, units };
  }

  // The target hex must not be water — a unit may not step onto a water cell.
  // Terrain is read from the generated map; a hex outside the map is treated
  // as non-water so the out-of-range check above stays the authority for
  // unreachable targets.
  const terrain =
    state.map.cells.find((c) => sameHex(c.hex, targetHex))?.terrain ??
    "land";
  if (terrain === "water") {
    throw new MoveError(
      "water",
      `Cannot move to (${targetHex.q},${targetHex.r}): the hex is water`,
    );
  }

  // The target hex must not be a mountain — a unit may not step onto a
  // mountain cell. Terrain is read from the generated map; a hex outside the
  // map is treated as non-mountain so the out-of-range check above stays the
  // authority for unreachable targets.
  if (terrain === "mountain") {
    throw new MoveError(
      "mountain",
      `Cannot move to (${targetHex.q},${targetHex.r}): the hex is a mountain`,
    );
  }

  // Protection / Safety Zones (M23-T2-G4, #195): an empty cell protected by
  // an opposing unit of the same rank (or, for a rank-1 mover, an opposing
  // Home Tree) may not be entered. This check sits after the occupied/join
  // handling because join targets are friendly cells (never protected against
  // the mover) and enemy-occupied cells are resolved by combat instead of by
  // moving onto them.
  if (isCellProtected(state, targetHex, existing)) {
    throw new MoveError(
      "protected",
      `Cannot move to (${targetHex.q},${targetHex.r}): the cell is protected`,
    );
  }

  // Update the unit's hex and mark it as acted this turn.
  const units = state.units.map((u) =>
    u === existing ? { ...u, hex: targetHex, hasActed: true } : u,
  );

  // Harvest a grave (M21-T2, #191): moving onto a hex that holds a grave
  // (and is otherwise unoccupied, so allowed by the checks above) clears that
  // grave and grants the mover's kingdom +2 bananas. A cell can never hold
  // two units, so a grave hex is always empty of units — a unit moves onto it
  // exactly like a normal empty land cell, but the grave is consumed for its
  // reward.
  const grave = graveAt(state, targetHex);
  let graves = state.graves;
  let harvest = 0;
  if (grave) {
    // A grave was found, so `state.graves` is necessarily defined (graveAt
    // only returns a grave present in that list).
    graves = state.graves!.filter((g) => g !== grave);
    harvest = 2;
  }

  // Capture an unoccupied site at the target hex for the moving unit's owner.
  const sites = state.sites.map((site) =>
    sameHex(site.hex, targetHex) ? { ...site, owner: existing.owner } : site,
  );

  // Persist site-less territory (M24-T2, #160): a site-less cell a kingdom's
  // unit moves onto (and the site-less cell it vacates) stays owned by that
  // kingdom after the unit leaves. Site-owned cells are not recorded here —
  // their ownership follows the site. Re-claiming a cell here is a capture
  // when the cell already belonged to the enemy: moving onto (or out of) an
  // enemy's site-less cell flips its territory to the mover's kingdom.
  const territory = { ...(state.territory ?? {}) };
  // Only site-less cells on the map become persistent territory (M24-T2,
  // #160). A hex outside the generated map (reachable only on contrived
  // terrain-free test boards) is never recorded, so territory cannot expand
  // beyond the map and inflate the own-land range.
  const onMap = (hex: Hex): boolean =>
    state.map.cells.some((c) => sameHex(c.hex, hex));
  for (const hex of [existing.hex, targetHex]) {
    if (state.sites.some((s) => sameHex(s.hex, hex))) continue;
    if (!onMap(hex)) continue;
    territory[hexKey(hex)] = existing.owner;
  }

  return {
    ...state,
    units,
    sites,
    territory,
    graves,
    players:
      harvest > 0
        ? {
            ...state.players,
            [existing.owner]: {
              ...state.players[existing.owner],
              bananas: state.players[existing.owner].bananas + harvest,
            },
          }
        : state.players,
  };
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
  | "no-enemy"
  /**
   * The target hex is inside an opposing unit's / Home Tree's protection
   * zone (Protection / Safety Zones rule) for this attacker, so it may not
   * attack into it.
   */
  | "protected";

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

  // Protection / Safety Zones (M23-T2-G4, #195): a cell protected by an
  // opposing unit of the same rank (or, for a rank-1 attacker, an opposing
  // Home Tree) may not be attacked into — this creates the defensive standoffs
  // the rules intend. Attacking a defender whose cell is guarded by a
  // same-rank enemy of the attacker (or, for a Monkey attacker, an opposing
  // Home Tree) is refused with a typed error.
  if (isCellProtected(state, targetHex, existing)) {
    throw new AttackError(
      "protected",
      `Cannot attack (${targetHex.q},${targetHex.r}): the cell is protected`,
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
    // Capture site-less territory too (M24-T2, #160): defeating an enemy unit
    // on a site-less cell flips that cell's persistent territory to the
    // attacker's kingdom. Site-owned cells follow the site instead.
    const territory = { ...(state.territory ?? {}) };
    if (!state.sites.some((s) => sameHex(s.hex, targetHex))) {
      territory[hexKey(targetHex)] = existing.owner;
    }
    return { ...state, units, sites, territory };
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
