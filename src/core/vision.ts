/**
 * Core vision / fog-of-war model for map exploration (M22-T1, #151).
 *
 * This module derives, from a pure `GameState`, the set of hexes a player can
 * currently see (has revealed). At game start the map is hidden (black) and
 * cells are revealed by unit and Home Tree visibility:
 *
 *   - a **Monkey** reveals its surrounding cells within 1 hex (1 ring);
 *   - a **Gibbon** reveals within 2 hexes (2 rings);
 *   - a **Home Tree** reveals within 3 hexes (3 rings);
 *   - all **other units** (Chimpanzee and Gorilla) reveal within 3 hexes (3 rings);
 *   - all other unit kinds reveal within 3 hexes (3 rings).
 *
 * Visibility is cumulative and monotonic (once a hex is revealed it stays
 * revealed while the sight line endures) and is based on *owned* sight lines:
 * a player sees from the Home Trees and units they control, never from an
 * opponent's.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic operating on the `GameState` from `src/core/game.ts`, so it
 * can be used by both the human UI and the AI. The default (fog off) keeps
 * every map cell visible so existing game logic is unaffected until the UI
 * slice (M22-T2) turns fog on.
 *
 * The vision values below are the single source of truth, codified in
 * `guidelines/ape-kingdom-rules.md`.
 */

import type { GameState, Hex, PlayerId } from "./game";
import { hexDistance } from "./game";

/* ------------------------------------------------------------------ */
/* Vision model                                                        */
/* ------------------------------------------------------------------ */

/**
 * The vision radius (in hexes / rings) of each unit kind. A unit reveals
 * every cell within this distance of its own hex (the hex it stands on plus
 * the surrounding rings): Monkey 1, Gibbon 2; the strongest kinds
 * (Chimpanzee, Gorilla) reveal 3.
 *
 * `null` is intentionally impossible — the map has exactly the four ape
 * kinds from `APE_KINDS` — so a unit of any kind has a defined radius.
 */
export const UNIT_VISION: Record<string, number> = {
  Monkey: 1,
  Gibbon: 2,
  Chimpanzee: 3,
  Gorilla: 3,
};

/**
 * The vision radius (in hexes / rings) of a Home Tree. A controlled Home Tree
 * reveals every cell within this distance of the tree hex plus its
 * surrounding rings (3 rings).
 */
export const HOME_TREE_VISION = 3;

/**
 * The vision radius of any unit kind not otherwise listed (a safe default
 * matching the "all other units" rule). Currently every ape kind has an
 * explicit radius in `UNIT_VISION`, so this only guards future kinds.
 */
export const DEFAULT_UNIT_VISION = 3;

/**
 * The vision radius of a unit kind (its distance in hexes / rings).
 *
 * Looked up from `UNIT_VISION` with the "all other units" fallback of 3.
 */
export function unitVision(kind: string): number {
  return UNIT_VISION[kind] ?? DEFAULT_UNIT_VISION;
}

/* ------------------------------------------------------------------ */
/* Revealed-hex derivation                                             */
/* ------------------------------------------------------------------ */

/** A stable string key for a hex, used to deduplicate sets of hexes. */
function hexKey(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

/** All hexes that exist on the map, keyed by their stable string key. */
function mapHexes(state: GameState): Map<string, Hex> {
  const byKey = new Map<string, Hex>();
  for (const cell of state.map.cells) {
    byKey.set(hexKey(cell.hex), cell.hex);
  }
  return byKey;
}

/**
 * Reveal every map cell within `radius` (inclusive) of `source`, adding the
 * resulting hexes to `revealed`. The source hex itself (distance 0) is
 * included, so a Monkey at (q,r) sees the cell it stands on plus its 1-ring.
 * Only cells that actually exist on the map are added.
 */
function revealAround(
  source: Hex,
  radius: number,
  mapHexesByKey: Map<string, Hex>,
  revealed: Set<string>,
): void {
  for (const [key, hex] of mapHexesByKey) {
    if (hexDistance(source, hex) <= radius) revealed.add(key);
  }
}

/**
 * The set of hexes the given player can currently see (has revealed) on the
 * map, per the vision model.
 *
 * The revealed set is the cumulative union of the player's *owned* sight
 * lines: every Home Tree the player controls reveals within
 * `HOME_TREE_VISION` (3 rings), and every unit the player owns reveals
 * within its kind's radius (`unitVision`: Monkey 1, Gibbon 2, the other kinds
 * 3). An opponent's Home Trees and units are never sight sources.
 *
 * Because the result is a set union, visibility is monotonic within a state:
 * a hex revealed by any single sight line is present exactly once, and the
 * derivation is deterministic.
 *
 * When `fog` is true the revealed set is returned (the map starts hidden and
 * only visible cells are revealed). When `fog` is false (the default) every
 * map cell is returned, so existing game logic that assumes full visibility
 * is unaffected until the UI slice (M22-T2) enables fog.
 */
export function visibleHexes(
  state: GameState,
  player: PlayerId,
  fog = false,
): Hex[] {
  // Fog off: the whole map is visible (existing behaviour).
  if (!fog) return state.map.cells.map((c) => c.hex);

  const byKey = mapHexes(state);
  const revealed = new Set<string>();

  // Owned Home Trees reveal within HOME_TREE_VISION.
  for (const site of state.sites) {
    if (site.kind === "HomeTree" && site.owner === player) {
      revealAround(site.hex, HOME_TREE_VISION, byKey, revealed);
    }
  }

  // Owned units reveal within their kind's vision radius.
  for (const unit of state.units) {
    if (unit.owner !== player) continue;
    revealAround(unit.hex, unitVision(unit.kind), byKey, revealed);
  }

  const result: Hex[] = [];
  for (const [key, hex] of byKey) {
    if (revealed.has(key)) result.push(hex);
  }
  return result;
}
