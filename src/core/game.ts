/**
 * Core Ape Kingdom game entities and pure helpers.
 *
 * This module models the game's entities from
 * `guidelines/ape-kingdom-rules.md` (Ape Units table, Sites & Income table,
 * Setup) as pure TypeScript types. It has no React, Tailwind, or browser
 * dependencies, so it can be tested exhaustively and reused by the UI layer.
 */

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
  return { id, bananas };
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
