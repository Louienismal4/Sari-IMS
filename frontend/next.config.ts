import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load centralized root .env when running Next.js locally outside Docker
const rootEnvPath = path.resolve(__dirname, "../.env");
const nodeProcess = process as typeof process & { loadEnvFile?: (path: string) => void };
if (fs.existsSync(rootEnvPath) && typeof nodeProcess.loadEnvFile === "function") {
  try {
    nodeProcess.loadEnvFile(rootEnvPath);
  } catch {
    // Silently ignore if already loaded or duplicate
  }
}

const nextConfig: NextConfig = {
  // Standalone output is only required for Docker container builds, not on Vercel
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  // Allow tunnel hostnames for Next.js Turbopack HMR and external testing
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.ngrok-free.app",
    "192.168.*.*",
    "localhost:3001",
    "127.0.0.1:3001",
  ],
  async rewrites() {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
