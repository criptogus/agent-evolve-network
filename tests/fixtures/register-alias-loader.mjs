// Preload side: register the alias loader so node tests can import src modules.
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(dir, "alias-loader.mjs")));
