import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "sharp"],
  outputFileTracingIncludes: {
    "/api/ocr": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/bmp-js/**/*",
      "./node_modules/zlibjs/**/*",
      "./node_modules/is-url/**/*",
      "./node_modules/regenerator-runtime/**/*",
      "./node_modules/node-fetch/**/*",
      "./node_modules/wasm-feature-detect/**/*",
    ],
  },
};

export default nextConfig;
