
import type { BoardCell } from "../viewModels/useGameSession";
import { ownerBackground } from "../viewModels/useGameSession";
import type { Hex, PlayerId } from "../../core/game";
import type { PanOffset } from "../viewModels/usePan";
import { HEX_SIZE, hexToPixel } from "../presentation";
import { boardTransform } from "../viewModels/useZoom";
import { Cell } from "./Cell";
import { Content } from "./Content";
import { Unit } from "./Unit";

export interface BoardProps {
  /** The renderable board cells (hex + site/unit) from the view model. */
  board: BoardCell[];
  /** The player whose turn it is (used for a subtle highlight). */
  currentPlayer: PlayerId;
  /**
   * The optional pan offset ({x, y} in px) applied as a translate to the
   * board so the map can be dragged/repositioned (M10-T1). When omitted, no
   * transform is applied.
   */
  pan?: PanOffset;
  /**
   * The optional zoom scale (default 1, clamped to [ZOOM_MIN, ZOOM_MAX])
   * applied as a scale to the board so the map can be zoomed in/out around
   * its centre (M10-T2). When omitted, no scaling is applied.
   */
  zoom?: number;
  /**
   * The hex currently selected by the user, or null. The matching cell is
   * highlighted. When omitted, no cell is highlighted as selected.
   */
  selectedHex?: Hex | null;
  /**
   * The reachable move-target hexes (M10-T4). When provided, any cell whose
   * hex is in this list is highlighted as a reachable move target so the user
   * can click one to move the selected unit onto it.
   */
  reachableHexes?: Hex[];
  /**
   * Callback invoked with the clicked hex so the view model can select a
   * cell (M10-T3). When omitted, cells are not clickable.
   */
  onSelectCell?: (hex: Hex) => void;
}

/**
 * Thin, dumb board component (M4-T3, extended for M10-T3).
 *
 * Renders the hex map from the view-model `board` cells: each cell is drawn
 * as a hexagon coloured by its terrain (land / water / mountain, M9-T3), with
 * the unit (ape kind + rank) shown as a badge and the site label shown when
 * present. When `onSelectCell` / `selectedHex` are provided, cells become
 * clickable and the selected hex is highlighted. It is purely presentational
 * — it receives the already-adapted `BoardCell[]` and renders props only. No
 * business logic, no hooks, no side effects.
 */
export function Board({ board, currentPlayer, pan, zoom, selectedHex, reachableHexes, onSelectCell }: BoardProps) {
  // Compute the bounding box so the board is centred in its container.
  const positions = board.map((cell) => hexToPixel(cell.hex.q, cell.hex.r));
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const pad = HEX_SIZE + 8;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;

  const transform = pan
    ? boardTransform(zoom ?? 1, pan)
    : undefined;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width, height, transform }}
      data-testid="board"
    >
      {board.map((cell, index) => {
        const { x, y } = hexToPixel(cell.hex.q, cell.hex.r);
        const owner = cell.site?.owner ?? cell.unit?.owner ?? null;
        const isSelected =
          !!selectedHex &&
          selectedHex.q === cell.hex.q &&
          selectedHex.r === cell.hex.r;
        const isMoveTarget =
          !!reachableHexes &&
          reachableHexes.some(
            (h) => h.q === cell.hex.q && h.r === cell.hex.r,
          );
        return (
          <Cell
            key={`${cell.hex.q},${cell.hex.r}`}
            q={cell.hex.q}
            r={cell.hex.r}
            owner={owner}
            ownerBg={ownerBackground(owner)}
            terrain={cell.terrain}
            isCurrent={owner === currentPlayer}
            isSelected={isSelected}
            isMoveTarget={isMoveTarget}
            x={x - minX + pad - HEX_SIZE}
            y={y - minY + pad - HEX_SIZE}
            animationDelay={index * 40}
            onSelect={
              onSelectCell
                ? () => onSelectCell({ q: cell.hex.q, r: cell.hex.r })
                : undefined
            }
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
