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
