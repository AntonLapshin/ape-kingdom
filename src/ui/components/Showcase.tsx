import type { ReactNode } from "react";
import type { ShowcaseView } from "../viewModels/useShowcase";

export interface ShowcaseProps {
  /** The renderable showcase view (files, selection, selected render) from the view model. */
  view: ShowcaseView;
  /** Select a showcase within a file (delegates to the view model / core). */
  onSelect: (file: string, showcase: string) => void;
  /** Expand/collapse a sidebar file (delegates to the view model / core). */
  onToggleFile: (file: string) => void;
}

/**
 * Thin, dumb Showcase component (M7-T2).
 *
 * Renders the component browser: a collapsible sidebar listing every
 * registered showcase file (and, when expanded, the showcases within it) plus
 * a canvas that renders the selected showcase. It is purely presentational —
 * it reads the already-adapted `view` from the view model and forwards the
 * user's clicks back through the `onSelect` / `onToggleFile` callbacks. No
 * business logic, no hooks, no side effects — every selection/validation
 * decision lives in `src/core`, reached through the view model.
 */
export function Showcase({ view, onSelect, onToggleFile }: ShowcaseProps) {
  return (
    <div
      data-testid="showcase"
      className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[280px_1fr]"
    >
      <aside
        data-testid="showcase-sidebar"
        className="glass-panel rounded-2xl p-4"
      >
        <h2 className="mb-3 text-lg font-bold text-text-primary">Showcase</h2>
        <nav>
          <ul className="space-y-1">
            {view.files.map((file) => (
              <li key={file.name}>
                <button
                  type="button"
                  data-testid="showcase-file"
                  aria-expanded={file.expanded}
                  onClick={() => onToggleFile(file.name)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                    file.selected
                      ? "bg-accent-soft text-accent"
                      : "bg-panel-strong text-text-body hover:bg-panel"
                  }`}
                >
                  <span className="inline-block w-3 text-text-body">
                    {file.expanded ? "▾" : "▸"}
                  </span>
                  {file.name}
                </button>
                {file.expanded && (
                  <ul className="ml-5 mt-1 space-y-0.5 border-l border-line pl-3">
                    {file.showcases.map((name) => {
                      const isActive =
                        file.selected && view.selectedShowcase === name;
                      return (
                        <li key={name}>
                          <button
                            type="button"
                            data-testid="showcase-entry"
                            onClick={() => onSelect(file.name, name)}
                            className={`block w-full rounded-md px-2 py-1 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-accent-soft font-medium text-accent"
                                : "text-text-body hover:bg-panel"
                            }`}
                          >
                            {name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section
        data-testid="showcase-canvas"
        className="glass-panel flex min-h-[420px] items-center justify-center rounded-2xl p-6"
      >
        {view.selectedRender ? (
          <div data-testid="showcase-render" className="w-full">
            {view.selectedRender() as ReactNode}
          </div>
        ) : (
          <p className="text-sm text-text-body">
            Select a showcase from the sidebar to preview it.
          </p>
        )}
      </section>
    </div>
  );
}
