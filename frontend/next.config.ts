import path from "node:path";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The ABI lives in ../shared so the backend and frontend use the same file.
  turbopack: { root: path.join(here, "..") },
  outputFileTracingRoot: path.join(here, ".."),
};

export default nextConfig;
