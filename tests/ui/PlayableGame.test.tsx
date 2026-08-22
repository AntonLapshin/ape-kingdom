import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PlayableGame } from "../../src/ui/components/PlayableGame";

/* ------------------------------------------------------------------ */
/* PlayableGame (composition wired to the useGameSession view model)   */
/* ------------------------------------------------------------------ */

describe("PlayableGame", () => {
  it("renders the board, status panel, and action controls", () => {
    render(<PlayableGame />);
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(screen.getByTestId("actions")).toBeInTheDocument();
  });

  it("lets the human collect income, then end the turn, and the AI replies", () => {
    render(<PlayableGame />);
    // The first legal action on the income step is "Collect Income".
    const incomeButton = screen.getByText("Collect Income");
    expect(incomeButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(incomeButton);
    });

    // After income, recruiting becomes available and the step advances.
    // ("Recruit / Act" appears in both the status panel and the action controls.)
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(screen.getByTestId("submit-turn"));
    });

    // The AI replies and the next human turn starts on the income step.
    expect(screen.getByText("Collect Income")).toBeInTheDocument();
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
  });

  it("clear discards this turn's selections back to the income step", () => {
    render(<PlayableGame />);
    act(() => {
      fireEvent.click(screen.getByText("Collect Income"));
    });
    expect(screen.getAllByText(/Recruit \/ Act/).length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(screen.getByTestId("clear-actions"));
    });
    expect(screen.getByText("Income")).toBeInTheDocument();
  });
});
