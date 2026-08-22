/**
 * Pure core showcase engine (M7-T1).
 *
 * Adopts the hand-rolled Showcase component browser's pure engine into
 * `src/core` so the app can drive a component gallery (a Storybook-style
 * browser) without any React or browser dependency.
 *
 * A `ShowcaseRegistry` is a flat list of showcase files. Each file has a
 * `name` (the display name shown in the sidebar) and a map of named showcase
 * render functions (the demo scenarios for that component). The render
 * functions are deliberately opaque here — core never calls them, it only
 * reasons about their names, so the engine stays free of React/DOM.
 *
 * `ShowcaseState` is the immutable selection state: which file is selected,
 * which showcase within it is selected, and which files are expanded in the
 * sidebar. `select` moves the selection (validating both names against the
 * registry with typed errors — no silent fallbacks), and `toggleFile`
 * expands/collapses a sidebar entry.
 *
 * The engine also owns URL deep-linking: `encodeSelection` / `decodeSelection`
 * turn the selection into/out of the `?file=..&showcase=..` query string so
 * showcases are deep-linkable and browser back/forward can step through them.
 *
 * This module has no React, Tailwind, or browser dependencies — it is pure
 * business logic, 100% covered by tests.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * A showcase render function. Core treats this as opaque — it never invokes
 * it, it only carries it in the registry so the (thin) UI layer can render
 * the selected scenario.
 */
export type ShowcaseRender = () => unknown;

/** A single registered showcase file: a display name + named render functions. */
export interface ShowcaseFile {
  /** Display name shown in the sidebar. */
  name: string;
  /** Map of named showcase render functions for this file. */
  showcases: Record<string, ShowcaseRender>;
}

/** A flat registry of showcase files. */
export type ShowcaseRegistry = ShowcaseFile[];

/** The immutable selection state of the Showcase browser. */
export interface ShowcaseState {
  /** The currently selected file name, or null when nothing is selected. */
  file: string | null;
  /** The currently selected showcase name within `file`, or null. */
  showcase: string | null;
  /** The set of file names currently expanded in the sidebar. */
  expanded: ReadonlySet<string>;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** The reason a showcase operation was rejected. */
export type ShowcaseErrorKind =
  /** The requested file name is not present in the registry. */
  | "unknown-file"
  /** The requested showcase name is not present in the selected file. */
  | "unknown-showcase"
  /** The registry is malformed (duplicate file names or empty file). */
  | "invalid-registry";

/** A typed error describing why a showcase operation was rejected. */
export class ShowcaseError extends Error {
  readonly kind: ShowcaseErrorKind;

  constructor(kind: ShowcaseErrorKind, message: string) {
    super(message);
    this.name = "ShowcaseError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Initial state                                                       */
/* ------------------------------------------------------------------ */

/**
 * Create the initial (empty) showcase selection state: nothing selected and
 * nothing expanded.
 */
export function createShowcaseState(): ShowcaseState {
  return { file: null, showcase: null, expanded: new Set() };
}

/* ------------------------------------------------------------------ */
/* Registry helpers                                                    */
/* ------------------------------------------------------------------ */

/** Find a file by name in the registry, or undefined when absent. */
export function findFile(
  registry: ShowcaseRegistry,
  name: string,
): ShowcaseFile | undefined {
  return registry.find((f) => f.name === name);
}

/**
 * Validate a registry: every file must have a non-empty name and at least one
 * showcase, and no two files may share a name. Throws a typed
 * `ShowcaseError` (`invalid-registry`) when the registry is malformed.
 */
export function validateRegistry(registry: ShowcaseRegistry): void {
  const seen = new Set<string>();
  for (const file of registry) {
    if (!file.name) {
      throw new ShowcaseError(
        "invalid-registry",
        "Every showcase file must have a non-empty name",
      );
    }
    if (seen.has(file.name)) {
      throw new ShowcaseError(
        "invalid-registry",
        `Duplicate showcase file name: ${file.name}`,
      );
    }
    seen.add(file.name);
    if (Object.keys(file.showcases).length === 0) {
      throw new ShowcaseError(
        "invalid-registry",
        `Showcase file "${file.name}" has no showcases`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Select a showcase within a file.
 *
 * Both `file` and `showcase` must exist in the registry — unknown names are
 * rejected with a typed `ShowcaseError` (`unknown-file` / `unknown-showcase`),
 * never silently ignored. Selecting a file also expands it in the sidebar so
 * the selected showcase is visible. Returns a new `ShowcaseState`; does not
 * mutate the input.
 */
export function select(
  state: ShowcaseState,
  registry: ShowcaseRegistry,
  file: string,
  showcase: string,
): ShowcaseState {
  const entry = findFile(registry, file);
  if (!entry) {
    throw new ShowcaseError(
      "unknown-file",
      `Unknown showcase file: ${file}`,
    );
  }
  if (!(showcase in entry.showcases)) {
    throw new ShowcaseError(
      "unknown-showcase",
      `Unknown showcase "${showcase}" in file "${file}"`,
    );
  }
  const expanded = new Set(state.expanded);
  expanded.add(file);
  return { ...state, file, showcase, expanded };
}

/**
 * Toggle whether a file is expanded in the sidebar.
 *
 * The file must exist in the registry — an unknown name is rejected with a
 * typed `ShowcaseError` (`unknown-file`). Expanding a file does not select it.
 * Returns a new `ShowcaseState`; does not mutate the input.
 */
export function toggleFile(
  state: ShowcaseState,
  registry: ShowcaseRegistry,
  file: string,
): ShowcaseState {
  if (!findFile(registry, file)) {
    throw new ShowcaseError("unknown-file", `Unknown showcase file: ${file}`);
  }
  const expanded = new Set(state.expanded);
  if (expanded.has(file)) {
    expanded.delete(file);
  } else {
    expanded.add(file);
  }
  return { ...state, expanded };
}

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Encode a selection into a URL query string (`?file=..&showcase=..`).
 *
 * Both names are percent-encoded so they survive arbitrary characters. When
 * nothing is selected, returns an empty string (no query). The registry is
 * not required here — encoding is a pure projection of the selection state.
 */
export function encodeSelection(state: ShowcaseState): string {
  if (state.file === null || state.showcase === null) return "";
  const file = encodeURIComponent(state.file);
  const showcase = encodeURIComponent(state.showcase);
  return `?file=${file}&showcase=${showcase}`;
}

/**
 * Decode a URL query string into a selection.
 *
 * Accepts a full query string (with or without a leading `?`) and returns the
 * `file` / `showcase` names found in it (percent-decoded), or null for each
 * when absent. Unknown names are NOT rejected here — validation against the
 * registry happens when the caller applies the selection via `select`, so a
 * stale or hand-edited URL can be surfaced as a typed error rather than
 * silently ignored.
 */
export function decodeSelection(
  query: string,
): { file: string | null; showcase: string | null } {
  const clean = query.startsWith("?") ? query.slice(1) : query;
  const params = new URLSearchParams(clean);
  const file = params.get("file");
  const showcase = params.get("showcase");
  return {
    file: file === null ? null : decodeURIComponent(file),
    showcase: showcase === null ? null : decodeURIComponent(showcase),
  };
}
