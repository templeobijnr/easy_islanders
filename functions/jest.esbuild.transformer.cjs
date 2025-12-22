/**
 * Jest Transformer: esbuild (TypeScript)
 *
 * Purpose:
 * - Compile TypeScript test sources for Jest without relying on ts-jest preset resolution.
 *
 * Why:
 * - In this repo environment, `preset: "ts-jest"` fails to resolve.
 * - esbuild is already a devDependency, fast, and stable for TS transpilation.
 *
 * Invariants:
 * - No module-scope side effects beyond loading esbuild.
 * - Produces CommonJS output (Jest runtime).
 *
 * How to test:
 * - From `functions/`: `npm test`
 */

const esbuild = require("esbuild");
const path = require("path");

function loaderFor(filename) {
  const ext = path.extname(filename);
  if (ext === ".ts") return "ts";
  if (ext === ".tsx") return "tsx";
  if (ext === ".js") return "js";
  if (ext === ".jsx") return "jsx";
  return "js";
}

module.exports = {
  process(src, filename) {
    const result = esbuild.transformSync(src, {
      loader: loaderFor(filename),
      format: "cjs",
      target: "es2020",
      sourcemap: "inline",
      sourcefile: filename,
    });

    return { code: result.code };
  },
};


