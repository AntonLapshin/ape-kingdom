/**
 * Ape Kingdom — pixel-art game icon assets (theme-independent brand assets).
 *
 * These 8 PNG icons were extracted from the source image attached to issue
 * #103 (a 4x2 grid of pixel-art icons on a white background). Each icon was
 * cropped to its content bounding box and its white background removed, so
 * every file is an RGBA PNG with a transparent background. See
 * `scripts/extract-icons.py` and `src/assets/icons/README.md` for details.
 *
 * The icons are theme-independent brand assets (per GUIDELINES-WEB-THEME.md
 * §6 rule 3): they have a fixed palette and do not carry any theme semantics,
 * so they may be referenced directly by the UI without going through design
 * tokens. This module is a thin barrel that exposes each asset URL so the
 * UI wiring (M16-T2) can import them with type-safe, tree-shake-able imports.
 */
import homeTreeUrl from "./home-tree.png";
import monkeyNestUrl from "./monkey-nest.png";
import monkeyUrl from "./monkey.png";
import gibbonUrl from "./gibbon.png";
import chimpanzeeUrl from "./chimpanzee.png";
import gorillaUrl from "./gorilla.png";
import mountainUrl from "./mountain.png";
import graveUrl from "./grave.png";

/** The eight pixel-art game icons, keyed by their in-game meaning. */
export const gameIcons = {
  /** Home Tree — a player's rank-1 spawn site. */
  homeTree: homeTreeUrl,
  /** Monkey Nest — a player's other spawn site. */
  monkeyNest: monkeyNestUrl,
  /** Monkey — the rank-1 ape unit. */
  monkey: monkeyUrl,
  /** Gibbon — the rank-2 ape unit. */
  gibbon: gibbonUrl,
  /** Chimpanzee — the rank-3 ape unit. */
  chimpanzee: chimpanzeeUrl,
  /** Gorilla — the rank-4 ape unit. */
  gorilla: gorillaUrl,
  /** Mountain — an impassable terrain site. */
  mountain: mountainUrl,
  /** Grave — a removed-unit marker site. */
  grave: graveUrl,
} as const;

export type GameIconName = keyof typeof gameIcons;
