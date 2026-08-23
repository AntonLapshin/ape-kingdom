import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Cell } from "../../src/ui/components/Cell";
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
