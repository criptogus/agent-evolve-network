// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Force-inline Supabase publishable env into the client bundle.
// The default Lovable env injection has been observed to miss these on some builds,
// which causes `Missing Supabase environment variable(s)` runtime crashes on routes
// that touch the supabase client (e.g. /login). Publishable/anon values are safe to ship.
const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "https://ynxuotbjfxkcrfvkrltr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHVvdGJqZnhrY3JmdmtybHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODI2NjYsImV4cCI6MjA5Mzk1ODY2Nn0.NmGjLNtxcYfnmhpd6T7VwH5sO2R0K8D-4sv7ATvZezc";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID || "ynxuotbjfxkcrfvkrltr",
      ),
    },
  },
});
