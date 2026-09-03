import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  serverExternalPackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "tesseract.js",
    "tesseract.js-core",
    "unpdf",
    "pdfjs-dist"
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-slot",
    ],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
