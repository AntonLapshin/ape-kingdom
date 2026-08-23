import type { BoardCell } from "../viewModels/useGameSession";
import type { PlayerId } from "../../core/game";
import { HEX_SIZE, hexToPixel } from "../presentation";
import { Cell } from "./Cell";
import { Content } from "./Content";
import { Unit } from "./Unit";

export interface BoardProps {
  /** The renderable board cells (hex + site/unit) from the view model. */
  board: BoardCell[];
  /** The player whose turn it is (used for a subtle highlight). */
  currentPlayer: PlayerId;
}

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
      {board.map((cell, index) => {
        const { x, y } = hexToPixel(cell.hex.q, cell.hex.r);
        const owner = cell.site?.owner ?? cell.unit?.owner ?? null;
        return (
          <Cell
            key={`${cell.hex.q},${cell.hex.r}`}
            q={cell.hex.q}
            r={cell.hex.r}
            owner={owner}
            isCurrent={owner === currentPlayer}
            x={x - minX + pad - HEX_SIZE}
            y={y - minY + pad - HEX_SIZE}
            animationDelay={index * 40}
          >
            {cell.site && <Content kind={cell.site.kind} />}
            {cell.unit && (
              <Unit
                kind={cell.unit.kind}
                rank={cell.unit.rank}
                owner={cell.unit.owner}
              />
            )}
          </Cell>
        );
      })}
      <div className="pointer-events-none absolute bottom-0 right-0 text-xs text-text-muted">
        Turn: {currentPlayer === "p1" ? "You (p1)" : "AI (p2)"}
      </div>
    </div>
  );
}
