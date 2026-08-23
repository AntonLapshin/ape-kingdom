import type { ReactNode } from "react";
import type { PlayerId } from "../../core/game";
import type { Terrain } from "../../core/mapGenerator";
import { HEX_SIZE, HEX_CLIP } from "../presentation";

export interface CellProps {
  /** The axial hex coordinates (q, r) of this cell. */
  q: number;
  /** The axial hex row coordinate of this cell. */
  r: number;
  /** The owner of this cell (site/unit), or null for neutral terrain. */
  owner: PlayerId | null;
  /** The terrain of this cell (land / water / mountain). Defaults to land. */
  terrain?: Terrain;
  /** Whether this cell is the current player's territory (highlight). */
  isCurrent?: boolean;
  /** The pixel x offset of this cell from the board origin. */
  x: number;
  /** The pixel y offset of this cell from the board origin. */
  y: number;
  /** The stagger animation delay for this cell, in ms. */
  animationDelay?: number;
  /** The cell content (site label, unit badge, etc.). */
  children?: ReactNode;
}

/**
 * Token-backed background classes used to colour a hex by its terrain. Each
 * terrain maps to a semantic theme token (`terrain-land` / `terrain-water` /
 * `terrain-mountain`) per GUIDELINES-WEB-THEME.md — no raw Tailwind palettes.
 * Ownership is conveyed separately (via `hex-current` highlight and the
 * owner-coloured site/unit badges), so terrain and territory stay distinct.
 */
const TERRAIN_BG: Record<Terrain, string> = {
  land: "bg-terrain-land",
  water: "bg-terrain-water",
  mountain: "bg-terrain-mountain",
};

/**
 * Thin, dumb `Cell` atom component (M8-T1, M9-T3).
 *
 * Renders a single pointy-top hexagon board cell, extracted from the inline
 * hex rendering previously in `Board.tsx`. It is purely presentational — it
 * receives the cell's hex coords, terrain, owner, position, and highlight
 * state as props and renders the hexagon shell (clip-path, token terrain
 * background, border, `hex-cell`/`hex-pop`/`hex-current` classes,
 * `data-testid="board-cell"` / `data-hex` / `data-owner` / `data-terrain`
 * attributes) with any content passed via the `children` slot. No hooks, no
 * context, no side effects, no business logic.
 */
export function Cell({
  q,
  r,
  owner,
  terrain = "land",
  isCurrent = false,
  x,
  y,
  animationDelay = 0,
  children,
}: CellProps) {
  const bg = TERRAIN_BG[terrain] ?? TERRAIN_BG.land;
  return (
    <div
      data-testid="board-cell"
      data-hex={`${q},${r}`}
      data-owner={owner ?? "neutral"}
      data-terrain={terrain}
      className={`hex-cell hex-pop absolute flex flex-col items-center justify-center ${bg} border border-line-strong ${
        isCurrent ? "hex-current" : ""
      }`}
      style={{
        width: HEX_SIZE * 2,
        height: HEX_SIZE * 2,
        left: x,
        top: y,
        clipPath: HEX_CLIP,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {children}
    </div>
  );
}
