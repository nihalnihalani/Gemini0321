/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "esbuild",
    "bullmq",
    "ioredis",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
