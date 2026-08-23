import type { ReactNode } from "react";
import type { PlayerId } from "../../core/game";
import { HEX_SIZE, HEX_CLIP } from "../presentation";

export interface CellProps {
  /** The axial hex coordinates (q, r) of this cell. */
  q: number;
  /** The axial hex row coordinate of this cell. */
  r: number;
  /** The owner of this cell (site/unit), or null for neutral terrain. */
  owner: PlayerId | null;
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
 * Token-backed background classes used to colour a hex by its controller.
 * Player/site/unit colours map to the brand palette tokens (rose → violet
 * brand family), per GUIDELINES-WEB-THEME.md — no raw Tailwind palettes.
 */
const OWNER_BG: Record<string, string> = {
  p1: "bg-brand-rose",
  p2: "bg-brand-violet",
  neutral: "bg-brand-amber-soft",
};

/**
 * Thin, dumb `Cell` atom component (M8-T1).
 *
 * Renders a single pointy-top hexagon board cell, extracted from the inline
 * hex rendering previously in `Board.tsx`. It is purely presentational — it
 * receives the cell's hex coords, owner, position, and highlight state as
 * props and renders the hexagon shell (clip-path, token background, border,
 * `hex-cell`/`hex-pop`/`hex-current` classes, `data-testid="board-cell"` /
 * `data-hex` / `data-owner` attributes) with any content passed via the
 * `children` slot. No hooks, no context, no side effects, no business logic.
 */
export function Cell({
  q,
  r,
  owner,
  isCurrent = false,
  x,
  y,
  animationDelay = 0,
  children,
}: CellProps) {
  const bg = owner ? OWNER_BG[owner] ?? OWNER_BG.neutral : OWNER_BG.neutral;
  return (
    <div
      data-testid="board-cell"
      data-hex={`${q},${r}`}
      data-owner={owner ?? "neutral"}
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
