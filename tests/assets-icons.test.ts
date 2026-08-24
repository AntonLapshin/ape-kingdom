import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { gameIcons, type GameIconName } from "../src/assets/icons";

/**
 * Asset tests guarding issue #106 (M16-T1): the 8 pixel-art game icons must
 * be extracted from the #103 source sheet, cropped to their boundaries, and
 * committed as transparent-background (RGBA) PNGs under `src/assets/icons/`,
 * ready to be consumed by the UI wiring follow-up (M16-T2).
 *
 * These are structural tests (the icons are committed binary assets, not
 * business logic); `src/core` is untouched and stays 100% covered.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = resolve(ROOT, "src/assets/icons");

/** The 8 expected icons, keyed by their in-game meaning (see README.md). */
const EXPECTED: Record<GameIconName, string> = {
  homeTree: "home-tree.png",
  monkeyNest: "monkey-nest.png",
  monkey: "monkey.png",
  gibbon: "gibbon.png",
  chimpanzee: "chimpanzee.png",
  gorilla: "gorilla.png",
  mountain: "mountain.png",
  grave: "grave.png",
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Read the PNG's IHDR color type byte (offset 25 in the PNG chunk stream). */
function pngColorType(buffer: Buffer): number {
  return buffer[25];
}

describe("extracted pixel-art game icons (issue #106, M16-T1)", () => {
  it("exports all 8 icons with meaningful keys", () => {
    expect(Object.keys(gameIcons).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("provides a non-empty URL for each icon", () => {
    for (const [key, name] of Object.entries(EXPECTED)) {
      const url = gameIcons[key as GameIconName];
      expect(url).toEqual(expect.any(String));
      expect(url.length).toBeGreaterThan(0);
      expect(name.endsWith(".png")).toBe(true);
    }
  });

  it("commits each icon as a real PNG file under src/assets/icons", () => {
    for (const name of Object.values(EXPECTED)) {
      const buffer = readFileSync(resolve(ICONS_DIR, name));
      expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);
      // PNG signature confirms the file is not empty / not a placeholder.
      expect(buffer.length).toBeGreaterThan(1000);
    }
  });

  it("stores each icon with an RGBA (truecolor + alpha) color type", () => {
    for (const name of Object.values(EXPECTED)) {
      const buffer = readFileSync(resolve(ICONS_DIR, name));
      // Color type 6 = truecolor with alpha (transparent background).
      expect(pngColorType(buffer), `${name} should be RGBA (color type 6)`).toBe(6);
    }
  });

  it("keeps every icon square within reasonable aspect (no degenerate crops)", () => {
    for (const name of Object.values(EXPECTED)) {
      const width = readFileSync(resolve(ICONS_DIR, name)).readUInt32BE(16);
      const height = readFileSync(resolve(ICONS_DIR, name)).readUInt32BE(20);
      expect(width).toBeGreaterThan(50);
      expect(height).toBeGreaterThan(50);
      expect(Math.abs(width - height) / Math.max(width, height)).toBeLessThan(0.6);
    }
  });
});
