import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The PDF renderer runs as a plain Node package on the server.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The employee record PDF embeds Geist from node_modules at runtime.
  outputFileTracingIncludes: {
    "/api/exports/employee-record": ["./node_modules/geist/dist/fonts/geist-sans/Geist-*.ttf"],
  },
};

export default nextConfig;
