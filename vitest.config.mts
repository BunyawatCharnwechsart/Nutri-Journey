import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      // Match the "@/*" -> "./*" alias from tsconfig.json.
      "@": resolve(process.cwd()),
      // The real "server-only" package throws when imported outside a Next.js
      // server context; swap it for a no-op so lib/*.ts can be unit tested.
      "server-only": resolve(
        process.cwd(),
        "scripts/test-stubs/server-only.mjs"
      ),
    },
  },
});