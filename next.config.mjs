/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xenova/transformers'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // @xenova/transformers works with dynamic imports
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./lib/mock.js",
      "sharp": "./lib/mock.js",
      "fs": "./lib/mock.js",
      "path": "./lib/mock.js",
      "url": "./lib/mock.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
      sharp: false,
      fs: false,
      path: false,
      url: false,
    }
    return config
  },
}

export default nextConfig
