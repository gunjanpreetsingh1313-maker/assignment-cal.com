import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keeps file tracing anchored to frontend/ when a parent folder has another lockfile.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
