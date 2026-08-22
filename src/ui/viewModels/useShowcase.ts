import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createShowcaseState,
  select,
  toggleFile,
  encodeSelection,
  decodeSelection,
  ShowcaseError,
  type ShowcaseRegistry,
  type ShowcaseState,
  type ShowcaseRender,
} from "../../core/showcase";

/**
 * Thin view model for the Showcase component browser (M7-T2).
 *
 * Adapts the pure core showcase engine (`src/core/showcase.ts`) into React
 * state, and syncs the selection to the URL (`?file=..&showcase=..`) via
 * `window.history` / `popstate` so showcases are deep-linkable and browser
 * back/forward steps through selections. It is router-agnostic — no
 * react-router dependency.
 *
 * Contains no business logic: every selection/validation decision (which file
 * or showcase exists, what is expanded, how the selection encodes into a URL)
 * is delegated to `src/core`. The view model only:
 *   - holds the core `ShowcaseState` in React state,
 *   - reads the initial selection from the URL on mount,
 *   - pushes the selection to the URL when it changes, and
 *   - re-applies the selection when the browser navigates (popstate).
 * The pure presentation adaptation `toShowcaseView` is exported separately so
 * it is testable without mounting the hook.
 */

/** A renderable sidebar entry for one showcase file. */
export interface ShowcaseFileView {
  /** The file's display name. */
  name: string;
  /** Whether the file is expanded in the sidebar. */
  expanded: boolean;
  /** Whether this file is the currently selected one. */
  selected: boolean;
  /** The names of the showcases registered in this file. */
  showcases: string[];
}

/** The plain, serializable UI-state shape the components render. */
export interface ShowcaseView {
  /** Every registered showcase file, adapted for the sidebar. */
  files: ShowcaseFileView[];
  /** The currently selected file name, or null. */
  selectedFile: string | null;
  /** The currently selected showcase name, or null. */
  selectedShowcase: string | null;
  /** The render function for the selected showcase (for the canvas), or null. */
  selectedRender: ShowcaseRender | null;
}

/**
 * Pure presentation adaptation: flatten the core selection state + registry
 * into the shape the sidebar and canvas render. Not business logic — just
 * arranging core data for the dumb component. The selected render function is
 * looked up from the registry (core treats it as opaque; the component calls
 * it to draw the canvas).
 */
export function toShowcaseView(
  state: ShowcaseState,
  registry: ShowcaseRegistry,
): ShowcaseView {
  const files = registry.map((file) => ({
    name: file.name,
    expanded: state.expanded.has(file.name),
    selected: file.name === state.file,
    showcases: Object.keys(file.showcases),
  }));
  const entry =
    state.file === null
      ? undefined
      : registry.find((f) => f.name === state.file);
  const selectedRender =
    entry && state.showcase !== null && state.showcase in entry.showcases
      ? entry.showcases[state.showcase]
      : null;
  return {
    files,
    selectedFile: state.file,
    selectedShowcase: state.showcase,
    selectedRender,
  };
}

/**
 * Read the current URL query and apply it as a selection, if it names a valid
 * file + showcase. A stale or hand-edited URL that names something unknown is
 * ignored (the core still rejects it with a typed `ShowcaseError`; the view
 * model just refuses to crash the browser on an I/O edge case).
 */
function applyUrl(registry: ShowcaseRegistry): ShowcaseState {
  const initial = createShowcaseState();
  const decoded = decodeSelection(window.location.search);
  if (decoded.file === null || decoded.showcase === null) return initial;
  try {
    return select(initial, registry, decoded.file, decoded.showcase);
  } catch (err) {
    if (err instanceof ShowcaseError) return initial;
    throw err;
  }
}

/**
 * The `useShowcase` view model.
 *
 * Holds a core `ShowcaseState` in React state and exposes:
 *  - `view` — the plain UI-state shape for the components to render;
 *  - `select(file, showcase)` — selects a showcase (delegates to core);
 *  - `toggleFile(file)` — expands/collapses a sidebar file (delegates to core).
 *
 * The selection is kept in sync with the URL: it is read from
 * `window.location.search` on mount, pushed via `window.history.pushState`
 * whenever the selection changes, and re-applied on `popstate` so browser
 * back/forward steps through selections. No business logic lives here — every
 * operation delegates to `src/core`.
 */
export function useShowcase(registry: ShowcaseRegistry): {
  view: ShowcaseView;
  select: (file: string, showcase: string) => void;
  toggleFile: (file: string) => void;
} {
  const [state, setState] = useState<ShowcaseState>(() =>
    applyUrl(registry),
  );

  // Push the selection to the URL whenever it changes, so showcases stay
  // deep-linkable. toggleFile (which only changes the expanded set, not the
  // selection) leaves the URL untouched because encodeSelection is unchanged.
  useEffect(() => {
    const query = encodeSelection(state);
    if (window.location.search !== query) {
      window.history.pushState({}, "", query || window.location.pathname);
    }
  }, [state]);

  // Handle browser back/forward: re-read the URL and re-apply the selection.
  useEffect(() => {
    const onPopState = () => {
      const decoded = decodeSelection(window.location.search);
      setState((current) => {
        if (decoded.file === null || decoded.showcase === null) {
          return createShowcaseState();
        }
        try {
          return select(current, registry, decoded.file, decoded.showcase);
        } catch (err) {
          if (err instanceof ShowcaseError) return createShowcaseState();
          throw err;
        }
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [registry]);

  const view = useMemo(() => toShowcaseView(state, registry), [state, registry]);

  const selectFn = useCallback(
    (file: string, showcase: string) => {
      setState((current) => select(current, registry, file, showcase));
    },
    [registry],
  );

  const toggleFn = useCallback(
    (file: string) => {
      setState((current) => toggleFile(current, registry, file));
    },
    [registry],
  );

  return { view, select: selectFn, toggleFile: toggleFn };
}
