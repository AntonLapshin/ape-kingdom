import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPanel } from "../../src/ui/components/StatusPanel";
import { playerName, STEP_LABELS } from "../../src/ui/presentation";
import { playerViews } from "../../src/ui/viewModels/useGameSession";
import { standardSetup } from "../../src/core/gameSession";

/* ------------------------------------------------------------------ */
/* playerName (pure presentation helper)                               */
/* ------------------------------------------------------------------ */

describe("playerName", () => {
  it("maps p1 to You and other ids to AI", () => {
    expect(playerName("p1")).toBe("You");
    expect(playerName("p2")).toBe("AI");
  });
});

/* ------------------------------------------------------------------ */
/* STEP_LABELS                                                         */
/* ------------------------------------------------------------------ */

describe("STEP_LABELS", () => {
  it("has a label for every step", () => {
    expect(STEP_LABELS.income).toBe("Income");
    expect(STEP_LABELS.recruit).toBe("Recruit / Act");
    expect(STEP_LABELS.movefight).toBe("Move / Fight");
    expect(STEP_LABELS.done).toBe("Game Over");
  });
});

/* ------------------------------------------------------------------ */
/* StatusPanel component                                               */
/* ------------------------------------------------------------------ */

describe("StatusPanel", () => {
  const players = playerViews(standardSetup());

  it("shows the current player and step", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="income"
        winner={null}
        isDone={false}
      />,
    );
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows a banana score for each player", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="income"
        winner={null}
        isDone={false}
      />,
    );
    const scores = screen.getAllByTestId("player-score");
    expect(scores).toHaveLength(players.length);
    // Both players start with the same banana count, so there are two matches.
    expect(screen.getAllByText(`🍌 ${players[0].bananas}`)).toHaveLength(2);
  });

  it("marks an eliminated player", () => {
    const withEliminated = [
      { id: "p1", bananas: 5, eliminated: false },
      { id: "p2", bananas: 3, eliminated: true },
    ];
    render(
      <StatusPanel
        players={withEliminated}
        currentPlayer="p1"
        step="recruit"
        winner={null}
        isDone={false}
      />,
    );
    expect(screen.getByText("eliminated")).toBeInTheDocument();
  });

  it("shows a win message when the human wins", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="done"
        winner="p1"
        isDone={true}
      />,
    );
    expect(screen.getByText(/You win/)).toBeInTheDocument();
  });

  it("shows a loss message when the AI wins", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="done"
        winner="p2"
        isDone={true}
      />,
    );
    expect(screen.getByText(/The AI wins/)).toBeInTheDocument();
  });

  it("shows no result message while the game is in progress", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="income"
        winner={null}
        isDone={false}
      />,
    );
    expect(screen.queryByTestId("result")).toBeNull();
  });
});
