import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import App from "../../src/App";

/**
 * App routing tests (M7-T4).
 *
 * Verifies the thin, router-agnostic route layer in `App.tsx`: the playable
 * game is the default view, the top-right link opens the `/showcase` route and
 * links back to the game, deep links (`?file=..&showcase=..`) still work on
 * the showcase, and browser back/forward (popstate) navigates between the two
 * routes. No business logic is tested here — this is pure view-layer wiring.
 */

/** Reset the URL to a clean state between tests. */
function resetUrl() {
  window.history.replaceState({}, "", "/");
}

beforeEach(() => {
  resetUrl();
  cleanup();
});

afterEach(() => {
  resetUrl();
  cleanup();
});

describe("App routing", () => {
  it("renders the playable game by default", () => {
    render(<App />);
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.queryByTestId("showcase")).toBeNull();
  });

  it("renders a top-right link that opens the showcase on click", () => {
    render(<App />);
    const link = screen.getByTestId("showcase-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent("Showcase");

    act(() => {
      fireEvent.click(link);
    });

    // The showcase page is now rendered and the link flips to "back to game".
    expect(screen.getByTestId("showcase")).toBeInTheDocument();
    expect(screen.queryByTestId("playable-game")).toBeNull();
    expect(screen.getByTestId("showcase-link")).toHaveTextContent(
      "Back to game",
    );
    expect(window.location.pathname).toBe("/showcase");
  });

  it("links back to the game from the showcase", () => {
    window.history.replaceState({}, "", "/showcase");
    render(<App />);
    expect(screen.getByTestId("showcase")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("showcase-link"));
    });

    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.queryByTestId("showcase")).toBeNull();
    expect(window.location.pathname).toBe("/");
  });

  it("renders the showcase directly when the route is /showcase", () => {
    window.history.replaceState({}, "", "/showcase");
    render(<App />);
    expect(screen.getByTestId("showcase")).toBeInTheDocument();
    expect(screen.getByTestId("showcase-sidebar")).toBeInTheDocument();
  });

  it("keeps a showcase deep link selection when navigating to /showcase", () => {
    // A deep link names a valid file + showcase; the view model expands and
    // selects it, so the canvas shows the render.
    window.history.replaceState(
      {},
      "",
      "/showcase?file=DemoPanel&showcase=Shipped",
    );
    render(<App />);
    expect(screen.getByTestId("showcase")).toBeInTheDocument();
    expect(screen.getByTestId("showcase-render")).toBeInTheDocument();
  });

  it("browser back/forward navigates between the game and showcase", () => {
    render(<App />);
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();

    // Navigate to the showcase (pushes a history entry).
    act(() => {
      fireEvent.click(screen.getByTestId("showcase-link"));
    });
    expect(screen.getByTestId("showcase")).toBeInTheDocument();

    // Simulate the browser back button: pathname returns to "/" and the
    // browser fires a popstate event.
    window.history.replaceState({}, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByTestId("playable-game")).toBeInTheDocument();
    expect(screen.queryByTestId("showcase")).toBeNull();

    // And forward again to the showcase.
    window.history.replaceState({}, "", "/showcase");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByTestId("showcase")).toBeInTheDocument();
  });
});
