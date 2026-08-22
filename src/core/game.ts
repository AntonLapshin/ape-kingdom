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
 * Create a new ape unit.
 *
 * Newly recruited apes cannot move or attack until the next turn, so
 * `hasActed` is set to true by default (they have already "acted" for the
 * current turn).
 */
export function createUnit(
  kind: ApeKind,
  owner: PlayerId,
  hasActed = true,
): ApeUnit {
  return { kind, owner, hasActed };
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
 * Build the standard two-player setup from the rules:
 * each player starts with 3 Monkeys, 1 Gibbon, and 2 bananas.
 *
 * Returns the starting units and player state for the given player ids.
 */
export function startingForce(playerId: PlayerId): {
  units: ApeUnit[];
  player: Player;
} {
  const monkeys = Array.from(
    { length: 3 },
    (): ApeUnit => createUnit("Monkey", playerId),
  );
  return {
    units: [...monkeys, createUnit("Gibbon", playerId)],
    player: createPlayer(playerId, 2),
  };
}
