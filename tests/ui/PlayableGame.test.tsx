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

  it("fills the viewport with a non-scrolling on-screen container", () => {
    const { container } = render(<PlayableGame />);
    const game = screen.getByTestId("playable-game");
    expect(game).toBeInTheDocument();
    // The full-viewport container is directly on the testid root.
    expect(container.querySelector("[data-testid='playable-game']")).toBe(game);
    expect(game.className).toContain("h-screen");
    expect(game.className).toContain("w-screen");
    expect(game.className).toContain("overflow-hidden");
  });

  it("drags across the viewport to pan the board", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");

    // Pointer events carry coordinates via a MouseEvent in jsdom (no native
    // PointerEvent is available); the component consumes clientX/clientY.
    const pointer = (type: string, coords?: { x: number; y: number }) => {
      const init: Record<string, unknown> = { bubbles: true, cancelable: true };
      if (coords) {
        init.clientX = coords.x;
        init.clientY = coords.y;
      }
      game.dispatchEvent(new MouseEvent(type, init));
    };

    // Pointer down at (10, 10), then two moves to (40, 55) and (60, 75).
    act(() => {
      pointer("pointerdown", { x: 10, y: 10 });
    });
    act(() => {
      pointer("pointermove", { x: 40, y: 55 });
    });
    act(() => {
      pointer("pointermove", { x: 60, y: 75 });
    });
    act(() => {
      pointer("pointerup");
    });

    const panStyle = board.getAttribute("style")!;
    // The board transform reflects the accumulated drag deltas: (30, 45) then
    // (20, 20), i.e. a total of translate(50px, 65px).
    expect(panStyle).toContain("translate(50px, 65px)");
    expect(panStyle).not.toBe(startStyle);

    // A second drag from the origin continues to add to the offset.
    act(() => {
      pointer("pointerdown", { x: 0, y: 0 });
    });
    act(() => {
      pointer("pointermove", { x: -10, y: 0 });
    });
    act(() => {
      pointer("pointerup");
    });
    expect(board.getAttribute("style")!).toContain("translate(40px, 65px)");
  });

  it("does not pan when the pointer moves without a drag gesture", () => {
    render(<PlayableGame />);
    const board = screen.getByTestId("board");
    const startStyle = board.getAttribute("style");
    // A pointer move with no preceding pointer down must not pan the board.
    const game = screen.getByTestId("playable-game") as HTMLElement;
    act(() => {
      game.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        }),
      );
    });
    expect(board.getAttribute("style")).toBe(startStyle);
  });

  it("scrolls the wheel up to zoom in and down to zoom out on the board", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");

    const wheel = (deltaY: number) => {
      act(() => {
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        );
      });
    };

    // Scroll up (negative deltaY) zooms in: default 1 -> scale(1.1).
    wheel(-100);
    expect(board.getAttribute("style")!).toContain("scale(1.1)");

    // Scroll down (positive deltaY) zooms back out to 1.
    wheel(100);
    expect(board.getAttribute("style")!).toContain("scale(1)");
  });

  it("prevents the default page scroll when zooming", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -100,
    });
    act(() => {
      game.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("clamps the zoom scale so the board maps stays visible", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );

    // Zoom out many times: the board never goes below the min scale.
    for (let i = 0; i < 40; i++) wheel(100);
    expect(board.getAttribute("style")!).toContain("scale(0.5)");

    // Zoom in many times: never above the max scale.
    for (let i = 0; i < 40; i++) wheel(-100);
    expect(board.getAttribute("style")!).toContain("scale(2.5)");
  });

  it("combines zoom and pan in the board transform", () => {
    render(<PlayableGame />);
    const game = screen.getByTestId("playable-game") as HTMLElement;
    const board = screen.getByTestId("board");
    const wheel = (deltaY: number) =>
      act(() =>
        game.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }),
        ),
      );
    const drag = (type: string, x: number, y: number) =>
      act(() =>
        game.dispatchEvent(
          new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
        ),
      );

    // Zoom in once then pan by (30, 20).
    wheel(-100);
    drag("pointerdown", 0, 0);
    drag("pointermove", 30, 20);
    drag("pointerup", 30, 20);

    expect(board.getAttribute("style")!).toContain("translate(30px, 20px)");
    expect(board.getAttribute("style")!).toContain("scale(1.1)");
  });
});
