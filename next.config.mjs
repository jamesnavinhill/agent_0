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
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
      sharp: false,
    }

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        fs: "./lib/mock.js",
        path: "./lib/mock.js",
        url: "./lib/mock.js",
      }
    }

    return config
  },
}

export default nextConfig
