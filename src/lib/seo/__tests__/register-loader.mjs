import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = resolvePath(dirname(fileURLToPath(import.meta.url)), "../../../..");

function tryWithExtensions(basePath) {
  for (const ext of ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]) {
    const candidate = `${basePath}${ext}`;
    if (existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = resolvePath(rootDir, "src", specifier.slice(2));
      const found = tryWithExtensions(target);
      if (found) return { url: found, shortCircuit: true };
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const target = resolvePath(parentDir, specifier);
      const found = tryWithExtensions(target);
      if (found) return { url: found, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
