import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Unit } from "../../src/ui/components/Unit";

/* ------------------------------------------------------------------ */
/* Unit atom component                                                 */
/* ------------------------------------------------------------------ */

describe("Unit", () => {
  it("renders the kind and rank of the unit", () => {
    render(<Unit kind="Gorilla" rank={4} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge).toHaveTextContent("Gorilla 4");
  });

  it("marks the badge with the owning player", () => {
    render(<Unit kind="Monkey" rank={1} owner="p2" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.owner).toBe("p2");
  });

  it("uses the rose-deep badge for p1 units", () => {
    render(<Unit kind="Gibbon" rank={2} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.className).toContain("bg-brand-rose-deep");
    expect(badge.className).toContain("text-inverted");
  });

  it("uses the violet-deep badge for p2 units", () => {
    render(<Unit kind="Chimpanzee" rank={3} owner="p2" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.className).toContain("bg-brand-violet-deep");
    expect(badge.className).toContain("text-inverted");
  });
});
