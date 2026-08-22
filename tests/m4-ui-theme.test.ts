import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural tests guarding acceptance criterion 1 of issue #32 / PR #35
 * (M4 UI uses only token-backed utilities).
 *
 * The five M4 UI files must use only token-backed utilities — no raw hex, no
 * `rgba(...)`, and no default Tailwind palettes (`slate-*`, `indigo-*`,
 * `rose-*`, `sky-*`, `emerald-*`, `amber-*`). The only literal colors allowed
 * are the `brand-*` token names defined by the theme system (M5-T1). This
 * mirrors the structural approach used in `tests/theme.test.ts`.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The five M4 UI files refactored to semantic theme tokens (issue #32). */
const M4_UI_FILES = [
  "src/ui/components/Board.tsx",
  "src/ui/components/ActionControls.tsx",
  "src/ui/components/StatusPanel.tsx",
  "src/ui/components/PlayableGame.tsx",
  "src/App.tsx",
];

/** Default Tailwind palette names that must not appear (outside `brand-`). */
const DEFAULT_PALETTES = ["slate", "indigo", "rose", "sky", "emerald", "amber"];

describe("M4 UI components — token-backed utilities only (issue #32 AC1)", () => {
  for (const file of M4_UI_FILES) {
    const source = readFileSync(resolve(ROOT, file), "utf8");

    it(`${file} contains no raw hex colors`, () => {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it(`${file} contains no rgba(...) / rgb(...) colors`, () => {
      expect(source).not.toMatch(/rgba?\(/);
    });

    it(`${file} contains no default Tailwind palette classes (outside brand-)`, () => {
      for (const palette of DEFAULT_PALETTES) {
        // Matches a Tailwind utility referencing the palette (e.g. bg-amber-500,
        // text-slate-900, border-rose-200) but not the brand-* token names
        // (e.g. bg-brand-amber-soft), which are explicitly allowed.
        const re = new RegExp(
          `(?:bg|text|border|from|to|via|ring|shadow|outline|fill|stroke)-${palette}-`,
        );
        expect(
          source,
          `found default palette "${palette}" in ${file}`,
        ).not.toMatch(re);
      }
    });
  }
});
