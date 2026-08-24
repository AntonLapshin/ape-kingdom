import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hexagon } from "../../src/ui/components/Hexagon";
import { HEX_CLIP } from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* Hexagon atom component (M17-T3, #116)                               */
/* ------------------------------------------------------------------ */

describe("Hexagon", () => {
  it("renders a pointy-top hexagon with the given background class", () => {
    render(<Hexagon bgClass="bg-owner-p1" />);
    const hex = screen.getByTestId("hexagon");
    expect(hex).toBeInTheDocument();
    // The token background class colours the fill.
    expect(hex.className).toContain("bg-owner-p1");
    // The shared HEX_CLIP clip-path draws the pointy-top hexagon.
    expect(hex.style.clipPath).toContain("polygon");
  });

  it("applies the default size of 64px", () => {
    render(<Hexagon bgClass="bg-terrain-land" />);
    const hex = screen.getByTestId("hexagon");
    expect(hex.style.width).toBe("64px");
    expect(hex.style.height).toBe("64px");
  });

  it("respects a custom size", () => {
    render(<Hexagon bgClass="bg-terrain-water" size={88} />);
    const hex = screen.getByTestId("hexagon");
    expect(hex.style.width).toBe("88px");
    expect(hex.style.height).toBe("88px");
  });

  it("applies the glass treatment by default and can disable it", () => {
    const { rerender } = render(<Hexagon bgClass="bg-terrain-land" />);
    expect(screen.getByTestId("hexagon").className).toContain("hex-glass");
    rerender(<Hexagon bgClass="bg-terrain-land" glass={false} />);
    expect(screen.getByTestId("hexagon").className).not.toContain("hex-glass");
  });

  it("renders its children content", () => {
    render(
      <Hexagon bgClass="bg-owner-p1">
        <span data-testid="inner">Monkey</span>
      </Hexagon>,
    );
    expect(screen.getByTestId("inner")).toHaveTextContent("Monkey");
  });

  it("supports a custom test id", () => {
    render(
      <Hexagon bgClass="bg-owner-p1" testId="cell-info-hexagon" />,
    );
    expect(screen.getByTestId("cell-info-hexagon")).toBeInTheDocument();
  });

  it("keeps the shared clip-path polygon definition intact", () => {
    // The clip-path is a pointy-top hexagon (flat top edge at 50% 0%).
    expect(HEX_CLIP).toContain("50% 0%");
  });
});
