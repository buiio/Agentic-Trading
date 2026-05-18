import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/Agentic-Trading",
        assetPrefix: "/Agentic-Trading/",
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
