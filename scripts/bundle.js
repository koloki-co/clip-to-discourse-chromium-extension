import { build } from "esbuild";

const entryPoints = ["popup/popup.js", "options/options.js"];

await build({
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
});
