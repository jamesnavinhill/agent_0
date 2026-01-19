/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence warning and use defaults
  // @xenova/transformers works with dynamic imports
  turbopack: {},
}

export default nextConfig
