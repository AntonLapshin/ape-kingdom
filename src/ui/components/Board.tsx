import type { BoardCell } from "../viewModels/useGameSession";
import type { PlayerId } from "../../core/game";
import { HEX_SIZE, hexToPixel, SITE_LABELS } from "../presentation";

export interface BoardProps {
  /** The renderable board cells (hex + site/unit) from the view model. */
  board: BoardCell[];
  /** The player whose turn it is (used for a subtle highlight). */
  currentPlayer: PlayerId;
}

/** A CSS clip-path polygon that draws a pointy-top hexagon. */
const HEX_CLIP =
  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

/** Tailwind background classes used to colour a hex by its controller. */
const OWNER_BG: Record<string, string> = {
  p1: "bg-rose-200",
  p2: "bg-sky-200",
  neutral: "bg-amber-100",
};

/**
 * Thin, dumb board component (M4-T3).
 *
 * Renders the hex map from the view-model `board` cells: each cell is drawn
 * as a hexagon coloured by the site/unit owner, with the unit (ape kind +
 * rank) shown as a badge when present. It is purely presentational — it
 * receives the already-adapted `BoardCell[]` and renders props only. No
 * business logic, no hooks, no side effects.
 */
export function Board({ board, currentPlayer }: BoardProps) {
  // Compute the bounding box so the board is centred in its container.
  const positions = board.map((cell) => hexToPixel(cell.hex.q, cell.hex.r));
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const pad = HEX_SIZE + 8;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;

  return (
    <div
      className="relative mx-auto"
      style={{ width, height }}
      data-testid="board"
    >
      {board.map((cell) => {
        const { x, y } = hexToPixel(cell.hex.q, cell.hex.r);
        const owner = cell.site?.owner ?? cell.unit?.owner ?? null;
        const bg = owner ? OWNER_BG[owner] ?? "bg-amber-100" : OWNER_BG.neutral;
        return (
          <div
            key={`${cell.hex.q},${cell.hex.r}`}
            data-testid="board-cell"
            data-hex={`${cell.hex.q},${cell.hex.r}`}
            data-owner={owner ?? "neutral"}
            className={`absolute flex flex-col items-center justify-center ${bg} border border-slate-400`}
            style={{
              width: HEX_SIZE * 2,
              height: HEX_SIZE * 2,
              left: x - minX + pad - HEX_SIZE,
              top: y - minY + pad - HEX_SIZE,
              clipPath: HEX_CLIP,
            }}
          >
            {cell.site && (
              <span className="text-[10px] font-semibold leading-none text-slate-700">
                {SITE_LABELS[cell.site.kind]}
              </span>
            )}
            {cell.unit && (
              <span
                data-testid="board-unit"
                data-owner={cell.unit.owner}
                className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${
                  cell.unit.owner === "p1" ? "bg-rose-600" : "bg-sky-600"
                }`}
              >
                {cell.unit.kind}
              </span>
            )}
          </div>
        );
      })}
      <div className="pointer-events-none absolute bottom-0 right-0 text-xs text-slate-500">
        Turn: {currentPlayer === "p1" ? "You (p1)" : "AI (p2)"}
      </div>
    </div>
  );
}
