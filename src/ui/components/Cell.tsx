import type { ReactNode } from "react";
import type { PlayerId } from "../../core/game";
import type { Terrain } from "../../core/mapGenerator";
import { gameIcons } from "../../assets/icons";
import { CELL_SIZE, hexagonPoints, TERRAIN_BG } from "../presentation";

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
 * Whether a terrain kind is an impassable mountain, which should render the
 * pixel-art Mountain icon (M16-T2, #111). Not business logic — a read-only
 * terrain → boolean presentation map.
 */
const IS_MOUNTAIN: Record<Terrain, boolean> = {
  land: false,
  water: false,
  mountain: true,
};

/**
 * Thin, dumb `Cell` atom component (M8-T1, M9-T3).
 *
 * Renders a single pointy-top hexagon board cell, extracted from the inline
 * hex rendering previously in `Board.tsx`. It is purely presentational — it
 * receives the cell's hex coords, terrain, owner, position, and highlight
 * state as props and renders the hexagon shell (SVG hexagon silhouette +
 * glass-edge highlight (M18-T3, #125), token terrain background, border,
 * `hex-cell`/`hex-pop`/`hex-current` classes,
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
  const clipId = `hex-clip-board-${q}-${r}`;
  const points = hexagonPoints(CELL_SIZE);
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
      className={`hex-cell hex-glass hex-pop absolute flex flex-col items-center justify-center ${bg} border border-line-strong ${
        isCurrent ? "hex-current" : ""
      } ${isSelected ? "hex-selected" : ""} ${
        isMoveTarget ? "hex-move-target" : ""
      } ${onSelect ? "cursor-pointer" : ""}`}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        left: x,
        top: y,
        clipPath: `url(#${clipId})`,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* SVG hexagon layer: draws the hexagon silhouette + the token glass-edge
          highlight along the true hexagon edges (M18-T3, #125). */}
      <svg
        data-testid={`board-cell-svg-${q}-${r}`}
        className="hexagon-svg pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${CELL_SIZE} ${CELL_SIZE}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={points} />
          </clipPath>
        </defs>
        <polygon points={points} className="hex-glass-edge" />
      </svg>
      {IS_MOUNTAIN[terrain] && (
        <img
          src={gameIcons.mountain}
          alt="Mountain terrain"
          data-testid="terrain-mountain"
          data-terrain={terrain}
          className="h-8 w-8 object-contain"
        />
      )}
      {children}
    </div>
  );
}
