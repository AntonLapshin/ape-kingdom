import { useCallback, useEffect, useState } from "react";
import { PlayableGame } from "./ui/components/PlayableGame";
import { Showcase } from "./ui/components/Showcase";
import { useShowcase } from "./ui/viewModels/useShowcase";
import { showcaseRegistry } from "./ui/showcases";

/**
 * App root (M7-T4).
 *
 * A thin, router-agnostic page that picks between the playable game (the
 * default view) and the Showcase component browser, and exposes a top-right
 * link to jump between them. It holds no business logic — the game is reached
 * through `PlayableGame` (which wires `useGameSession`), and the showcase
 * through the `useShowcase` view model + dumb `Showcase` component.
 *
 * Routing is hand-rolled (no react-router dependency, consistent with the
 * rest of the app):
 *  - the route is derived from the pathname (`/showcase` → showcase, else game),
 *  - navigation pushes a new pathname via `window.history.pushState`,
 *  - browser back/forward is handled via `popstate`,
 *  - the showcase's own `useShowcase` view model keeps the `?file=..&showcase=..`
 *    deep-link query in sync, so deep links and back/forward still work.
 *
 * Navigation preserves the app's base path (e.g. `/ape-kingdom/` under GitHub
 * Pages) so the route works both in dev and when deployed.
 */

/** The two app routes. */
type Route = "game" | "showcase";

/**
 * Read the current route from the pathname. Anything whose pathname ends in
 * `/showcase` is the showcase; everything else is the playable game.
 */
function currentRoute(): Route {
  return window.location.pathname.endsWith("/showcase") ? "showcase" : "game";
}

/**
 * Compute the app's root path (with a trailing slash) so navigation can
 * preserve the base path the app is served under (e.g. `/ape-kingdom/`).
 * When on the showcase, the trailing `/showcase` is stripped first.
 */
function appRoot(): string {
  const root = window.location.pathname.replace(/\/showcase\/?$/, "");
  return root.endsWith("/") ? root : `${root}/`;
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const showcase = useShowcase(showcaseRegistry());

  // Browser back/forward: re-read the route from the pathname.
  useEffect(() => {
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Navigate to a route by pushing a new pathname (preserving the base path).
  const navigate = useCallback((next: Route) => {
    const target = next === "showcase" ? `${appRoot()}showcase` : appRoot();
    window.history.pushState({}, "", target);
    setRoute(next);
  }, []);

  const isShowcase = route === "showcase";

  return (
    <>
      <a
        href={isShowcase ? appRoot() : `${appRoot()}showcase`}
        data-testid="showcase-link"
        onClick={(event) => {
          event.preventDefault();
          navigate(isShowcase ? "game" : "showcase");
        }}
        className="fixed right-4 top-4 z-50 inline-flex items-center gap-1 rounded-full border border-line bg-panel-strong px-4 py-1.5 text-sm font-medium text-text-body shadow-sm transition-colors hover:bg-panel hover:text-accent"
      >
        {isShowcase ? "← Back to game" : "Showcase"}
      </a>

      {isShowcase ? (
        <main className="login-bg min-h-screen p-6">
          <div className="pt-10">
            <Showcase
              view={showcase.view}
              onSelect={showcase.select}
              onToggleFile={showcase.toggleFile}
            />
          </div>
        </main>
      ) : (
        <main className="login-bg flex h-screen w-screen items-center justify-center overflow-hidden">
          <PlayableGame />
        </main>
      )}
    </>
  );
}
