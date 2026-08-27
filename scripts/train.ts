/**
 * Headless self-play training harness CLI (M28-T2b, #203).
 *
 * Runs N configurable AI-vs-AI self-play games through the pure core
 * simulator with the M28-T2a dataset recording enabled
 * (`playAiGame(..., { recordDataset: true })`), then fits a compact,
 * dependency-light opponent policy from the recorded (state → chosen-action)
 * decisions labelled by game winner, and writes the serialized trained-AI
 * output to `public/trained-ai.json` where the deployed UI opponent (M28-T3)
 * can load it.
 *
 * This script is deliberately **thin and headless** — it contains no business
 * logic and no React/browser code. It only:
 *   1. reads options (games to train on, base seed, max-turns guard) from CLI
 *      flags / environment variables with sensible defaults;
 *   2. drives the pure `playAiGame` core function N times with recording on;
 *   3. fits the policy with the pure `fitPolicyFromGames` core function;
 *   4. writes the policy JSON to `public/trained-ai.json`;
 *   5. prints training metrics (games, decisive games, decisions, weights)
 *      so the result is auditable.
 *
 * All fitting and every game is computed entirely by `src/core`. The policy
 * output is deterministic for a given base seed, so a trained file is
 * reproducible.
 *
 * Usage:
 *   npm run train [-- --games N] [-- --seed S] [-- --max-turns T] [-- --out FILE]
 *
 * Options (flag takes precedence over the environment variable, which takes
 * precedence over the default):
 *   --games N / -n N      number of self-play games to train on
 *                         (env: TRAIN_GAMES, default 20)
 *   --seed S              base seed; each game uses S + index so training is
 *                         deterministic and reproducible (env: TRAIN_SEED,
 *                         default 0)
 *   --max-turns T         pass-through to playAiGame's iteration guard
 *                         (env: TRAIN_MAX_TURNS, default core default)
 *   --out FILE            where to write the trained-AI JSON
 *                         (env: TRAIN_OUT, default "public/trained-ai.json")
 *   --help / -h           print usage and exit
 *
 * No browser, no network, no GUI — run it from a terminal.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { playAiGame, DEFAULT_MAX_TURNS, type PlayAiGameResult } from "../src/core/selfPlay";
import { fitPolicyFromGames, type TrainedAiPolicy } from "../src/core/training";

/** Feature names, mirroring the FEATURE_* indices in `src/core/training.ts`. */
const FEATURE_NAMES = [
  "collect",
  "recruit_rank",
  "capture",
  "join",
  "attack_rankdiff",
  "attack_winning",
];

/** Options for a training run, resolved from CLI flags / env / defaults. */
interface TrainOptions {
  games: number;
  seed: number;
  maxTurns: number | undefined;
  out: string;
}

/** Parse a CLI/env string into an integer, or throw on a non-integer value. */
function toInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`Invalid integer for ${name}: "${value}"`);
  }
  return n;
}

/**
 * Read a value option from CLI args. Supports `--name value`, `--name=value`
 * and `-x value` (where `x` is the first letter of the long name). Returns
 * `{ read: true, value, nextIndex }` when consumed, else `{ read: false }`.
 */
function readFlag(
  args: string[],
  i: number,
  long: string,
  short: string,
): { read: boolean; value?: string; nextIndex?: number } {
  const raw = args[i];
  if (raw.startsWith(`--${long}=`)) {
    return { read: true, value: raw.slice(long.length + 3), nextIndex: i + 1 };
  }
  if (raw === `--${long}` || raw === `-${short}`) {
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--") || value.startsWith("-")) {
      throw new Error(`Missing value for ${long}`);
    }
    return { read: true, value, nextIndex: i + 2 };
  }
  return { read: false };
}

/** Resolve the run options from CLI args and the environment. */
function parseArgs(args: string[], env: NodeJS.ProcessEnv): TrainOptions {
  let games: number | undefined;
  let seed: number | undefined;
  let maxTurns: number | undefined;
  let out: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    if (raw === "--help" || raw === "-h") {
      printUsage();
      process.exit(0);
    }
    let hit = readFlag(args, i, "games", "n");
    if (hit.read) {
      games = toInt(hit.value, "--games");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    hit = readFlag(args, i, "seed", "s");
    if (hit.read) {
      seed = toInt(hit.value, "--seed");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    hit = readFlag(args, i, "max-turns", "m");
    if (hit.read) {
      maxTurns = toInt(hit.value, "--max-turns");
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    hit = readFlag(args, i, "out", "o");
    if (hit.read) {
      out = hit.value;
      i = (hit.nextIndex as number) - 1;
      continue;
    }
    throw new Error(`Unknown argument: "${raw}". Run with --help for usage.`);
  }

  const resolvedGames = games ?? toInt(env.TRAIN_GAMES, "TRAIN_GAMES") ?? 20;
  const resolvedSeed = seed ?? toInt(env.TRAIN_SEED, "TRAIN_SEED") ?? 0;
  const resolvedMaxTurns = maxTurns ?? toInt(env.TRAIN_MAX_TURNS, "TRAIN_MAX_TURNS");
  const resolvedOut = out ?? env.TRAIN_OUT ?? "public/trained-ai.json";
  if (resolvedGames < 1) throw new Error("--games must be at least 1");

  return { games: resolvedGames, seed: resolvedSeed, maxTurns: resolvedMaxTurns, out: resolvedOut };
}

/** Print concise usage text. */
function printUsage(): void {
  console.log(`Usage: npm run train [-- --games N] [-- --seed S] [-- --max-turns T] [-- --out FILE]

Run N headless AI-vs-AI self-play games with dataset recording, fit a compact
opponent policy, and write the serialized trained-AI file for the UI opponent.

Options:
  -n, --games N      number of self-play games to train on (TRAIN_GAMES, default 20)
  -s, --seed S       base seed; each game uses S + index (TRAIN_SEED, default 0)
  -m, --max-turns T  pass-through iteration guard (TRAIN_MAX_TURNS, default ${DEFAULT_MAX_TURNS})
  -o, --out FILE     output path for the trained-AI JSON (TRAIN_OUT, default public/trained-ai.json)
  -h, --help         show this help`);
}

/**
 * Format the fitted policy's weights with their feature names for the
 * console, so the training result is auditable (each weight, a number, is
 * fixed to 4 decimal places).
 */
function formatWeights(policy: TrainedAiPolicy): string {
  return policy.weights
    .map((w, i) => `${FEATURE_NAMES[i]}: ${w.toFixed(4)}`)
    .join(", ");
}

/** Run the training harness and write the trained-AI JSON. */
function main(): void {
  let options: TrainOptions;
  try {
    options = parseArgs(process.argv.slice(2), process.env);
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    console.error("run `npm run train -- --help` for usage");
    process.exit(2);
  }

  const { games, seed, maxTurns, out } = options;

  // Run N deterministic self-play games with the M28-T2a recorder enabled.
  console.log(
    `Training on ${games} self-play game(s) (base seed ${seed}, maxTurns ${maxTurns ?? "default"})...`,
  );
  const results: PlayAiGameResult[] = [];
  for (let i = 0; i < games; i++) {
    results.push(playAiGame({ seed: seed + i, maxTurns, recordDataset: true }));
  }

  // Fit the compact policy from the recorded datasets (pure core logic).
  const policy = fitPolicyFromGames(results);

  // Report training metrics so the result is auditable.
  const decisive = results.filter((r) => r.winner !== null).length;
  const capped = games - decisive;
  console.log("");
  console.log("Training report");
  console.log("---------------");
  console.log(`  games run        : ${games}`);
  console.log(`  games (decisive) : ${decisive} (used to label decisions)`);
  console.log(`  games (capped)   : ${capped} (no winner; decisions excluded)`);
  console.log(`  decisions used   : ${policy.decisionsSeen}`);
  console.log(`  source           : ${policy.source}`);
  console.log(`  version          : ${policy.version}`);
  console.log(`  weights          : ${formatWeights(policy)}`);

  // Write the serialized trained-AI file, creating parent dirs if needed.
  const json = JSON.stringify(policy, null, 2) + "\n";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json, "utf8");
  console.log("");
  console.log(`wrote trained-AI file to ${out} (${json.length} bytes)`);
}

main();
