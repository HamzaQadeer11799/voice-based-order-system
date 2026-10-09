import type { NextConfig } from "next";

const serverUrl = process.env.SERVER_URL || "http://localhost:3002";

const nextConfig: NextConfig = {
  // Turns app/globals.css into the colors, spacing, and layout on the page.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${serverUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
