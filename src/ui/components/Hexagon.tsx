import type { ReactNode } from "react";
import { hexagonPoints } from "../presentation";

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
   * highlight + SVG glass edge) used on the board's cells (M17-T3, extended
   * with an SVG glass-edge highlight in M18-T3, #125). Defaults to true.
   */
  glass?: boolean;
  /** Optional data-testid used by tests (defaults to "hexagon"). */
  testId?: string;
}

/**
 * Thin, dumb `Hexagon` atom component (M17-T3, SVG render in M18-T3, #125).
 *
 * Renders a single pointy-top hexagon drawn with an **SVG approach**: an
 * inline `<svg>` layer draws the hexagon `<polygon>` silhouette (via the pure
 * `hexagonPoints` helper) and hosts a token-driven glass-edge highlight along
 * the true hexagon edges, while a clipped content layer carries the token
 * background fill (`bgClass`), the glass treatment and the content slot. The
 * hexagon shape no longer relies on a literal CSS `clip-path` polygon — it is
 * sourced from the SVG polygon (`clip-path: url(#…)`), keeping `bgClass`
 * Tailwind colouring intact. It is a pure presentational building block shared
 * by the board `Cell` and by the bottom-left selection panel's "exact selected
 * hexagon" preview. It receives its colour as a plain class string (`bgClass`)
 * from the caller / a pure presentation helper — no hooks, no context, no side
 * effects, no business logic.
 */
export function Hexagon({
  bgClass,
  children,
  size = 64,
  glass = true,
  testId = "hexagon",
}: HexagonProps) {
  const clipId = `hex-clip-${testId}`;
  const points = hexagonPoints(size);
  return (
    <div
      data-testid={testId}
      className={`relative flex flex-col items-center justify-center ${bgClass} ${
        glass ? "hex-glass" : ""
      }`}
      style={{
        width: size,
        height: size,
        clipPath: `url(#${clipId})`,
      }}
    >
      {/* SVG hexagon layer: draws the silhouette polygon + the glass-edge
          highlight along the true hexagon edges (M18-T3, #125). */}
      <svg
        data-testid={`${testId}-svg`}
        className="hexagon-svg pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={points} />
          </clipPath>
        </defs>
        {glass && <polygon points={points} className="hex-glass-edge" />}
      </svg>
      {children}
    </div>
  );
}
