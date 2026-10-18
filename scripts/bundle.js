import { context } from "esbuild";

const entryPoints = ["popup/popup.js", "options/options.js", "background.js"];
const watchMode = process.argv.includes("--watch");

const buildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  // Splitting lets popup.js's dynamic import() of shared/extract.js (and its
  // Turndown/Readability dependencies, see R50) land in its own chunk file
  // instead of being inlined into every entry point that shares code with it.
  // esbuild also hoists code shared by 2+ entry points into further chunks;
  // chunkNames routes all of them into chunks/ (hashed, since more than one
  // chunk can have no single obvious source name) so scripts/package.js can
  // glob that one directory for whatever chunks a given build produces.
  splitting: true,
  outbase: ".",
  outdir: ".",
  entryNames: "[dir]/[name].bundle",
  chunkNames: "chunks/[name]-[hash]",
  sourcemap: false,
  logLevel: "info"
};

if (watchMode) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  const { build } = await import("esbuild");
  await build(buildOptions);
}
