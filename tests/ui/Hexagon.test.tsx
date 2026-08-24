import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hexagon } from "../../src/ui/components/Hexagon";
import { hexagonPoints, HEX_CLIP } from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* Hexagon atom component (M17-T3, #116 / M18-T3, #125)                */
/* ------------------------------------------------------------------ */

describe("Hexagon", () => {
  it("renders a pointy-top hexagon with the given background class", () => {
    render(<Hexagon bgClass="bg-owner-p1" />);
    const hex = screen.getByTestId("hexagon");
    expect(hex).toBeInTheDocument();
    // The token background class colours the fill.
    expect(hex.className).toContain("bg-owner-p1");
    // The hexagon silhouette is clipped by the SVG polygon (SVG approach,
    // M18-T3) rather than a literal CSS clip-path polygon string.
    expect(hex.style.clipPath).toContain("url(#hex-clip-hexagon)");
  });

  it("renders the hexagon silhouette with an SVG approach (M18-T3/#125)", () => {
    render(<Hexagon bgClass="bg-terrain-land" />);
    // An inline SVG hexagon layer hosts the polygon that draws the shape.
    const svg = document.querySelector(".hexagon-svg");
    expect(svg).not.toBeNull();
    expect(svg?.tagName).toBe("svg");
    // The clip-path references the SVG polygon via a url() fragment, not a
    // literal CSS polygon string.
    const hex = screen.getByTestId("hexagon");
    expect(hex.style.clipPath).toMatch(/^url\(#hex-clip-hexagon\)$/);
    // The glass-edge highlight polygon is drawn along the true hexagon edges.
    const edge = document.querySelector(".hex-glass-edge");
    expect(edge).not.toBeNull();
    expect(edge?.getAttribute("points")).toBe(hexagonPoints(64));
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

  it("adds the SVG glass-edge highlight when glass is on and omits it when off (M18-T3/#125)", () => {
    const { rerender } = render(<Hexagon bgClass="bg-terrain-land" />);
    expect(document.querySelector(".hex-glass-edge")).not.toBeNull();
    rerender(<Hexagon bgClass="bg-terrain-land" glass={false} />);
    expect(document.querySelector(".hex-glass-edge")).toBeNull();
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
