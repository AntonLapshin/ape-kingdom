import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Cell } from "../../src/ui/components/Cell";
import { gameIcons } from "../../src/assets/icons";
import { HEX_SIZE } from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* Cell atom component                                                 */
/* ------------------------------------------------------------------ */

describe("Cell", () => {
  it("renders a hex cell with its coordinates and neutral owner", () => {
    render(<Cell q={2} r={1} owner={null} x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.dataset.hex).toBe("2,1");
    expect(cell.dataset.owner).toBe("neutral");
  });

  it("marks the cell with its owning player", () => {
    render(<Cell q={0} r={0} owner="p2" x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.dataset.owner).toBe("p2");
  });

  it("defaults terrain to land", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.dataset.terrain).toBe("land");
    expect(cell.className).toContain("bg-terrain-land");
  });

  it("renders a distinct token background per terrain (land/water/mountain)", () => {
    const { rerender } = render(
      <Cell q={0} r={0} owner={null} terrain="land" x={0} y={0} />,
    );
    expect(screen.getByTestId("board-cell").dataset.terrain).toBe("land");
    expect(screen.getByTestId("board-cell").className).toContain(
      "bg-terrain-land",
    );

    rerender(<Cell q={0} r={0} owner={null} terrain="water" x={0} y={0} />);
    expect(screen.getByTestId("board-cell").dataset.terrain).toBe("water");
    expect(screen.getByTestId("board-cell").className).toContain(
      "bg-terrain-water",
    );

    rerender(<Cell q={0} r={0} owner={null} terrain="mountain" x={0} y={0} />);
    expect(screen.getByTestId("board-cell").dataset.terrain).toBe("mountain");
    expect(screen.getByTestId("board-cell").className).toContain(
      "bg-terrain-mountain",
    );
  });

  it("keeps land terrain (and styling) when terrain prop is omitted", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.dataset.terrain).toBe("land");
    expect(cell.className).toContain("bg-terrain-land");
  });

  it("applies the hex-cell/hex-pop classes and clip-path", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.className).toContain("hex-cell");
    expect(cell.className).toContain("hex-pop");
    expect(cell.style.clipPath).toContain("polygon");
  });

  it("adds the hex-current highlight when marked as current territory", () => {
    render(<Cell q={0} r={0} owner="p1" isCurrent x={0} y={0} />);
    expect(screen.getByTestId("board-cell").className).toContain("hex-current");
  });

  it("uses the owner territory tint background when provided (M13-T2/#89)", () => {
    render(<Cell q={0} r={0} owner="p1" ownerBg="bg-owner-p1" x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    // The view-model-derived owner tint replaces the terrain background for an
    // owned territory cell.
    expect(cell.className).toContain("bg-owner-p1");
    expect(cell.className).not.toContain("bg-terrain-land");
  });

  it("keeps the terrain background when no owner tint is provided (neutral)", () => {
    render(
      <Cell q={0} r={0} owner={null} ownerBg={null} terrain="water" x={0} y={0} />,
    );
    const cell = screen.getByTestId("board-cell");
    expect(cell.className).toContain("bg-terrain-water");
  });

  it("adds the hex-selected highlight and data flag when selected", () => {
    render(<Cell q={0} r={0} owner="p1" isSelected x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.className).toContain("hex-selected");
    expect(cell.dataset.selected).toBe("true");
  });

  it("marks unselected cells as not selected", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    expect(screen.getByTestId("board-cell").dataset.selected).toBe("false");
  });

  it("adds the move-target highlight and data flag when reachable", () => {
    render(<Cell q={0} r={0} owner={null} isMoveTarget x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.className).toContain("hex-move-target");
    expect(cell.dataset.moveTarget).toBe("true");
  });

  it("marks non-target cells as not move targets by default", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    expect(screen.getByTestId("board-cell").dataset.moveTarget).toBe("false");
  });

  it("combines current and selected highlights on the same cell", () => {
    render(<Cell q={0} r={0} owner="p1" isCurrent isSelected x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.className).toContain("hex-current");
    expect(cell.className).toContain("hex-selected");
  });

  it("invokes onSelect when clicked and is keyboard-accessible via role button", () => {
    const onSelect = vi.fn();
    render(<Cell q={3} r={4} owner={null} x={0} y={0} onSelect={onSelect} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell).toHaveAttribute("role", "button");
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
    // Enter key also triggers selection for keyboard access.
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("is not clickable (no role button) when no onSelect is provided", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    expect(screen.getByTestId("board-cell")).not.toHaveAttribute("role", "button");
  });

  it("renders the pixel-art Mountain icon on a mountain terrain cell (M16-T2/#111)", () => {
    render(<Cell q={0} r={0} owner={null} terrain="mountain" x={0} y={0} />);
    const cell = screen.getByTestId("board-cell");
    // The token background is kept for a mountain cell.
    expect(cell.className).toContain("bg-terrain-mountain");
    const icon = screen.getByTestId("terrain-mountain");
    expect(icon.tagName).toBe("IMG");
    expect(icon.getAttribute("src")).toBe(gameIcons.mountain);
    expect(icon.getAttribute("alt")).toBe("Mountain terrain");
    expect(icon.dataset.terrain).toBe("mountain");
  });

  it("does not render the Mountain icon on land or water terrain", () => {
    const { rerender } = render(
      <Cell q={0} r={0} owner={null} terrain="land" x={0} y={0} />,
    );
    expect(screen.queryByTestId("terrain-mountain")).toBeNull();
    rerender(<Cell q={0} r={0} owner={null} terrain="water" x={0} y={0} />);
    expect(screen.queryByTestId("terrain-mountain")).toBeNull();
  });

  it("renders the Mountain icon alongside cell content when both present", () => {
    render(
      <Cell q={0} r={0} owner={null} terrain="mountain" x={0} y={0}>
        <span data-testid="content">Grove</span>
      </Cell>,
    );
    expect(screen.getByTestId("terrain-mountain")).toBeTruthy();
    expect(screen.getByTestId("content")).toHaveTextContent("Grove");
  });

  it("renders its children content", () => {
    render(
      <Cell q={0} r={0} owner={null} x={0} y={0}>
        <span data-testid="content">Grove</span>
      </Cell>,
    );
    expect(screen.getByTestId("content")).toHaveTextContent("Grove");
  });

  it("applies the animation delay and pixel position styles", () => {
    render(<Cell q={0} r={0} owner={null} x={10} y={20} animationDelay={250} />);
    const cell = screen.getByTestId("board-cell");
    expect(cell.style.animationDelay).toBe("250ms");
    expect(cell.style.left).toBe("10px");
    expect(cell.style.top).toBe("20px");
    // Derived from HEX_SIZE (2x the hex size), sharing the presentation constant.
    expect(cell.style.width).toBe(`${HEX_SIZE * 2}px`);
    expect(cell.style.height).toBe(`${HEX_SIZE * 2}px`);
  });
});
