import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xenova/transformers'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./lib/mock.js",
      "sharp": "./lib/mock.js",
    }
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
      sharp: false,
    }
    return config
  },
}

export default nextConfig
