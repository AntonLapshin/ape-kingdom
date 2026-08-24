import type { ReactNode } from "react";
import { HEX_CLIP } from "../presentation";

export interface HexagonProps {
  /**
   * The token-backed background class that colours this hexagon (e.g.
   * `bg-terrain-land`, `bg-owner-p1`). Resolved by the pure
   * `cellHexagonClass` presentation helper so the component holds no colour
   * logic.
   */
  bgClass: string;
  /** The content to render inside the hexagon (a unit badge, an icon, etc.). */
  children?: ReactNode;
  /** The bounding-box size in px. Defaults to 64 (a compact 4-rem hexagon). */
  size?: number;
  /**
   * Whether to apply the glass hexagon treatment (translucent fill + inner
   * highlight) used on the board's cells (M17-T3). Defaults to true.
   */
  glass?: boolean;
  /** Optional data-testid used by tests (defaults to "hexagon"). */
  testId?: string;
}

/**
 * Thin, dumb `Hexagon` atom component (M17-T3).
 *
 * Renders a single pointy-top hexagon (the shared `HEX_CLIP` clip-path) with a
 * token-driven background fill and an optional glass treatment and content
 * slot. It is a pure presentational building block shared by the board ``Cell`
 * (via the glass effect) and by the bottom-left selection panel's "exact
 * selected hexagon" preview. It receives its colour as a plain class string
 * (`bgClass`) from the caller / a pure presentation helper — no hooks, no
 * context, no side effects, no business logic.
 */
export function Hexagon({
  bgClass,
  children,
  size = 64,
  glass = true,
  testId = "hexagon",
}: HexagonProps) {
  return (
    <div
      data-testid={testId}
      className={`relative flex flex-col items-center justify-center ${bgClass} ${
        glass ? "hex-glass" : ""
      }`}
      style={{
        width: size,
        height: size,
        clipPath: HEX_CLIP,
      }}
    >
      {children}
    </div>
  );
}
