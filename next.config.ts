import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every Bloomly page is personalised and rendered per request, so we use the
  // classic dynamic rendering model rather than Cache Components.
  cacheComponents: false,
  // The embedded Postgres used in local test mode ships WASM and data files.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
