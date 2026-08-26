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

  it("does not carry the Kingdom owner colour on the badge for p1 units (M17-T3/#116)", () => {
    render(<Unit kind="Gibbon" rank={2} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    // Ownership is shown only by the host hexagon, not the unit badge.
    expect(badge.className).not.toContain("bg-brand-rose-deep");
    expect(badge.className).not.toContain("bg-brand-violet-deep");
    // The badge is a neutral glass chip.
    expect(badge.className).toContain("bg-panel");
    expect(badge.className).toContain("backdrop-blur");
  });

  it("does not carry the Kingdom owner colour on the badge for p2 units (M17-T3/#116)", () => {
    render(<Unit kind="Chimpanzee" rank={3} owner="p2" />);
    const badge = screen.getByTestId("board-unit");
    // Ownership is shown only by the host hexagon, not the unit badge.
    expect(badge.className).not.toContain("bg-brand-violet-deep");
    expect(badge.className).not.toContain("bg-brand-rose-deep");
    // The badge is a neutral glass chip.
    expect(badge.className).toContain("bg-panel");
    expect(badge.className).toContain("backdrop-blur");
  });

  it("flags a unit that has not acted as unacted (no dimming) by default (M19-T6/#190)", () => {
    render(<Unit kind="Monkey" rank={1} owner="p1" />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.hasActed).toBe("false");
    // Unacted units render normally — no dimming/desaturation treatment.
    expect(badge.className).not.toContain("opacity-");
    expect(badge.className).not.toContain("grayscale");
  });

  it("renders an explicitly unacted unit with no dimming (M19-T6/#190)", () => {
    render(<Unit kind="Gibbon" rank={2} owner="p1" hasActed={false} />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.hasActed).toBe("false");
    expect(badge.className).not.toContain("opacity-");
    expect(badge.className).not.toContain("grayscale");
  });

  it("renders a unit that has already acted as dimmed/opaque (M19-T6/#190)", () => {
    render(<Unit kind="Gorilla" rank={4} owner="p1" hasActed={true} />);
    const badge = screen.getByTestId("board-unit");
    expect(badge.dataset.hasActed).toBe("true");
    // An acted unit is clearly dimmed (reduced opacity) and desaturated
    // (grayscale) so the human can spot it at a glance.
    expect(badge.className).toContain("opacity-40");
    expect(badge.className).toContain("grayscale");
  });

  it("distinguishes an acted unit from an unacted one (M19-T6/#190)", () => {
    const { container } = render(
      <>
        <Unit kind="Monkey" rank={1} owner="p1" hasActed={false} />
        <Unit kind="Gibbon" rank={2} owner="p1" hasActed={true} />
      </>,
    );
    const badges = container.querySelectorAll('[data-testid="board-unit"]');
    expect(badges).toHaveLength(2);
    // The unacted badge renders normally; the acted one is dimmed/desaturated.
    expect(badges[0].getAttribute("data-has-acted")).toBe("false");
    expect(badges[0].className).not.toContain("opacity-");
    expect(badges[0].className).not.toContain("grayscale");
    expect(badges[1].getAttribute("data-has-acted")).toBe("true");
    expect(badges[1].className).toContain("opacity-40");
    expect(badges[1].className).toContain("grayscale");
  });
});
