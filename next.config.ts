import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF.js resolves its worker relative to the installed package at runtime.
  // Keeping these Node-specific packages external prevents Turbopack from
  // relocating that worker into a server chunk where it cannot be found.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/projects/noi-extract": [
      "./node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    "/api/projects/itp-extract": [
      "./node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
