/**
 * Pure core cell-information derivation (M10-T3).
 *
 * Derives the read-only display info for a single selected board hex plus the
 * actionable recruit items available at that hex for the current player, so
 * the UI's cell info/action panel can present read-only data (terrain, site,
 * unit kind/rank, cost/income) and, for buildable hexes, the recruit actions
 * with their banana cost.
 *
 * This module is the single source of that derivation so the panel contains no
 * business logic. It has no React, Tailwind, or browser dependencies — it is
 * pure logic operating on the `GameState` from `src/core/game.ts`, the
 * generated map from `src/core/mapGenerator.ts`, and the legal-action
 * enumeration from `src/core/ai.ts`.
 */

import type {
  ApeKind,
  ApeRank,
  PlayerId,
  SiteKind,
  Hex,
  GameState,
} from "./game";
import { sameHex, rankOf, costOf, incomeOf, adjacentHexes, territoryOwner } from "./game";
import { terrainAt, type Terrain } from "./mapGenerator";
import { legalActions, type GameAction } from "./ai";

/* ------------------------------------------------------------------ */
/* Cell info model                                                     */
/* ------------------------------------------------------------------ */

/** Read-only summary of a site on a selected hex (kind, owner, income). */
export interface CellSiteInfo {
  /** Which kind of site this is (Grove / Nest / Home Tree). */
  kind: SiteKind;
  /** The player controlling it, or null while neutral. */
  owner: PlayerId | null;
  /** Banana income produced each turn for its controller. */
  income: number;
}

/** Read-only summary of a unit on a selected hex (kind, rank, owner, cost). */
export interface CellUnitInfo {
  /** Which ape kind this unit is. */
  kind: ApeKind;
  /** Combat strength / rank (1–4) of the ape kind. */
  rank: ApeRank;
  /** The player who owns this unit, or null for a neutral unit. */
  owner: PlayerId | null;
  /** The banana cost to recruit this kind of ape (static table data). */
  cost: number;
}

/** A single actionable recruit item at the selected hex, with its cost. */
export interface CellActionItem {
  /** Which ape kind could be recruited here. */
  kind: ApeKind;
  /** The banana cost to recruit this kind. */
  cost: number;
  /** The legal `recruit` action to feed into the existing `selectAction` flow. */
  action: { type: "recruit"; kind: ApeKind; hex: Hex };
}

/**
 * The full derived display info for one selected hex.
 *
 * `site` / `unit` are null when the hex has none. `actions` lists every legal
 * recruit the current player may place on this hex (empty for read-only
 * hexes, i.e. hexes that are not a legal recruit/placement hex this turn).
 */
export interface CellInfo {
  /** The hex this info describes. */
  hex: Hex;
  /** The terrain (land / water / mountain) of this hex. */
  terrain: Terrain;
  /** The site on this hex, or null if there is none. */
  site: CellSiteInfo | null;
  /** The unit on this hex, or null if there is none. */
  unit: CellUnitInfo | null;
  /**
   * The territory owner of this hex (M24-T2, #160): the kingdom that owns the
   * cell's site, or the persistent owner of a site-less cell (retained after
   * a unit vacates). Derived from core `territoryOwner` so the selector
   * panel's hexagon preview tints persistent site-less territory too. Null
   * when the cell is neutral.
   */
  territoryOwner: PlayerId | null;
  /**
   * Whether this hex is actionable this turn: the current player has at least
   * one legal recruit/placement option here (a placement hex, or a controlled
   * Home Tree with a legal adjacent placement). When true the panel shows the
   * recruit action items; when false it shows read-only info only.
   */
  actionable: boolean;
  /** The legal recruit action items available at this hex for the current player. */
  actions: CellActionItem[];
}

/* ------------------------------------------------------------------ */
/* Derivation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Derive the read-only info and actionable recruit items for a single hex on
 * the board from the current game state.
 *
 * The terrain is read from the generated map (`terrainAt`). The site summary
 * carries its banana `income` from the static `siteType` table. The unit
 * summary carries its rank (from `rankOf`) and its recruit `cost` (from the
 * `APE_TYPES` table).
 *
 * The actions offered for the selected hex (M19-T3, #132):
 *
 *  - Selecting a **placement hex** (an empty hex a new ape may legally be
 *    placed on) offers the recruit actions targeting exactly that hex.
 *  - Selecting a **controlled Home Tree** (a Home Tree the current player
 *    controls) offers recruiting "arboreally" from that tree: per the rules a
 *    new ape may be placed on the Home Tree hex (if empty) or in an adjacent
 *    empty hex, so the Home Tree surfaces every recruit available at it (its
 *    own hex plus each legal adjacent placement hex). This restores the
 *    "create new unit" flow at the Home Tree — the player selects the Home
 *    Tree and sees the recruit options with their cost.
 *
 * For each recruit action surfaced, an item is produced carrying the ape
 * kind, its recruit cost, and the exact `recruit` `GameAction` that can be
 * fed straight into the existing `selectAction` flow.
 *
 * This is pure derivation — no React, no browser APIs, no mutation.
 */
export function cellInfo(state: GameState, hex: Hex): CellInfo {
  const terrain = terrainAt(state.map, hex) ?? "land";

  const site = state.sites.find((s) => sameHex(s.hex, hex)) ?? null;
  const unit = state.units.find((u) => sameHex(u.hex, hex)) ?? null;

  // The hexes at which a new ape may be placed for the selected hex. For a
  // controlled Home Tree this is the tree's own hex plus its adjacent hexes
  // (recruiting is "arboreal" — a player recruits at a Home Tree they
  // control, placing new apes on the tree hex if empty or in an adjacent
  // empty hex). For any other hex it is the selected hex itself, so recruits
  // are only surfaced when the selected hex is a legal placement target.
  const isControlledHomeTree =
    site?.kind === "HomeTree" && site.owner === state.currentPlayer;
  const targetHexes = isControlledHomeTree
    ? [hex, ...adjacentHexes(hex)]
    : [hex];

  // Surface each recruitable ape kind at most once per selected hex, so a
  // controlled Home Tree (which offers recruits at several placement hexes)
  // lists each kind once with its cost instead of once per placement hex (the
  // panel keys its buttons by kind). The first placement (the Home Tree hex
  // itself when empty, else an adjacent hex, per `legalActions` ordering) is
  // kept.
  const seenKinds = new Set<ApeKind>();
  const actions = legalActions(state)
    .filter(
      (action): action is { type: "recruit"; kind: ApeKind; hex: Hex } =>
        action.type === "recruit" &&
        targetHexes.some((h) => sameHex(h, action.hex)),
    )
    .filter((action) => {
      if (seenKinds.has(action.kind)) return false;
      seenKinds.add(action.kind);
      return true;
    })
    .map((action) => ({
      kind: action.kind,
      cost: costOf(action.kind),
      action,
    }));

  return {
    hex,
    terrain,
    territoryOwner: territoryOwner(state.sites, state.units, state.territory, hex),
    site: site
      ? { kind: site.kind, owner: site.owner, income: incomeOf(site.kind) }
      : null,
    unit: unit
      ? { kind: unit.kind, rank: rankOf(unit.kind), owner: unit.owner, cost: costOf(unit.kind) }
      : null,
    actionable: actions.length > 0,
    actions,
  };
}

export type { GameAction };
