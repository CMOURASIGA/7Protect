import type { NextConfig } from "next";

if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
  throw new Error("NEXT_PUBLIC_DEMO_MODE não pode ser habilitado no ambiente de produção.");
}

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: false },
};
export default nextConfig;
