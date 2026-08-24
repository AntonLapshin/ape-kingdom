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
        step="recruit"
        winner={null}
        isDone={false}
      />,
    );
    expect(screen.getByText(/Current: You/)).toBeInTheDocument();
    expect(screen.getByText("Recruit / Act")).toBeInTheDocument();
  });

  it("shows a banana score for each player", () => {
    render(
      <StatusPanel
        players={players}
        currentPlayer="p1"
        step="recruit"
        winner={null}
        isDone={false}
      />,
    );
    const scores = screen.getAllByTestId("player-score");
    expect(scores).toHaveLength(players.length);
    // The human's banana balance is shown (both players start with the same
    // count, so the human's renders once even though the AI's is hidden).
    expect(screen.getAllByText(`🍌 ${players[0].bananas}`)).toHaveLength(1);
  });

  it("hides the AI's banana count but keeps the human's (M17-T2 / #115)", () => {
    const mixed = [
      { id: "p1", bananas: 9, eliminated: false },
      { id: "p2", bananas: 42, eliminated: false },
    ];
    render(
      <StatusPanel
        players={mixed}
        currentPlayer="p1"
        step="recruit"
        winner={null}
        isDone={false}
      />,
    );
    // The human's banana balance is displayed.
    expect(screen.getByText("🍌 9")).toBeInTheDocument();
    // The AI's banana count is never revealed (issue #113-3).
    expect(screen.queryByText("🍌 42")).toBeNull();
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
        step="recruit"
        winner={null}
        isDone={false}
      />,
    );
    expect(screen.queryByTestId("result")).toBeNull();
  });
});
