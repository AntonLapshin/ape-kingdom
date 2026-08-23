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

  it("uses the rose token background for p1 and violet for p2", () => {
    const { rerender } = render(<Cell q={0} r={0} owner="p1" x={0} y={0} />);
    expect(screen.getByTestId("board-cell").className).toContain("bg-brand-rose");
    rerender(<Cell q={0} r={0} owner="p2" x={0} y={0} />);
    expect(screen.getByTestId("board-cell").className).toContain("bg-brand-violet");
  });

  it("uses the amber-soft token background for neutral terrain", () => {
    render(<Cell q={0} r={0} owner={null} x={0} y={0} />);
    expect(screen.getByTestId("board-cell").className).toContain("bg-brand-amber-soft");
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
