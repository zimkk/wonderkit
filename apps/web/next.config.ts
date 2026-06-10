import type { NextConfig } from "next";
import "./src/env"; // validate env at build time — fail fast on missing vars

const nextConfig: NextConfig = {
  output: "standalone", // required by the VPS Docker deploy path
  transpilePackages: ["@kit/ui"],
  // @kit/db and Prisma use Node built-ins — keep them as server-side externals,
  // not bundled by webpack. @kit/ui has no Node deps so it can still be transpiled.
  serverExternalPackages: ["@prisma/client", "@kit/db", "@auth/prisma-adapter"],
};

export default nextConfig;
