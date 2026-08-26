import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EndTurnButton } from "../../src/ui/components/EndTurnButton";

/* ------------------------------------------------------------------ */
/* EndTurnButton component (M17-T2 / #115)                             */
/* ------------------------------------------------------------------ */

describe("EndTurnButton", () => {
  it("renders a single circular End Turn button", () => {
    render(<EndTurnButton enabled onSubmit={() => {}} />);
    const button = screen.getByTestId("submit-turn");
    // One button only (the bottom-right corner shows just the End Turn button,
    // with no separate Step: Recruit / Act label - issue #113-2).
    expect(button).toBeInTheDocument();
    // A beautiful circle.
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("end-turn-btn");
  });

  it("keeps its props, disabled state and aria-label (frosted-glass polish #186)", () => {
    render(<EndTurnButton enabled={false} onSubmit={() => {}} />);
    const button = screen.getByTestId("submit-turn");
    // Behaviour is unchanged by the styling polish: it is still a disabled
    // native button exposing the same test id and accessible label.
    expect(button).toHaveAttribute("data-testid", "submit-turn");
    expect(button).toHaveAttribute("aria-label", "End Turn");
    expect(button).toBeDisabled();
  });

  it("carries the frosted-glass surface classes (translucent backdrop-blur glass) (#186)", () => {
    render(<EndTurnButton enabled onSubmit={() => {}} />);
    const button = screen.getByTestId("submit-turn");
    // The frosted-glass polish builds on the existing token `glass` utility
    // (backdrop-blur translucent surface) plus the `end-turn-btn` accent-tinted
    // layer, so the button reads as a distinct frosted disc - not plain glass
    // alone and not an opaque flat disc.
    expect(button.className).toContain("glass");
    expect(button.className).toContain("end-turn-btn");
    // The accent-tinted frosted layer is driven by the `end-turn-btn` rule in
    // index.css, which must stay token-backed (verified structurally).
    expect(button.className).toContain("rounded-full");
  });

  it("calls onSubmit when clicked while enabled", () => {
    const onSubmit = vi.fn();
    render(<EndTurnButton enabled onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("submit-turn"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("is disabled and does not submit when not the human's turn", () => {
    const onSubmit = vi.fn();
    render(<EndTurnButton enabled={false} onSubmit={onSubmit} />);
    const button = screen.getByTestId("submit-turn") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes a clear aria-label for accessibility", () => {
    render(<EndTurnButton enabled onSubmit={() => {}} />);
    expect(screen.getByLabelText("End Turn")).toBeInTheDocument();
  });
});
