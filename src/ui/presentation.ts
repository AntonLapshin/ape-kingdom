import type { GameAction } from "../core/ai";
import type { TurnStep } from "../core/gameSession";
import type { ApeKind, PlayerId, SiteKind } from "../core/game";
import { sameHex } from "../core/game";
import type { Terrain } from "../core/mapGenerator";
import type { GameIconName } from "../assets/icons";
import type { CellActionItem } from "../core/cellInfo";

/**
 * Pure presentation helpers shared by the thin UI components.
 *
 * These functions/constants only shape core data into human-readable display
 * strings and geometry — no game rules, no business logic, no React. They are
 * kept out of the component files so the components stay pure and dumb (and
 * the fast-refresh lint rule stays happy). They are exported so they can be
 * unit-tested directly.
 */

/** A friendly display label for each turn step. */
export const STEP_LABELS: Record<TurnStep, string> = {
  recruit: "Recruit / Act",
  movefight: "Move / Fight",
  done: "Game Over",
};

/** A short display name for a player id. */
export function playerName(id: PlayerId): string {
  return id === "p1" ? "You" : "AI";
}

/** A short display label for each site kind. */
export const SITE_LABELS: Record<string, string> = {
  Grove: "Grove",
  Nest: "Nest",
  HomeTree: "Home Tree",
};

/**
 * The pixel-art icon name for each ape kind (M16-T2, #111).
 *
 * Each of the four ape kinds has a dedicated icon in the 8-asset set, so this
 * is a total map. This is not business logic — it is a read-only kind →
 * icon-name presentation map that lets the dumb `Unit` component resolve the
 * asset URL via the `gameIcons` barrel without holding any mapping logic.
 */
export const APE_KIND_ICONS: Record<ApeKind, GameIconName> = {
  Monkey: "monkey",
  Gibbon: "gibbon",
  Chimpanzee: "chimpanzee",
  Gorilla: "gorilla",
};

/**
 * The pixel-art icon name for the site kinds that have a dedicated asset
 * (M16-T2, #111). The Home Tree and Monkey Nest have icons in the 8-asset
 * set; Grove does not (the asset set's remaining site icons are Mountain and
 * Grave, which are a terrain cell background and a removed-unit marker that
 * has no entity in `src/core`, rather than a Grove site). So this is a
 * partial map and `siteKindIcon` returns `null` for Grove, letting the dumb
 * `Content` component fall back to its text label. Not business logic — a
 * read-only kind → icon-name presentation map.
 */
export const SITE_KIND_ICONS: Partial<Record<SiteKind, GameIconName>> = {
  HomeTree: "homeTree",
  Nest: "monkeyNest",
};

/** Resolve the pixel-art icon name for an ape kind (M16-T2, #111). */
export function apeKindIcon(kind: ApeKind): GameIconName {
  return APE_KIND_ICONS[kind];
}

/**
 * Resolve the pixel-art icon name for a site kind, or `null` when the kind
 * has no dedicated asset (Grove) so the component can fall back to text
 * (M16-T2, #111).
 */
export function siteKindIcon(kind: SiteKind): GameIconName | null {
  return SITE_KIND_ICONS[kind] ?? null;
}

/**
 * Build a short human-readable label for a `GameAction` so the action
 * controls can show a friendly button. No game logic — just a text
 * description of an action descriptor.
 */
export function actionLabel(action: GameAction): string {
  switch (action.type) {
    case "collectIncome":
      return "Collect Income";
    case "recruit":
      return `Recruit ${action.kind} @ (${action.hex.q},${action.hex.r})`;
    case "move":
      return `Move (${action.unitHex.q},${action.unitHex.r}) → (${action.targetHex.q},${action.targetHex.r})`;
    case "attack":
      return `Attack (${action.attackerHex.q},${action.attackerHex.r}) → (${action.targetHex.q},${action.targetHex.r})`;
  }
}

/** The size (pointy-top hex "radius") of each board hex cell in pixels. */
export const HEX_SIZE = 44;

/**
 * The visible gap (in px) left between adjacent board hexagons (M17-T3, #116,
 * tightened M18-T3, #125). The rendered hexagon is this many pixels smaller
 * than its layout box so a few pixels of the (dark) board show through between
 * neighbouring cells. M18-T3 halves the original 8px gap to ~4px so the board
 * reads cleaner and tighter while the SVG glass edges still separate cells.
 */
export const HEX_GAP = 4;

/**
 * The rendered width/height of each board cell's bounding box (px). The layout
 * spacing (`hexToPixel`) is driven by `HEX_SIZE`, but the drawn hexagon is
 * shrunk by `HEX_GAP` so a thin gap separates adjacent cells (M17-T3, #116).
 */
export const CELL_SIZE = HEX_SIZE * 2 - HEX_GAP;

/**
 * The proportional corner ratios of a pointy-top hexagon inscribed in a
 * square box (M18-T3, #125). These mirror the legacy `HEX_CLIP` polygon
 * percentages, expressed as [x, y] fractions of the box so they can generate
 * an SVG polygon for any size.
 */
const HEXAGON_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0],
  [0.93, 0.25],
  [0.93, 0.75],
  [0.5, 1],
  [0.07, 0.75],
  [0.07, 0.25],
];

/**
 * The SVG `points` string for a pointy-top hexagon inscribed in a
 * `size`×`size` box (M18-T3, #125). Pure geometry — used to draw the hexagon
 * silhouette as an SVG `<polygon>` (and its clip-path) instead of a literal
 * CSS `clip-path` string, so the hexagon is rendered with an SVG approach and
 * the glass-edge highlight can be drawn crisply along the true hexagon edges.
 */
export function hexagonPoints(size: number): string {
  return HEXAGON_CORNERS.map(
    ([x, y]) => `${(x * size).toFixed(1)},${(y * size).toFixed(1)}`,
  ).join(" ");
}

/**
 * Legacy CSS clip-path polygon that draws a pointy-top hexagon. Retained only
 * for backward-compatibility of the exported API; components now render the
 * hexagon with the SVG approach (`hexagonPoints`) rather than this string.
 */
export const HEX_CLIP =
  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";
/**
 * Token-backed background classes used to colour a hex by its terrain. Each
 * terrain maps to a semantic theme token (`terrain-land` / `terrain-water` /
 * `terrain-mountain`) per GUIDELINES-WEB-THEME.md — no raw Tailwind palettes.
 * An owned cell's background is instead driven by the owner tint token
 * (M13-T2, #89). Moved here from `Cell.tsx` so both the board `Cell` and the
 * bottom-left selector panel's hexagon preview share one source of truth.
 */
export const TERRAIN_BG: Record<Terrain, string> = {
  land: "bg-terrain-land",
  water: "bg-terrain-water",
  mountain: "bg-terrain-mountain",
};

/**
 * Token-backed background classes used to tint an owned cell/hexagon by its
 * owner (soft rose for p1, soft violet for p2) — M13-T2, #89. The owner colour
 * lives only on the hexagon, never on the unit badge (M17-T3, #116).
 */
export const OWNER_BG: Record<PlayerId, string> = {
  p1: "bg-owner-p1",
  p2: "bg-owner-p2",
};

/**
 * Resolve the background token class for a hexagon given its owner and
 * terrain: owned hexagons take the owner tint, neutral hexagons keep their
 * terrain colour (M17-T3, #116). Pure presentation — no game logic. Falls back
 * to the neutral land colour for any unknown terrain.
 */
export function cellHexagonClass(
  owner: PlayerId | null,
  terrain: Terrain,
): string {
  if (owner === "p1") return OWNER_BG.p1;
  if (owner === "p2") return OWNER_BG.p2;
  return TERRAIN_BG[terrain] ?? TERRAIN_BG.land;
}

/** Anything that carries an owner (a site or a unit badge). */
interface Owned {
  readonly owner: PlayerId | null;
}

/**
 * Resolve the territory owner of a hexagon from its site and/or unit (M19-T1,
 * #130). Pure presentation — no game logic.
 *
 * Ownership of a cell is a *territory* property that lives on the site and
 * persists independently of which (if any) unit stands on it: a site captured
 * by a kingdom stays owned by that kingdom even once the unit moves off, and
 * it is only lost when an enemy unit occupies the cell (moving onto it or
 * defeating its defender). So the site owner always wins; a unit's owner only
 * colours a site-less hex while the unit is standing on it, and reverts to
 * neutral once the unit leaves. This is the exact rule the board Cell and the
 * selector panel's hexagon preview both relied on with a duplicated
 * `site?.owner ?? unit?.owner` expression — centralised here so both render
 * consistently from one source of truth.
 */
export function cellOwner(
  site: Owned | null,
  unit: Owned | null,
): PlayerId | null {
  if (site?.owner) return site.owner;
  return unit?.owner ?? null;
}

/**
 * Pure presentation filter: the recruit `CellActionItem`s (from `cellInfo`'s
 * `info.actions`) whose exact `recruit` `GameAction` is present in the
 * session's step-filtered `legalActions` prop (#123).
 *
 * This prevents offering (and therefore clicking) a recruit action that is not
 * actually selectable this turn step. `cellInfo` derives its recruit items from
 * `legalActions(state)` — which contains recruits in every step — but the
 * session's step-filtered `legalMoves` exclude recruits once the player has
 * moved/fought (`movefight` step). Submitting one of those excluded recruits to
 * `selectAction` throws an uncaught `GameSessionError` and crashes the app, so
 * the panel must only surface the recruits that are genuinely legal. Not game
 * logic — just a pure UI grouping consistent with how the component groups the
 * rest of the action list.
 */
export function legalRecruitActions(
  items: CellActionItem[],
  legalActions: GameAction[],
): CellActionItem[] {
  return items.filter((item) =>
    legalActions.some(
      (a) =>
        a.type === "recruit" &&
        a.kind === item.kind &&
        sameHex(a.hex, item.action.hex),
    ),
  );
}

/** Anything needed to decide whether the human's End Turn button is enabled. */
interface EndTurnState {
  /** The player whose turn it is. */
  currentPlayer: PlayerId;
  /** Whether the game has ended. */
  isDone: boolean;
}

/**
 * Whether the human's End Turn button should be enabled (M19-T2, #131).
 *
 * The End Turn button must work any time during the human's turn, even when
 * the player has not moved/fought all of their units — it ends the turn and
 * runs the AI reply regardless of how many (if any) units have acted. So it is
 * enabled whenever it is the human's (`p1`) turn and the game is not done, and
 * disabled otherwise (e.g. the game has ended, so there is no turn to end). It
 * must NOT be gated on all units having acted.
 *
 * Pure presentation — no game logic. Centralised here (like `cellOwner`,
 * M19-T1) so the dumb End Turn button's enabled state comes from one tested
 * source of truth instead of an inline expression in the composition layer.
 */
export function isEndTurnEnabled(state: EndTurnState): boolean {
  return state.currentPlayer === "p1" && !state.isDone;
}

/** Horizontal spacing between adjacent hex columns. */
const W = Math.sqrt(3) * HEX_SIZE;
/** Vertical spacing between hex rows. */
const H = 1.5 * HEX_SIZE;

/**
 * Convert axial hex coordinates (q, r) to a pixel offset used to absolutely
 * position the hex cell on the board. No game logic — just geometry.
 */
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: W * (q + r / 2), y: H * r };
}
