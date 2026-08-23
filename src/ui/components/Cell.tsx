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
  /**
   * The resolved owner territory background token class (M13-T2, #89), e.g.
   * `bg-owner-p1` / `bg-owner-p2` for owned land cells, or `null` for neutral
   * cells (which then keep their terrain colour). Derived by the view model's
   * `ownerBackground` helper so the dumb `Cell` holds no owner→colour logic —
   * the owner-adapted tint is passed down as a plain class string.
   */
  ownerBg?: string | null;
  /** The terrain of this cell (land / water / mountain). Defaults to land. */
  terrain?: Terrain;
  /** Whether this cell is the current player's territory (highlight). */
  isCurrent?: boolean;
  /** Whether this cell is the currently selected hex (selection highlight). */
  isSelected?: boolean;
  /**
   * Whether this cell is a reachable move target for the selected unit
   * (move-target highlight, M10-T4).
   */
  isMoveTarget?: boolean;
  /** The pixel x offset of this cell from the board origin. */
  x: number;
  /** The pixel y offset of this cell from the board origin. */
  y: number;
  /** The stagger animation delay for this cell, in ms. */
  animationDelay?: number;
  /** Callback invoked when this cell is clicked (cell selection). */
  onSelect?: () => void;
  /** The cell content (site label, unit badge, etc.). */
  children?: ReactNode;
}

/**
 * Token-backed background classes used to colour a hex by its terrain. Each
 * terrain maps to a semantic theme token (`terrain-land` / `terrain-water` /
 * `terrain-mountain`) per GUIDELINES-WEB-THEME.md — no raw Tailwind palettes.
 * An owned cell's background may instead be overridden by the owner tint
 * token class passed via the `ownerBg` prop (derived by the view model).
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
  ownerBg = null,
  terrain = "land",
  isCurrent = false,
  isSelected = false,
  isMoveTarget = false,
  x,
  y,
  animationDelay = 0,
  onSelect,
  children,
}: CellProps) {
  // The view-model-derived owner tint overrides the terrain background for
  // owned territories; neutral cells keep their terrain colour.
  const bg = ownerBg ?? TERRAIN_BG[terrain] ?? TERRAIN_BG.land;
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      data-testid="board-cell"
      data-hex={`${q},${r}`}
      data-owner={owner ?? "neutral"}
      data-terrain={terrain}
      data-selected={isSelected ? "true" : "false"}
      data-move-target={isMoveTarget ? "true" : "false"}
      className={`hex-cell hex-pop absolute flex flex-col items-center justify-center ${bg} border border-line-strong ${
        isCurrent ? "hex-current" : ""
      } ${isSelected ? "hex-selected" : ""} ${
        isMoveTarget ? "hex-move-target" : ""
      } ${onSelect ? "cursor-pointer" : ""}`}
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
