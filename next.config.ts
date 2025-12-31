import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "sharp"],
  outputFileTracingIncludes: {
    "/api/ocr": ["./node_modules/tesseract.js/**/*"],
  },
};

export default nextConfig;
