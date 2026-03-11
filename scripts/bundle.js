import { context } from "esbuild";

const entryPoints = ["popup/popup.js", "options/options.js"];
const watchMode = process.argv.includes("--watch");

const buildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  outbase: ".",
  outdir: ".",
  entryNames: "[dir]/[name].bundle",
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
