import type { NextConfig } from "next";
import "./src/env"; // validate env at build time — fail fast on missing vars

const nextConfig: NextConfig = {
  output: "standalone", // required by the VPS Docker deploy path
  transpilePackages: ["@kit/db", "@kit/ui"],
};

export default nextConfig;
