import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Unit } from "../../src/ui/components/Unit";
import { gameIcons } from "../../src/assets/icons";
import { apeKindIcon } from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* Unit atom component                                                 */
/* ------------------------------------------------------------------ */

describe("Unit", () => {
  it("renders the pixel-art icon for the unit's kind", () => {
    render(<Unit kind="Gorilla" rank={4} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    const img = badge.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(gameIcons[apeKindIcon("Gorilla")]);
    expect(img?.getAttribute("alt")).toBe("Gorilla unit");
  });

  it("renders the rank alongside the icon", () => {
    render(<Unit kind="Gorilla" rank={4} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge).toHaveTextContent("4");
  });

  it("maps each ape kind to its matching icon asset", () => {
    const kinds = ["Monkey", "Gibbon", "Chimpanzee", "Gorilla"] as const;
    for (const kind of kinds) {
      const { unmount } = render(<Unit kind={kind} rank={1} owner="p1" />);
      const badge = screen.getByTestId("board-unit");
      const img = badge.querySelector("img");
      expect(img?.getAttribute("src")).toBe(gameIcons[apeKindIcon(kind)]);
      unmount();
    }
  });

  it("marks the badge with the owning player", () => {
    render(<Unit kind="Monkey" rank={1} owner="p2" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.owner).toBe("p2");
  });

  it("marks the badge with the unit kind", () => {
    render(<Unit kind="Gibbon" rank={2} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.kind).toBe("Gibbon");
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
