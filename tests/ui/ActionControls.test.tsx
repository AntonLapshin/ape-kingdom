import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionControls } from "../../src/ui/components/ActionControls";
import { actionLabel, STEP_LABELS } from "../../src/ui/presentation";
import type { GameAction } from "../../src/core/ai";

/* ------------------------------------------------------------------ */
/* actionLabel (pure presentation helper)                              */
/* ------------------------------------------------------------------ */

describe("actionLabel", () => {
  it("labels a collect-income action", () => {
    expect(actionLabel({ type: "collectIncome" })).toBe("Collect Income");
  });

  it("labels a recruit action with kind and hex", () => {
    expect(
      actionLabel({ type: "recruit", kind: "Monkey", hex: { q: 1, r: 0 } }),
    ).toContain("Recruit Monkey");
    expect(
      actionLabel({ type: "recruit", kind: "Monkey", hex: { q: 1, r: 0 } }),
    ).toContain("(1,0)");
  });

  it("labels a move action with source and target", () => {
    const label = actionLabel({
      type: "move",
      unitHex: { q: 0, r: 0 },
      targetHex: { q: 1, r: 0 },
    });
    expect(label).toContain("Move");
    expect(label).toContain("(0,0)");
    expect(label).toContain("(1,0)");
  });

  it("labels an attack action with attacker and target", () => {
    const label = actionLabel({
      type: "attack",
      attackerHex: { q: 0, r: 0 },
      targetHex: { q: 1, r: 0 },
    });
    expect(label).toContain("Attack");
    expect(label).toContain("(0,0)");
    expect(label).toContain("(1,0)");
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
/* ActionControls component                                            */
/* ------------------------------------------------------------------ */

describe("ActionControls", () => {
  const actions: GameAction[] = [
    { type: "collectIncome" },
    { type: "recruit", kind: "Monkey", hex: { q: 1, r: 0 } },
  ];

  it("renders one button per legal action", () => {
    render(
      <ActionControls
        legalActions={actions}
        step="recruit"
        isDone={false}
        onSelect={() => {}}
        onClear={() => {}}
        onSubmit={() => {}}
      />,
    );
    const buttons = screen.getAllByTestId("action-button");
    expect(buttons).toHaveLength(2);
    expect(screen.getByText("Collect Income")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked action", () => {
    const onSelect = vi.fn();
    render(
      <ActionControls
        legalActions={actions}
        step="recruit"
        isDone={false}
        onSelect={onSelect}
        onClear={() => {}}
        onSubmit={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Collect Income"));
    expect(onSelect).toHaveBeenCalledWith({ type: "collectIncome" });
  });

  it("calls onClear and onSubmit when those buttons are clicked", () => {
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ActionControls
        legalActions={actions}
        step="recruit"
        isDone={false}
        onSelect={() => {}}
        onClear={onClear}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByTestId("clear-actions"));
    expect(onClear).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("submit-turn"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows a game-over message and no buttons when done", () => {
    render(
      <ActionControls
        legalActions={[]}
        step="done"
        isDone={true}
        onSelect={() => {}}
        onClear={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("The game has ended.")).toBeInTheDocument();
    expect(screen.queryByTestId("action-button")).toBeNull();
    expect(screen.queryByTestId("submit-turn")).toBeNull();
  });

  it("shows a no-actions hint when there are no legal actions", () => {
    render(
      <ActionControls
        legalActions={[]}
        step="movefight"
        isDone={false}
        onSelect={() => {}}
        onClear={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByTestId("no-actions")).toBeInTheDocument();
  });
});
